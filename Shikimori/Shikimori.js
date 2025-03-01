(function () {
  'use strict';

  // Основная функция для выполнения GraphQL-запроса к Shikimori API
  function main(params, oncomplite, onerror) {
    $(document).ready(function () {
      var query = `
        query Animes {
          animes(limit: 36, order: ${params.sort || 'aired_on'}, page: ${params.page}
      `;

      if (params.kind) query += `, kind: "${params.kind}"`;
      if (params.status) query += `, status: "${params.status}"`;
      if (params.genre) query += `, genre: "${params.genre}"`;
      if (params.seasons) query += `, season: "${params.seasons}"`;

      query += `) {
          id
          name
          russian
          licenseNameRu
          english
          japanese
          kind
          score
          status
          season
          airedOn { year }
          poster { originalUrl }
        }
      }`;

      $.ajax({
        url: 'https://shikimori.one/api/graphql',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ query }),
        success: function (response) {
          oncomplite(response.data.animes);
        },
        error: function (error) {
          console.error('Ошибка:', error);
          onerror(error);
        }
      });
    });
  }

  // Поиск информации об аниме через внешние API
  function search(animeData) {
    function cleanName(name) {
      return name.replace(/\b(Season|Part)\s*\d*\.?\d*\b/gi, '').trim().replace(/\s{2,}/g, ' ');
    }

    $.get(`https://arm.haglund.dev/api/v2/ids?source=myanimelist&id=${animeData.id}`, function (response) {
      if (response === null || response.themoviedb === null) {
        searchTmdb(animeData.name, function (tmdbResponse) {
          handleTmdbResponse(tmdbResponse, animeData.japanese);
        });
      } else {
        getTmdb(response.themoviedb, animeData.kind, processResults);
      }
    }).fail(function (jqXHR) {
      if (jqXHR.status === 404) {
        searchTmdb(animeData.name, function (tmdbResponse) {
          handleTmdbResponse(tmdbResponse, animeData.japanese);
        });
      } else {
        console.error('Ошибка при получении данных:', jqXHR.status);
      }
    });

    function searchTmdb(query, callback) {
      const apiKey = "4ef0d7355d9ffb5151e987764708ce96";
      const apiUrlTMDB = 'https://api.themoviedb.org/3/';
      const apiUrlProxy = 'apitmdb.' + (Lampa.Manifest?.cub_domain || 'cub.red') + '/3/';
      const request = `search/multi?api_key=${apiKey}&language=${Lampa.Storage.field('language')}&include_adult=true&query=${cleanName(query)}`;
      $.get(Lampa.Storage.field('proxy_tmdb') ? Lampa.Utils.protocol() + apiUrlProxy + request : apiUrlTMDB + request, callback);
    }

    function getTmdb(id, type = 'movie', callback) {
      const apiKey = "4ef0d7355d9ffb5151e987764708ce96";
      const apiUrlTMDB = 'https://api.themoviedb.org/3/';
      const apiUrlProxy = 'apitmdb.' + (Lampa.Manifest?.cub_domain || 'cub.red') + '/3/';
      const request = `${type}/${id}?api_key=${apiKey}&language=${Lampa.Storage.field('language')}`;
      $.get(Lampa.Storage.field('proxy_tmdb') ? Lampa.Utils.protocol() + apiUrlProxy + request : apiUrlTMDB + request, callback);
    }

    function handleTmdbResponse(tmdbResponse, fallbackQuery) {
      if (tmdbResponse.total_results === 0) {
        searchTmdb(fallbackQuery, processResults);
      } else {
        processResults(tmdbResponse);
      }
    }

    function processResults(response) {
      if (response.total_results !== undefined) {
        if (response.total_results === 0) {
          Lampa.Noty.show('Не смог победить!!!');
        } else if (response.total_results === 1) {
          Lampa.Activity.push({
            url: '',
            component: 'full',
            id: response.results[0].id,
            method: response.results[0].media_type,
            card: response.results[0]
          });
        } else {
          const menu = response.results.map(animeItem => ({
            title: `[${animeItem.media_type.toUpperCase()}] ${animeItem.name || animeItem.title}`,
            card: animeItem
          }));
          Lampa.Select.show({
            title: 'Найти',
            items: menu,
            onBack: () => Lampa.Controller.toggle("content"),
            onSelect: a => Lampa.Activity.push({
              url: '',
              component: 'full',
              id: a.card.id,
              method: a.card.media_type,
              card: a.card
            })
          });
        }
      } else {
        Lampa.Activity.push({
          url: '',
          component: 'full',
          id: response.id,
          method: response.number_of_episodes ? 'tv' : 'movie',
          card: response
        });
      }
    }
  }

  const API = { main, search };

  // Класс для создания карточки аниме
  function Card(data, userLang) {
    const typeTranslations = {
      'tv': 'ТВ', 'movie': 'Фильм', 'ova': 'OVA', 'ona': 'ONA', 'special': 'Спешл',
      'tv_special': 'ТВ Спешл', 'music': 'Музыка', 'pv': 'PV', 'cm': 'CM'
    };
    const statusTranslations = { 'anons': 'Анонс', 'ongoing': 'Онгоинг', 'released': 'Вышло' };

    const formattedSeason = data.season
      ? data.season.replace(/_/g, ' ')
        .replace(/^\w/, c => c.toUpperCase())
        .replace(/(winter|spring|summer|fall)/gi, match => ({
          'winter': 'Зима', 'spring': 'Весна', 'summer': 'Лето', 'fall': 'Осень'
        }[match.toLowerCase()]))
      : '';

    const capitalizeFirstLetter = string => string ? string.charAt(0).toUpperCase() + string.slice(1) : string;

    const item = Lampa.Template.get("Shikimori-Card", {
      img: data.poster.originalUrl,
      type: typeTranslations[data.kind] || data.kind.toUpperCase(),
      status: statusTranslations[data.status] || capitalizeFirstLetter(data.status),
      rate: data.score,
      title: userLang === 'ru' ? (data.russian || data.name || data.japanese) : (data.name || data.japanese),
      season: data.season !== null ? formattedSeason : data.airedOn.year
    });

    this.render = () => item;
    this.destroy = () => item.remove();
  }

  // Основной компонент для отображения каталога
  function Component$1(object) {
    const userLang = Lampa.Storage.field('language');
    const network = new Lampa.Reguest();
    const scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
    let items = [];
    const html = $("<div class='Shikimori-module'></div>");
    const head = $(`<div class='Shikimori-head torrent-filter'>
      <div class='Shikimori__home simple-button simple-button--filter selector'>Главная</div>
      <div class='Shikimori__search simple-button simple-button--filter selector'>Фильтр</div>
    </div>`);
    const body = $('<div class="Shikimori-catalog--list category-full"></div>');
    let last;

    this.create = () => API.main(object, this.build.bind(this), this.empty.bind(this));

    this.build = result => {
      scroll.minus();
      scroll.onWheel = step => {
        if (!Lampa.Controller.own(this)) this.start();
        Navigator.move(step > 0 ? 'down' : 'up');
      };
      scroll.onEnd = () => {
        object.page++;
        API.main(object, this.build.bind(this), this.empty.bind(this));
      };

      this.headeraction();
      this.body(result);
      scroll.append(head);
      scroll.append(body);
      html.append(scroll.render(true));
      this.activity.loader(false);
      this.activity.toggle();
    };

    this.headeraction = () => {
      const settings = { url: "https://shikimori.one/api/genres", method: "GET", timeout: 0 };
      const filters = {};

      $.ajax(settings).done(response => {
        const genreTranslations = {
          "Action": "Экшен", "Adventure": "Приключения", "Comedy": "Комедия", /* ... другие переводы ... */
        };
        filters.kind = {
          title: 'Жанр',
          items: response.filter(item => item.entry_type === "Anime").map(item => ({
            ...item,
            title: genreTranslations[item.name] || item.name,
            name: undefined
          }))
        };
      });

      filters.AnimeKindEnum = {
        title: 'Тип',
        items: [{ title: "ТВ Сериал", code: "tv" }, { title: "Фильм", code: "movie" }, /* ... остальные типы ... */]
      };
      filters.status = {
        title: 'Статус',
        items: [{ title: "Анонс", code: "anons" }, { title: "Онгоинг", code: "ongoing" }, { title: "Вышло", code: "released" }]
      };
      filters.sort = {
        title: 'Сортировка',
        items: [{ title: "По рейтингу", code: "ranked" }, { title: "По популярности", code: "popularity" }, /* ... остальные сортировки ... */]
      };
      filters.seasons = {
        title: 'Сезон',
        items: generateSeasonJSON()
      };

      function getCurrentSeason(date) {
        const month = date.getMonth();
        const year = date.getFullYear();
        const seasons = ['winter', 'spring', 'summer', 'fall'];
        const seasonTitles = ['Зима', 'Весна', 'Лето', 'Осень'];
        const seasonIndex = Math.floor((month + 1) / 3) % 4;
        return { code: `${seasons[seasonIndex]}_${year}`, title: `${seasonTitles[seasonIndex]} ${year}` };
      }

      function generateDynamicSeasons() {
        const now = new Date();
        return Array.from({ length: 4 }, (_, i) => {
          const nextDate = new Date(now);
          nextDate.setMonth(now.getMonth() + 3 * (i - 3));
          return getCurrentSeason(nextDate);
        });
      }

      function generateYearRanges() {
        const currentYear = new Date().getFullYear();
        const ranges = [];
        for (let year = currentYear; year >= currentYear - 3; year--) ranges.push({ code: `${year}`, title: `${year} год` });
        for (let startYear = currentYear; startYear >= currentYear - 20; startYear -= 5) {
          const endYear = startYear - 5;
          if (endYear <= startYear) ranges.push({ code: `${endYear}_${startYear}`, title: `${startYear}–${endYear} год` });
          if (endYear === currentYear - 20) break;
        }
        return ranges;
      }

      function generateSeasonJSON() {
        return [...generateDynamicSeasons(), ...generateYearRanges()];
      }

      const serverElement = head.find('.Shikimori__search');
      function queryForShikimori() {
        const query = {};
        Object.values(filters).forEach(filter =>
          filter.items.forEach(item => { if (item.selected) query[filter.title.toLowerCase()] = item.code || item.id; })
        );
        return query;
      }

      function selected(where) {
        const title = where.items.filter(a => a.selected || a.checked).map(a => a.title);
        where.subtitle = title.length ? title.join(', ') : Lampa.Lang.translate('nochoice');
      }

      function select(where, a) {
        where.forEach(element => element.selected = false);
        a.selected = true;
      }

      function submenu(item, main) {
        Lampa.Select.show({
          title: item.title,
          items: item.items,
          onBack: main,
          onSelect: a => { select(item.items, a); main(); }
        });
      }

      function mainMenu() {
        for (let i in filters) selected(filters[i]);
        Lampa.Select.show({
          title: 'Фильтры',
          items: [{ title: Lampa.Lang.translate('search_start'), searchShikimori: true }, ...Object.values(filters)],
          onBack: () => Lampa.Controller.toggle("content"),
          onSelect: a => a.searchShikimori ? search() : submenu(a, mainMenu)
        });
      }

      function search() {
        const query = queryForShikimori();
        const params = { url: '', title: 'Shikimori', component: 'Shikimori', page: 1, ...query };
        Lampa.Activity.push(params);
      }

      serverElement.on('hover:enter', mainMenu);
      head.find('.Shikimori__home').on('hover:enter', () =>
        Lampa.Activity.push({ url: '', title: 'Shikimori', component: 'Shikimori', page: 1 })
      );
    };

    this.empty = () => {
      const empty = new Lampa.Empty();
      html.appendChild(empty.render(true));
      this.start = empty.start;
      this.activity.loader(false);
      this.activity.toggle();
    };

    this.body = data => {
      data.forEach(anime => {
        const item = new Card(anime, userLang);
        item.render(true)
          .on("hover:focus", () => {
            last = item.render()[0];
            scroll.update(item.render(true), true);
          })
          .on("hover:enter", () => API.search(anime));
        body.append(item.render(true));
        items.push(item);
      });
    };

    this.start = () => {
      if (Lampa.Activity.active().activity !== this.activity) return;
      Lampa.Controller.add("content", {
        toggle: () => {
          Lampa.Controller.collectionSet(scroll.render());
          Lampa.Controller.collectionFocus(last || false, scroll.render());
        },
        left: () => Navigator.canmove("left") ? Navigator.move("left") : Lampa.Controller.toggle("menu"),
        right: () => Navigator.move("right"),
        up: () => Navigator.canmove("up") ? Navigator.move("up") : Lampa.Controller.toggle("head"),
        down: () => Navigator.canmove("down") && Navigator.move("down"),
        back: this.back
      });
      Lampa.Controller.toggle("content");
    };

    this.render = js => js ? html : $(html);
    this.destroy = () => {
      network.clear();
      Lampa.Arrays.destroy(items);
      scroll.destroy();
      html.remove();
      items = network = null;
    };
  }

  // Компонент для расширения информации в карточке
  function Component() {
    Lampa.Listener.follow("full", async e => {
      if (e.type !== "complite") return;
      try {
        const getMAL = await $.ajax({ url: `https://arm.haglund.dev/api/v2/themoviedb?id=${e.object.id}`, method: "GET", timeout: 0 });
        if (!getMAL.length) return console.warn("Данные не найдены.");
        const response = await $.ajax({ url: `https://shikimori.one/api/animes/${getMAL[0].myanimelist}`, method: "GET", timeout: 0 });
        e.object.activity.render().find(".full-descr__right").append(
          `<div class="full-descr__info"><div class="full-descr__info-name">Фандабберы</div><div class="full-descr__text">${response.fandubbers.join(', ')}</div></div>`,
          `<div class="full-descr__info"><div class="full-descr__info-name">Фансабберы</div><div class="full-descr__text">${response.fansubbers.join(', ')}</div></div>`
        );
        e.object.activity.render().find(".full-start-new__rate-line").prepend(
          `<div class="full-start__rate rate--shikimori"><div>${response.score}</div><div>Shikimori</div></div>`
        );
      } catch (error) {
        console.error("Ошибка:", error);
      }
    });
  }

  // Добавление кнопки в меню
  function add() {
    const button = $(`<li class="menu__item selector">
      <div class="menu__ico"><svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="..." /></svg></div>
      <div class="menu__text">Shikimori</div>
    </li>`);
    button.on("hover:enter", () => Lampa.Activity.push({ url: '', title: 'Shikimori', component: 'Shikimori', page: 1 }));
    $(".menu .menu__list").eq(0).append(button);
  }

  // Инициализация плагина
  function startPlugin() {
    window.plugin_shikimori_ready = true;
    const manifest = { type: "other", version: "1.0", name: "LKE Shikimori", description: "Добавляет каталог Shikimori", component: "Shikimori" };
    Lampa.Manifest.plugins = manifest;
    Lampa.Template.add('ShikimoriStyle', `<style>...</style>`);
    Lampa.Template.add("Shikimori-Card", `<div class="Shikimori card selector layer--visible layer--render">...</div>`);
    Lampa.Component.add(manifest.component, Component$1);
    Component();
    $('body').append(Lampa.Template.get('ShikimoriStyle', {}, true));
    if (window.appready) add();
    else Lampa.Listener.follow("app", e => e.type === "ready" && add());
  }

  if (!window.plugin_shikimori_ready) startPlugin();
})();