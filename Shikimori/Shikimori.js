(function () {
  'use strict';

  // Утилиты для работы с объектами
  function getObjectKeys(obj, enumerableOnly) {
    let keys = Object.keys(obj);
    if (Object.getOwnPropertySymbols) {
      let symbols = Object.getOwnPropertySymbols(obj);
      if (enumerableOnly) symbols = symbols.filter(sym => Object.getOwnPropertyDescriptor(obj, sym).enumerable);
      keys.push(...symbols);
    }
    return keys;
  }

  function mergeObjects(target, ...sources) {
    for (let source of sources) {
      if (!source) continue;
      if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
      } else {
        getObjectKeys(source).forEach(key => {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
      }
    }
    return target;
  }

  function defineProperty(obj, key, value) {
    key = String(key);
    if (key in obj) {
      Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
    } else {
      obj[key] = value;
    }
    return obj;
  }

  // API для работы с Shikimori
  function fetchShikimoriAnime(params, onSuccess, onError) {
    $(document).ready(() => {
      const limit = params.isTop100 ? 50 : (params.limit || 36);
      let query = `
        query Animes {
          animes(limit: ${limit}, order: ${params.sort || 'aired_on'}, page: ${params.page}
      `;
      if (params.kind) query += `, kind: "${params.kind}"`;
      if (params.status) query += `, status: "${params.status}"`;
      if (params.genre) query += `, genre: "${params.genre}"`;
      if (params.seasons) query += `, season: "${params.seasons}"`;
      query += `) { id name russian english japanese kind score status season airedOn { year } poster { originalUrl } }}`;

      if (params.isTop100) {
        const requests = [1, 2].map(page =>
          $.ajax({
            url: 'https://shikimori.one/api/graphql',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ query: query.replace(`page: ${params.page}`, `page: ${page}`) })
          })
        );
        Promise.all(requests)
          .then(responses => onSuccess(responses[0].data.animes.concat(responses[1].data.animes)))
          .catch(onError);
      } else {
        $.ajax({
          url: 'https://shikimori.one/api/graphql',
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ query }),
          success: response => onSuccess(response.data.animes),
          error: onError
        });
      }
    });
  }

  // Поиск аниме через TMDB
  function searchAnime(animeData) {
    function cleanName(name) { return name.replace(/\s{2,}/g, ' ').trim(); }

    if (!animeData?.id) {
      Lampa.Noty.show('Ошибка: нет данных для поиска');
      return;
    }

    const typeMap = { movie: 'movie', tv: 'tv', tv_special: 'tv', ova: 'movie', ona: 'movie', special: 'movie', music: 'movie', pv: 'movie', cm: 'movie' };
    const mapKindToTmdbType = kind => typeMap[kind] || 'tv';

    $.get(`https://arm.haglund.dev/api/v2/ids?source=myanimelist&id=${animeData.id}`)
      .done(response => {
        if (response?.themoviedb) {
          const tmdbType = mapKindToTmdbType(animeData.kind);
          fetchTmdbById(response.themoviedb, tmdbType, result => {
            result ? processSearchResults(result, animeData.kind) : extendedSearch(animeData, 0);
          });
        } else {
          extendedSearch(animeData, 0);
        }
      })
      .fail(() => extendedSearch(animeData, 0));

    function extendedSearch(animeData, nameIndex) {
      const names = [animeData.name, animeData.japanese, animeData.english, animeData.russian].filter(n => n && typeof n === 'string');
      if (nameIndex >= names.length) {
        processSearchResults({ total_results: 0 }, animeData.kind);
        return;
      }
      searchTmdbByName({ ...animeData, name: cleanName(names[nameIndex]) }, response => {
        response?.total_results ? processSearchResults(response, animeData.kind) : extendedSearch(animeData, nameIndex + 1);
      });
    }

    function searchTmdbByName(animeData, callback) {
      const apiKey = '4ef0d7355d9ffb5151e987764708ce96';
      const baseUrl = Lampa.Storage.field('proxy_tmdb') 
        ? `${Lampa.Utils.protocol()}apitmdb.${Lampa.Manifest?.cub_domain || 'cub.red'}/3/`
        : 'https://api.themoviedb.org/3/';
      const query = encodeURIComponent(cleanName(animeData.name));
      const year = animeData.airedOn?.year ? `&first_air_date_year=${animeData.airedOn.year}` : '';
      const url = `${baseUrl}search/multi?api_key=${apiKey}&language=${Lampa.Storage.field('language')}&include_adult=true&query=${query}${year}`;
      $.get(url).done(data => callback(data || { total_results: 0 })).fail(() => callback({ total_results: 0 }));
    }

    function fetchTmdbById(id, type, callback) {
      const apiKey = '4ef0d7355d9ffb5151e987764708ce96';
      const baseUrl = Lampa.Storage.field('proxy_tmdb') 
        ? `${Lampa.Utils.protocol()}apitmdb.${Lampa.Manifest?.cub_domain || 'cub.red'}/3/`
        : 'https://api.themoviedb.org/3/';
      const url = `${baseUrl}${type}/${id}?api_key=${apiKey}&language=${Lampa.Storage.field('language')}`;
      $.get(url).done(data => callback(data || null)).fail(() => callback(null));
    }

    function processSearchResults(response, kind) {
      if (!response) {
        Lampa.Noty.show('Не удалось найти аниме');
        return;
      }

      if ('total_results' in response) {
        if (!response.total_results) {
          Lampa.Noty.show('Аниме не найдено в TMDB');
        } else if (response.total_results === 1 && kind !== 'ona') {
          const result = response.results[0];
          if (result.id && result.media_type) {
            Lampa.Activity.push({ url: '', component: 'full', id: result.id, method: result.media_type, card: result });
          }
        } else {
          const menu = response.results.filter(item => item.id && item.media_type)
            .map(item => ({ title: `${item.name || item.title}`, card: item }));
          if (!menu.length) return;
          Lampa.Select.show({
            title: kind === 'ona' ? 'Выберите ONA' : 'Выберите аниме',
            items: menu,
            onBack: () => Lampa.Controller.toggle('content'),
            onSelect: item => Lampa.Activity.push({ url: '', component: 'full', id: item.card.id, method: item.card.media_type, card: item.card })
          });
        }
      } else if (kind !== 'ona' && response?.id) {
        Lampa.Activity.push({ url: '', component: 'full', id: response.id, method: response.number_of_episodes ? 'tv' : 'movie', card: response });
      } else {
        searchTmdbByName(animeData, processSearchResults);
      }
    }
  }

  const API = { fetchShikimoriAnime, searchAnime };

  // Компонент карточки аниме
  class AnimeCard {
    constructor(data, userLang) {
      this.translations = {
        type: { tv: 'TV', movie: 'Movie', ova: 'OVA', ona: 'ONA', special: 'Special', tv_special: 'TV Special', music: 'Music', pv: 'PV', cm: 'CM' },
        status: { anons: 'Announced', ongoing: 'Ongoing', released: 'Released' },
        seasons: { winter: 'Winter', spring: 'Spring', summer: 'Summer', fall: 'Fall' }
      };

      const season = data.season?.replace(/_/g, ' ')
        .replace(/^\w/, c => c.toUpperCase())
        .replace(/(winter|spring|summer|fall)/gi, match => this.translations.seasons[match.toLowerCase()]);

      this.element = Lampa.Template.get('ShikimoriCard', {
        img: data.poster.originalUrl,
        type: this.translations.type[data.kind] || data.kind.toUpperCase(),
        status: this.translations.status[data.status] || data.status.charAt(0).toUpperCase() + data.status.slice(1),
        rating: data.score,
        title: userLang === 'ru' ? (data.russian || data.name || data.japanese) : (data.name || data.japanese),
        year: data.season ? season : data.airedOn.year
      });
    }

    render() { return this.element; }
    destroy() { this.element.remove(); }
  }

  // Компонент каталога
  class CatalogComponent {
    constructor(object) {
      this.object = object;
      this.userLang = Lampa.Storage.field('language');
      this.scroll = new Lampa.Scroll({ mask: true, over: true, step: 200 });
      this.items = [];
      this.container = $('<div class="shikimori-container"></div>');
      this.header = $(`
        <div class="shikimori-header">
          <button class="shikimori-btn home">Home</button>
          <button class="shikimori-btn top-tv">Top TV</button>
          <button class="shikimori-btn top-movies">Top Movies</button>
          <button class="shikimori-btn top-ona">Top ONA</button>
          <button class="shikimori-btn filter">Filter</button>
        </div>
      `);
      this.body = $('<div class="shikimori-grid"></div>');
    }

    create() {
      API.fetchShikimoriAnime(this.object, this.renderContent.bind(this), this.showEmpty.bind(this));
    }

    renderContent(result) {
      this.scroll.minus();
      this.scroll.onWheel = step => {
        if (!Lampa.Controller.own(this)) this.start();
        Navigator.move(step > 0 ? 'down' : 'up');
      };
      if (!this.object.isTop100) {
        this.scroll.onEnd = () => {
          this.object.page++;
          API.fetchShikimoriAnime(this.object, this.renderContent.bind(this), this.showEmpty.bind(this));
        };
      }

      this.setupHeader();
      this.renderCards(result);
      this.scroll.append(this.header);
      this.scroll.append(this.body);
      this.container.append(this.scroll.render(true));
      this.activity.loader(false);
      this.activity.toggle();
    }

    setupHeader() {
      const filters = this.createFilters();
      this.header.find('.home').on('hover:enter', () => 
        Lampa.Activity.push({ url: '', title: 'Shikimori', component: 'Shikimori', page: 1 }));
      this.header.find('.top-tv').on('hover:enter', () => 
        Lampa.Activity.push({ url: '', title: 'Top TV', component: 'Shikimori', page: 1, sort: 'ranked', kind: 'tv', status: 'released', isTop100: true }));
      this.header.find('.top-movies').on('hover:enter', () => 
        Lampa.Activity.push({ url: '', title: 'Top Movies', component: 'Shikimori', page: 1, sort: 'ranked', kind: 'movie', status: 'released', isTop100: true }));
      this.header.find('.top-ona').on('hover:enter', () => 
        Lampa.Activity.push({ url: '', title: 'Top ONA', component: 'Shikimori', page: 1, sort: 'ranked', kind: 'ona', status: 'released', isTop100: true }));
      this.header.find('.filter').on('hover:enter', () => this.showFilterMenu(filters));
    }

    createFilters() {
      const filters = {};
      $.ajax({
        url: 'https://shikimori.one/api/genres',
        method: 'GET',
        async: false,
        success: response => {
          filters.genre = {
            title: 'Genre',
            items: response.filter(item => item.entry_type === 'Anime')
              .map(item => ({ ...item, title: item.name, name: undefined }))
          };
        }
      });

      filters.type = {
        title: 'Type',
        items: [
          { title: 'TV', code: 'tv' }, { title: 'Movie', code: 'movie' },
          { title: 'OVA', code: 'ova' }, { title: 'ONA', code: 'ona' }
        ]
      };
      filters.status = {
        title: 'Status',
        items: [
          { title: 'Announced', code: 'anons' }, { title: 'Ongoing', code: 'ongoing' }, { title: 'Released', code: 'released' }
        ]
      };
      filters.sort = {
        title: 'Sort',
        items: [
          { title: 'Rating', code: 'ranked' }, { title: 'Popularity', code: 'popularity' }, { title: 'Date', code: 'aired_on' }
        ]
      };
      return filters;
    }

    showFilterMenu(filters) {
      const getQuery = () => {
        const query = {};
        Object.values(filters).forEach(filter => {
          filter.items.forEach(item => { if (item.selected) query[filter.title.toLowerCase()] = item.code || item.id; });
        });
        return query;
      };

      const updateSubtitle = filter => {
        const selected = filter.items.filter(item => item.selected).map(item => item.title);
        filter.subtitle = selected.length ? selected.join(', ') : 'None';
      };

      const selectItem = (items, selectedItem) => {
        items.forEach(item => item.selected = false);
        selectedItem.selected = true;
      };

      Object.values(filters).forEach(updateSubtitle);
      Lampa.Select.show({
        title: 'Filters',
        items: [{ title: 'Apply', apply: true }, ...Object.values(filters)],
        onBack: () => Lampa.Controller.toggle('content'),
        onSelect: item => {
          if (item.apply) {
            Lampa.Activity.push({ url: '', title: 'Shikimori', component: 'Shikimori', page: 1, ...getQuery() });
          } else {
            Lampa.Select.show({
              title: item.title,
              items: item.items,
              onBack: () => this.showFilterMenu(filters),
              onSelect: selected => {
                selectItem(item.items, selected);
                this.showFilterMenu(filters);
              }
            });
          }
        }
      });
    }

    showEmpty() {
      const empty = new Lampa.Empty();
      this.container.append(empty.render(true));
      this.start = empty.start;
      this.activity.loader(false);
      this.activity.toggle();
    }

    renderCards(data) {
      data.forEach(anime => {
        const card = new AnimeCard(anime, this.userLang);
        card.render(true)
          .on('hover:focus', e => {
            this.lastFocused = card.render()[0];
            this.activeIndex = this.items.indexOf(card);
            this.scroll.update(card.render(true), true);
          })
          .on('hover:enter', () => API.searchAnime(anime));
        this.body.append(card.render(true));
        this.items.push(card);
      });
    }

    start() {
      if (Lampa.Activity.active().activity !== this.activity) return;
      Lampa.Controller.add('content', {
        toggle: () => {
          Lampa.Controller.collectionSet(this.scroll.render());
          Lampa.Controller.collectionFocus(this.lastFocused || false, this.scroll.render());
        },
        left: () => Navigator.canmove('left') ? Navigator.move('left') : Lampa.Controller.toggle('menu'),
        right: () => Navigator.move('right'),
        up: () => Navigator.canmove('up') ? Navigator.move('up') : Lampa.Controller.toggle('head'),
        down: () => Navigator.canmove('down') && Navigator.move('down'),
        back: this.back
      });
      Lampa.Controller.toggle('content');
    }

    render(js) { return js ? this.container : $(this.container); }
    destroy() {
      Lampa.Arrays.destroy(this.items);
      this.scroll.destroy();
      this.container.remove();
      this.items = null;
    }
  }

  // Компонент подробной информации
  class DetailComponent {
    constructor() {
      Lampa.Listener.follow('full', async e => {
        if (e.type !== 'complite') return;
        try {
          const malData = await $.ajax({ url: `https://arm.haglund.dev/api/v2/themoviedb?id=${e.object.id}`, method: 'GET' });
          if (!malData.length) return;
          const animeData = await $.ajax({ url: `https://shikimori.one/api/animes/${malData[0].myanimelist}`, method: 'GET' });
          
          const render = e.object.activity.render();
          render.find('.full-descr__right').append(`
            <div class="shikimori-info"><span>Dubbers:</span>${animeData.fandubbers.join(', ')}</div>
            <div class="shikimori-info"><span>Subbers:</span>${animeData.fansubbers.join(', ')}</div>
          `);
          render.find('.full-start-new__rate-line').prepend(`
            <div class="shikimori-rating">${animeData.score}<span>Shikimori</span></div>
          `);
        } catch (error) {}
      });
    }
  }

  // Добавление кнопки в меню
  function addMenuButton() {
    const button = $(`
      <li class="menu__item selector shikimori-menu">
        <svg class="menu__ico" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        </svg>
        <span class="menu__text">Shikimori</span>
      </li>
    `);
    button.on('hover:enter', () => Lampa.Activity.push({ url: '', title: 'Shikimori', component: 'Shikimori', page: 1 }));
    $('.menu .menu__list').eq(0).append(button);
  }

  // Инициализация плагина
  function initializePlugin() {
    if (!window.Lampa?.Storage) {
      return setTimeout(initializePlugin, 100);
    }

    window.plugin_shikimori_ready = true;
    Lampa.Manifest.plugins = { type: 'other', version: '1.0', name: 'Shikimori', description: 'Anime Catalog', component: 'Shikimori' };

    Lampa.Template.add('ShikimoriStyle', `
      <style>
        .shikimori-container { padding: 20px; background: #1a1a1a; }
        .shikimori-header { 
          display: flex; 
          gap: 10px; 
          margin-bottom: 20px; 
          padding: 10px;
          background: rgba(255,255,255,0.05);
          border-radius: 8px;
        }
        .shikimori-btn {
          padding: 8px 16px;
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: 6px;
          color: #fff;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .shikimori-btn:hover {
          background: rgba(255,255,255,0.2);
          transform: translateY(-2px);
        }
        .shikimori-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 15px;
          padding: 10px;
        }
        .shikimori-card {
          position: relative;
          overflow: hidden;
          border-radius: 8px;
          transition: transform 0.3s ease;
        }
        .shikimori-card:hover {
          transform: scale(1.05);
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        .shikimori-card__img {
          width: 100%;
          height: 240px;
          object-fit: cover;
        }
        .shikimori-card__info {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 10px;
          background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
          color: #fff;
        }
        .shikimori-card__title {
          font-size: 14px;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .shikimori-card__meta {
          font-size: 12px;
          opacity: 0.8;
        }
        .shikimori-card__rating {
          position: absolute;
          top: 10px;
          right: 10px;
          padding: 4px 8px;
          background: rgba(255,215,0,0.9);
          border-radius: 4px;
          font-size: 12px;
          color: #000;
        }
        .shikimori-info {
          margin: 5px 0;
          color: #ddd;
        }
        .shikimori-info span {
          color: #fff;
          margin-right: 5px;
        }
        .shikimori-rating {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          background: rgba(255,215,0,0.9);
          border-radius: 4px;
          color: #000;
          font-size: 14px;
        }
        .shikimori-rating span {
          font-size: 12px;
          opacity: 0.8;
        }
        .shikimori-menu svg {
          width: 24px;
          height: 24px;
          fill: #fff;
        }
      </style>
    `);

    Lampa.Template.add('ShikimoriCard', `
      <div class="shikimori-card selector layer--visible layer--render">
        <img src="{img}" class="shikimori-card__img" />
        <div class="shikimori-card__rating">{rating}</div>
        <div class="shikimori-card__info">
          <h3 class="shikimori-card__title">{title}</h3>
          <div class="shikimori-card__meta">{type} • {year}</div>
          <div class="shikimori-card__meta">{status}</div>
        </div>
      </div>
    `);

    Lampa.Component.add('Shikimori', CatalogComponent);
    new DetailComponent();
    $('body').append(Lampa.Template.get('ShikimoriStyle', {}, true));

    if (window.appready) addMenuButton();
    else Lampa.Listener.follow('app', e => e.type === 'ready' && addMenuButton());
  }

  if (!window.plugin_shikimori_ready) initializePlugin();
})();