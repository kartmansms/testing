(function () {
  'use strict';

  // Получение всех ключей объекта, включая символьные
  function getObjectKeys(obj, enumerableOnly) {
    let keys = Object.keys(obj);
    if (Object.getOwnPropertySymbols) {
      let symbols = Object.getOwnPropertySymbols(obj);
      if (enumerableOnly) {
        symbols = symbols.filter(sym => Object.getOwnPropertyDescriptor(obj, sym).enumerable);
      }
      keys.push(...symbols);
    }
    return keys;
  }

  // Объединение объектов с поддержкой символьных ключей
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

  // Преобразование значения в примитив
  function toPrimitive(value, hint = 'default') {
    if (typeof value !== 'object' || !value) return value;
    const toPrim = value[Symbol.toPrimitive];
    if (toPrim) {
      const result = toPrim.call(value, hint);
      if (typeof result !== 'object') return result;
      throw new TypeError('@@toPrimitive должен возвращать примитив');
    }
    return hint === 'string' ? String(value) : Number(value);
  }

  // Преобразование ключа в строку или символ
  function toPropertyKey(key) {
    const primitive = toPrimitive(key, 'string');
    return typeof primitive === 'symbol' ? primitive : String(primitive);
  }

  // Определение свойства объекта
  function defineProperty(obj, key, value) {
    key = toPropertyKey(key);
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }
    return obj;
  }

  // Выполнение GraphQL-запроса к Shikimori API
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

      query += `) {
        id name russian licenseNameRu english japanese kind score status season
        airedOn { year } poster { originalUrl }
      }}`;

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
          .catch(error => {
            console.error('Ошибка:', error);
            onError(error);
          });
      } else {
        $.ajax({
          url: 'https://shikimori.one/api/graphql',
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ query }),
          success: response => onSuccess(response.data.animes),
          error: err => {
            console.error('Ошибка:', err);
            onError(err);
          }
        });
      }
    });
  }

  // Поиск информации об аниме через внешние API
  function searchAnime(animeData) {
    // Очистка названия от лишних пробелов
    function cleanName(name) {
      return name.replace(/\s{2,}/g, ' ').trim();
    }

    if (!animeData?.id) {
      console.error('Некорректные данные:', animeData);
      Lampa.Noty.show('Ошибка: нет данных для поиска');
      return;
    }

    // Маппинг типов Shikimori на TMDB
    function mapKindToTmdbType(kind) {
      const typeMap = {
        movie: 'movie',
        tv: 'tv',
        tv_special: 'tv',
        ova: 'movie',
        ona: 'movie',
        special: 'movie',
        music: 'movie',
        pv: 'movie',
        cm: 'movie'
      };
      return typeMap[kind] || 'tv';
    }

    // Попытка поиска через arm.haglund.dev
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

    // Расширенный поиск по всем названиям
    function extendedSearch(animeData, nameIndex) {
      const names = [animeData.name, animeData.japanese, animeData.english, animeData.russian]
        .filter(n => n && typeof n === 'string');
      
      if (nameIndex >= names.length) {
        processSearchResults({ total_results: 0 }, animeData.kind);
        return;
      }

      const currentName = cleanName(names[nameIndex]);
      searchTmdbByName({ ...animeData, name: currentName }, response => {
        response?.total_results ? handleTmdbResponse(response, animeData) : extendedSearch(animeData, nameIndex + 1);
      });
    }

    // Поиск через TMDB API
    function searchTmdbByName(animeData, callback) {
      const apiKey = '4ef0d7355d9ffb5151e987764708ce96';
      const baseUrl = Lampa.Storage.field('proxy_tmdb') 
        ? `${Lampa.Utils.protocol()}apitmdb.${Lampa.Manifest?.cub_domain || 'cub.red'}/3/`
        : 'https://api.themoviedb.org/3/';
      const query = encodeURIComponent(cleanName(animeData.name));
      const year = animeData.airedOn?.year ? `&first_air_date_year=${animeData.airedOn.year}` : '';
      const url = `${baseUrl}search/multi?api_key=${apiKey}&language=${Lampa.Storage.field('language')}&include_adult=true&query=${query}${year}`;

      $.get(url)
        .done(data => callback(data || { total_results: 0 }))
        .fail(err => {
          console.error('Ошибка TMDB поиска:', err.status, err.statusText);
          callback({ total_results: 0 });
        });
    }

    // Получение данных по TMDB ID
    function fetchTmdbById(id, type, callback) {
      const apiKey = '4ef0d7355d9ffb5151e987764708ce96';
      const baseUrl = Lampa.Storage.field('proxy_tmdb') 
        ? `${Lampa.Utils.protocol()}apitmdb.${Lampa.Manifest?.cub_domain || 'cub.red'}/3/`
        : 'https://api.themoviedb.org/3/';
      const url = `${baseUrl}${type}/${id}?api_key=${apiKey}&language=${Lampa.Storage.field('language')}`;

      $.get(url)
        .done(data => callback(data || null))
        .fail(err => {
          console.error('Ошибка TMDB get:', err.status, err.statusText);
          callback(null);
        });
    }

    // Обработка ответа TMDB
    function handleTmdbResponse(tmdbResponse, animeData) {
      tmdbResponse?.total_results ? processSearchResults(tmdbResponse, animeData.kind) : extendedSearch(animeData, 0);
    }

    // Обработка результатов поиска
    function processSearchResults(response, kind) {
      if (!response) {
        Lampa.Noty.show('Не удалось найти аниме: пустой ответ');
        return;
      }

      if ('total_results' in response) {
        if (!response.total_results) {
          Lampa.Noty.show('Не удалось найти аниме в TMDB');
        } else if (response.total_results === 1 && kind !== 'ona') {
          const result = response.results[0];
          if (!result.id || !result.media_type) return;
          Lampa.Activity.push({
            url: '', component: 'full', id: result.id, method: result.media_type, card: result
          });
        } else {
          const menu = response.results.filter(item => item.id && item.media_type)
            .map(item => ({
              title: `[${item.media_type.toUpperCase()}] ${item.name || item.title}`,
              card: item
            }));
          
          if (!menu.length) {
            Lampa.Noty.show('Не удалось найти аниме: нет валидных данных');
            return;
          }

          Lampa.Select.show({
            title: kind === 'ona' ? 'Выберите ONA из списка' : 'Выберите аниме',
            items: menu,
            onBack: () => Lampa.Controller.toggle('content'),
            onSelect: item => Lampa.Activity.push({
              url: '', component: 'full', id: item.card.id, method: item.card.media_type, card: item.card
            })
          });
        }
      } else if (kind !== 'ona' && response?.id) {
        Lampa.Activity.push({
          url: '', component: 'full', id: response.id, 
          method: response.number_of_episodes ? 'tv' : 'movie', card: response
        });
      } else {
        searchTmdbByName(animeData, response => handleTmdbResponse(response, animeData));
      }
    }
  }

  const API = { fetchShikimoriAnime, searchAnime };

  // Класс для создания карточки аниме
  class AnimeCard {
    constructor(data, userLang) {
      this.typeTranslations = {
        tv: 'ТВ', movie: 'Фильм', ova: 'OVA', ona: 'ONA', special: 'Спешл',
        tv_special: 'ТВ Спешл', music: 'Музыка', pv: 'PV', cm: 'CM'
      };
      this.statusTranslations = {
        anons: 'Анонс', ongoing: 'Онгоинг', released: 'Вышло'
      };

      const season = data.season?.replace(/_/g, ' ')
        .replace(/^\w/, c => c.toUpperCase())
        .replace(/(winter|spring|summer|fall)/gi, match => ({
          winter: 'Зима', spring: 'Весна', summer: 'Лето', fall: 'Осень'
        }[match.toLowerCase()]));

      this.element = Lampa.Template.get('Shikimori-Card', {
        img: data.poster.originalUrl,
        type: this.typeTranslations[data.kind] || data.kind.toUpperCase(),
        status: this.statusTranslations[data.status] || data.status.charAt(0).toUpperCase() + data.status.slice(1),
        rate: data.score,
        title: userLang === 'ru' ? (data.russian || data.name || data.japanese) : (data.name || data.japanese),
        season: data.season ? season : data.airedOn.year
      });
    }

    render() { return this.element; }
    destroy() { this.element.remove(); }
  }

  // Основной компонент каталога
  class CatalogComponent {
    constructor(object) {
      this.object = object;
      this.userLang = Lampa.Storage.field('language');
      this.scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
      this.items = [];
      this.html = $('<div class="Shikimori-module"></div>');
      this.header = $('<div class="Shikimori-head torrent-filter"><div class="Shikimori__home simple-button simple-button--filter selector">Главная</div><div class="Shikimori__top100_tv simple-button simple-button--filter selector">Топ100_ТВ</div><div class="Shikimori__top100_movies simple-button simple-button--filter selector">Топ100_Фильмы</div><div class="Shikimori__top100_ona simple-button simple-button--filter selector">Топ100_ONA</div><div class="Shikimori__search simple-button simple-button--filter selector">Фильтр</div></div>');
      this.body = $('<div class="Shikimori-catalog--list category-full"></div>');
    }

    create() {
      API.fetchShikimoriAnime(this.object, this.build.bind(this), this.showEmpty.bind(this));
    }

    build(result) {
      this.scroll.minus();
      this.scroll.onWheel = step => {
        if (!Lampa.Controller.own(this)) this.start();
        Navigator.move(step > 0 ? 'down' : 'up');
      };
      if (!this.object.isTop100) {
        this.scroll.onEnd = () => {
          this.object.page++;
          API.fetchShikimoriAnime(this.object, this.build.bind(this), this.showEmpty.bind(this));
        };
      }

      this.setupHeaderActions();
      this.renderCards(result);
      this.scroll.append(this.header);
      this.scroll.append(this.body);
      this.html.append(this.scroll.render(true));
      this.activity.loader(false);
      this.activity.toggle();
    }

    // Настройка действий в заголовке
    setupHeaderActions() {
      const filters = this.createFilters();
      const searchBtn = this.header.find('.Shikimori__search');
      const homeBtn = this.header.find('.Shikimori__home');
      const top100TvBtn = this.header.find('.Shikimori__top100_tv');
      const top100MoviesBtn = this.header.find('.Shikimori__top100_movies');
      const top100OnaBtn = this.header.find('.Shikimori__top100_ona');

      searchBtn.on('hover:enter', () => this.showFilterMenu(filters));
      homeBtn.on('hover:enter', () => Lampa.Activity.push({ url: '', title: 'Shikimori', component: 'Shikimori', page: 1 }));
      top100TvBtn.on('hover:enter', () => Lampa.Activity.push({ url: '', title: 'Shikimori Топ100_ТВ', component: 'Shikimori', page: 1, sort: 'ranked', kind: 'tv', status: 'released', isTop100: true }));
      top100MoviesBtn.on('hover:enter', () => Lampa.Activity.push({ url: '', title: 'Shikimori Топ100_Фильмы', component: 'Shikimori', page: 1, sort: 'ranked', kind: 'movie', status: 'released', isTop100: true }));
      top100OnaBtn.on('hover:enter', () => Lampa.Activity.push({ url: '', title: 'Shikimori Топ100_ONA', component: 'Shikimori', page: 1, sort: 'ranked', kind: 'ona', status: 'released', isTop100: true }));
    }

    // Создание структуры фильтров
    createFilters() {
      const filters = {};
      $.ajax({
        url: 'https://shikimori.one/api/genres',
        method: 'GET',
        async: false,
        success: response => {
          const genreTranslations = {
            Action: 'Экшен', Adventure: 'Приключения', Comedy: 'Комедия', Drama: 'Драма', Fantasy: 'Фэнтези'
            // ... (другие переводы опущены для краткости)
          };
          filters.kind = {
            title: 'Жанр',
            items: response.filter(item => item.entry_type === 'Anime')
              .map(item => ({ ...item, title: genreTranslations[item.name] || item.name, name: undefined }))
          };
        }
      });

      filters.AnimeKindEnum = {
        title: 'Тип',
        items: [
          { title: 'ТВ Сериал', code: 'tv' }, { title: 'Фильм', code: 'movie' },
          { title: 'OVA', code: 'ova' }, { title: 'ONA', code: 'ona' }
          // ... (другие типы опущены для краткости)
        ]
      };
      filters.status = {
        title: 'Статус',
        items: [
          { title: 'Анонс', code: 'anons' }, { title: 'Онгоинг', code: 'ongoing' }, { title: 'Вышло', code: 'released' }
        ]
      };
      filters.sort = {
        title: 'Сортировка',
        items: [
          { title: 'По рейтингу', code: 'ranked' }, { title: 'По популярности', code: 'popularity' },
          { title: 'По дате выхода', code: 'aired_on' }
          // ... (другие варианты сортировки опущены)
        ]
      };
      filters.seasons = {
        title: 'Сезон',
        items: this.generateSeasons()
      };
      return filters;
    }

    // Генерация сезонных фильтров
    generateSeasons() {
      const now = new Date();
      const seasons = [];
      for (let i = 1; i >= -3; i--) {
        const date = new Date(now);
        date.setMonth(now.getMonth() + 3 * i);
        const month = date.getMonth();
        const year = date.getFullYear();
        const seasonIndex = Math.floor((month + 1) / 3) % 4;
        const seasonNames = ['Зима', 'Весна', 'Лето', 'Осень'];
        seasons.push({ code: `season_${year}_${seasonIndex}`, title: `${seasonNames[seasonIndex]} ${year}` });
      }
      return seasons;
    }

    // Отображение меню фильтров
    showFilterMenu(filters) {
      const queryForShikimori = () => {
        const query = {};
        Object.values(filters).forEach(filter => {
          filter.items.forEach(item => {
            if (item.selected) query[filter.title.toLowerCase()] = item.code || item.id;
          });
        });
        return query;
      };

      const updateFilterSubtitle = filter => {
        const selected = filter.items.filter(item => item.selected).map(item => item.title);
        filter.subtitle = selected.length ? selected.join(', ') : Lampa.Lang.translate('nochoice');
      };

      const selectFilterItem = (items, selectedItem) => {
        items.forEach(item => item.selected = false);
        selectedItem.selected = true;
      };

      const showSubMenu = (filter, onBack) => {
        Lampa.Select.show({
          title: filter.title,
          items: filter.items,
          onBack,
          onSelect: item => {
            selectFilterItem(filter.items, item);
            this.showFilterMenu(filters);
          }
        });
      };

      Object.values(filters).forEach(updateFilterSubtitle);
      Lampa.Select.show({
        title: 'Фильтры',
        items: [{ title: Lampa.Lang.translate('search_start'), searchShikimori: true }, ...Object.values(filters)],
        onBack: () => Lampa.Controller.toggle('content'),
        onSelect: item => {
          if (item.searchShikimori) {
            Lampa.Activity.push({ url: '', title: 'Shikimori', component: 'Shikimori', page: 1, ...queryForShikimori() });
          } else {
            showSubMenu(item, () => this.showFilterMenu(filters));
          }
        }
      });
    }

    showEmpty() {
      const empty = new Lampa.Empty();
      this.html.append(empty.render(true));
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

    render(js) { return js ? this.html : $(this.html); }
    destroy() {
      Lampa.Arrays.destroy(this.items);
      this.scroll.destroy();
      this.html.remove();
      this.items = null;
    }
  }

  // Компонент для полной информации
  class DetailComponent {
    constructor() {
      Lampa.Listener.follow('full', async e => {
        if (e.type !== 'complite') return;
        try {
          const malData = await $.ajax({
            url: `https://arm.haglund.dev/api/v2/themoviedb?id=${e.object.id}`,
            method: 'GET'
          });
          if (!malData.length) return;

          const animeData = await $.ajax({
            url: `https://shikimori.one/api/animes/${malData[0].myanimelist}`,
            method: 'GET'
          });

          const render = e.object.activity.render();
          render.find('.full-descr__right').append(
            `<div class="full-descr__info"><div class="full-descr__info-name">Фандабберы</div><div class="full-descr__text">${animeData.fandubbers.join(', ')}</div></div>`,
            `<div class="full-descr__info"><div class="full-descr__info-name">Фансабберы</div><div class="full-descr__text">${animeData.fansubbers.join(', ')}</div></div>`
          );
          render.find('.full-start-new__rate-line').prepend(
            `<div class="full-start__rate rate--shikimori"><div>${animeData.score}</div><div>Shikimori</div></div>`
          );
        } catch (error) {
          console.error('Ошибка получения данных:', error);
        }
      });
    }
  }

  // Добавление кнопки в меню
  function addMenuButton() {
    const button = $(`
      <li class="menu__item selector">
        <div class="menu__ico">
          <img src="https://kartmansms.github.io/testing/Shikimori/icons/shikimori-icon.svg" alt="Shikimori icon" class="menu-icon" />
        </div>
        <div class="menu__text">Shikimori</div>
      </li>
    `);
    button.on('hover:enter', () => Lampa.Activity.push({ url: '', title: 'Shikimori', component: 'Shikimori', page: 1 }));
    $('.menu .menu__list').eq(0).append(button);
  }

  // Инициализация плагина
  function initializePlugin() {
    if (!window.Lampa?.Storage) {
      Lampa.Noty.show('Lampa не готова, повтор через 100 мс');
      return setTimeout(initializePlugin, 100);
    }

    window.plugin_shikimori_ready = true;
    const manifest = { type: 'other', version: '1.0', name: 'LKE Shikimori', description: 'Каталог Shikimori', component: 'Shikimori' };
    Lampa.Manifest.plugins = manifest;

    Lampa.Template.add('ShikimoriStyle', `
      <style>
        .Shikimori-catalog--list.category-full { justify-content: space-between !important; }
        .Shikimori-head.torrent-filter { margin-left: 1.5em; }
        .Shikimori.card__type { background: #ff4242; color: #fff; }
        .Shikimori .card__season { position: absolute; left: -0.8em; top: 3.4em; padding: .4em .4em; background: #05f; color: #fff; font-size: .8em; border-radius: .3em; }
        .Shikimori .card__status { position: absolute; left: -0.8em; bottom: 1em; padding: .4em .4em; background: #ffe216; color: #000; font-size: .8em; border-radius: .3em; }
        .menu-icon { width: 24px; height: 24px; fill: currentColor; }
      </style>
    `);

    Lampa.Template.add('Shikimori-Card', `
      <div class="Shikimori card selector layer--visible layer--render">
        <div class="Shikimori card__view">
          <img src="{img}" class="Shikimori card__img" />
          <div class="Shikimori card__type">{type}</div>
          <div class="Shikimori card__vote">{rate}</div>
          <div class="Shikimori card__season">{season}</div>
          <div class="Shikimori card__status">{status}</div>
        </div>
        <div class="Shikimori card__title">{title}</div>
      </div>
    `);

    Lampa.Component.add('Shikimori', CatalogComponent);
    new DetailComponent();
    $('body').append(Lampa.Template.get('ShikimoriStyle', {}, true));

    if (window.appready) {
      addMenuButton();
    } else {
      Lampa.Listener.follow('app', e => e.type === 'ready' && addMenuButton());
    }
  }

  if (!window.plugin_shikimori_ready) initializePlugin();
})();