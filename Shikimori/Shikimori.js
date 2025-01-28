(function () {
  'use strict';

  function ownKeys(e, r) {
    var t = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var o = Object.getOwnPropertySymbols(e);
      r && (o = o.filter(function (r) {
        return Object.getOwnPropertyDescriptor(e, r).enumerable;
      })), t.push.apply(t, o);
    }
    return t;
  }

  // Функция для перевода жанров на русский язык
  function translateGenre(genre) {
    const genreTranslations = {
      "Action": "Экшен",
      "Adventure": "Приключения",
      "Comedy": "Комедия",
      "Drama": "Драма",
      "Fantasy": "Фэнтези",
      "Horror": "Ужасы",
      "Mahou Shoujo": "Махо-сёдзё",
      "Mecha": "Меха",
      "Music": "Музыка",
      "Mystery": "Мистика",
      "Psychological": "Психологическое",
      "Romance": "Романтика",
      "Sci-Fi": "НФ",
      "Slice of Life": "Повседневность",
      "Sports": "Спорт",
      "Supernatural": "Сверхъестественное",
      "Game": "Игра",
      "Demons": "Демоны",
      "Police": "Полиция",
      "Ecchi": "Эччи",
      "Hentai": "Хентай",
      "Historical": "Историческое",
      "Magic": "Магия",
      "Parody": "Пародия",
      "School": "Школа",
      "Samurai": "Самураи"
    };
    return genreTranslations[genre] || genre; // Если перевод не найден, возвращаем оригинальное название
  }

  function _objectSpread2(e) {
    for (var r = 1; r < arguments.length; r++) {
      var t = null != arguments[r] ? arguments[r] : {};
      r % 2 ? ownKeys(Object(t), !0).forEach(function (r) {
        defineProperty(e, r, t[r]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) {
        Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
      });
    }
    return e;
  }

  function main(params, oncomplite, onerror) {
    $(document).ready(function () {
      // Начинаем формировать запрос с базовыми параметрами
      var query = "\n	query Animes {\n	animes(limit: ".concat(params.limit || 36, ", order: ").concat(params.sort || 'ranked', ", page: ").concat(params.page, "\n	");

      // Добавляем фильтры, если они присутствуют в params
      if (params.kind) {
        query += ", kind: \"".concat(params.kind, "\"");
      }
      if (params.status) {
        query += ", status: \"".concat(params.status, "\"");
      }
      if (params.genre) {
        query += ", genre: \"".concat(params.genre, "\"");
      }
      if (params.seasons) {
        query += ", season: \"".concat(params.seasons, "\"");
      }

      // Закрываем параметры и продолжаем запрос
      query += ") {\n	id\n	name\n	russian\n	licenseNameRu\n	english\n	japanese\n	kind\n	score\n	status\n	season\n	airedOn { year }\n	poster {\n	originalUrl\n	}\n	}\n	}\n	";

      $.ajax({
        url: 'https://shikimori.one/api/graphql',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
          query: query
        }),
        success: function success(response) {
          oncomplite(response.data.animes);
        },
        error: function error(_error) {
          console.error('Ошибка:', _error);
          onerror(_error); // Вызов onerror при ошибке запроса
        }
      });
    });
  }

  function Card(data, userLang) {
    // Функция для перевода сезонов
    function translateSeason(season) {
      if (!season) return ''; // Если сезон не указан, возвращаем пустую строку
      // Разделяем сезон и год (например, "spring_2009" → ["spring", "2009"])
      var parts = season.split('_');
      if (parts.length < 2) return season; // Если формат неверный, возвращаем оригинальное значение
      var seasonName = parts[0].toLowerCase(); // Название сезона (например, "spring")
      var year = parts[1]; // Год (например, "2009")
      // Переводим сезон
      switch (seasonName) {
        case 'winter':
          return 'Зима ' + year;
        case 'spring':
          return 'Весна ' + year;
        case 'summer':
          return 'Лето ' + year;
        case 'fall':
          return 'Осень ' + year;
        default:
          return season; // Если сезон неизвестен, возвращаем оригинальное значение
      }
    }

    // Функция для перевода типов аниме
    function translateKind(kind) {
      switch (kind.toLowerCase()) {
        case 'tv':
          return 'TV Сериал';
        case 'movie':
          return 'Фильм';
        case 'ova':
          return 'OVA';
        case 'ona':
          return 'ONA';
        case 'special':
          return 'Спешл';
        case 'tv_special':
          return 'TV Спешл';
        case 'music':
          return 'Музыка';
        case 'pv':
          return 'PV';
        case 'cm':
          return 'CM';
        default:
          return kind; // Если тип неизвестен, возвращаем оригинальное значение
      }
    }

    // Форматируем сезон с переводом
    var formattedSeason = data.season ? translateSeason(data.season) : '';

    function capitalizeFirstLetter(string) {
      if (!string) return string; // Проверка на пустую строку или null/undefined
      return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Функция для перевода статусов
    function translateStatus(status) {
      switch (status.toLowerCase()) {
        case 'released':
          return 'Вышло';
        case 'ongoing':
          return 'Онгоинг';
        case 'anons':
          return 'Анонс';
        case 'latest':
          return 'Последнее';
        default:
          return capitalizeFirstLetter(status); // Если статус неизвестен, возвращаем его без изменений
      }
    }

    var item = Lampa.Template.get("Shikimori-Card", {
      img: data.poster.originalUrl,
      type: translateKind(data.kind), // Используем перевод типа аниме
      status: translateStatus(data.status), // Используем перевод статуса
      rate: data.score,
      title: userLang === 'ru' ? data.russian || data.name || data.japanese : data.name || data.japanese,
      season: formattedSeason // Используем переведенный сезон
    });

    this.render = function () {
      return item;
    };

    this.destroy = function () {
      item.remove();
    };
  }

  function Component$1(object) {
    var userLang = Lampa.Storage.field('language');
    var network = new Lampa.Reguest();
    var scroll = new Lampa.Scroll({
      mask: true,
      over: true,
      step: 250
    });
    var items = [];
    var html = $("");
    var head = $("ГлавнаяТоп 100Фильтр");
    var body = $('');
    var active, last;

    this.create = function () {
      if (object.title === 'Главная') {
        object.status = 'anons'; // Фильтруем только анонсы
      } else if (object.title === 'Топ 100') {
        object.limit = 100; // Ограничиваем количество до 100
        object.sort = 'ranked'; // Сортируем по рейтингу
      }

      API.main(object, this.build.bind(this), this.empty.bind(this));
    };

    this.build = function (result) {
      var _this = this;

      scroll.minus();
      scroll.onWheel = function (step) {
        if (!Lampa.Controller.own(_this)) _this.start();
        if (step > 0) Navigator.move('down'); else Navigator.move('up');
      };

      scroll.onEnd = function () {
        object.page++;
        API.main(object, _this.build.bind(_this), _this.empty.bind(_this));
      };

      this.headeraction();
      this.body(result);
      scroll.append(head);
      scroll.append(body);
      html.append(scroll.render(true));
      this.activity.loader(false);
      this.activity.toggle();
    };

    this.headeraction = function () {
      var settings = {
        "url": "https://shikimori.one/api/genres",
        "method": "GET",
        "timeout": 0
      };

      var filters = {};

      $.ajax(settings).done(function (response) {
        var filteredResponse = response.filter(function (item) {
          return item.entry_type === "Anime";
        });

        var modifiedResponse = filteredResponse.map(function (item) {
          return _objectSpread2(_objectSpread2({}, item), {}, {
            title: translateGenre(item.name), // Переводим название жанра
            name: undefined
          });
        });

        filters.kind = {
          title: 'Жанр',
          items: modifiedResponse
        };
      });

      filters.AnimeKindEnum = {
        title: 'Тип',
        items: [{
          title: "TV Сериал",
          code: "tv"
        }, {
          title: "Фильм",
          code: "movie"
        }, {
          title: "OVA",
          code: "ova"
        }, {
          title: "ONA",
          code: "ona"
        }, {
          title: "Спешл",
          code: "special"
        }, {
          title: "TV Спешл",
          code: "tv_special"
        }, {
          title: "Музыка",
          code: "music"
        }, {
          title: "PV",
          code: "pv"
        }, {
          title: "CM",
          code: "cm"
        }]
      };

      filters.status = {
        title: 'Статус',
        items: [{
          title: "Анонс",
          code: "anons"
        }, {
          title: "Онгоиг",
          code: "ongoing"
        }, {
          title: "Вышло",
          code: "released"
        }]
      };

      filters.sort = {
        title: 'Сортировка',
        items: [{
          title: "По рейтингу",
          code: "ranked"
        }, {
          title: "По популярности",
          code: "popularity"
        }, {
          title: "По алфавиту",
          code: "name"
        }, {
          title: "По дате выхода",
          code: "aired_on"
        }, {
          title: "По типу",
          code: "kind"
        }, {
          title: "По количеству эпизодов",
          code: "episodes"
        }, {
          title: "По статусу",
          code: "status"
        }, {
          title: "По рейтингу Shikimori",
          code: "ranked_shiki"
        }]
      };

      /** Season Range **/
      function getCurrentSeason(date) {
        var month = date.getMonth();
        var year = date.getFullYear();
        var seasons = ['winter', 'spring', 'summer', 'fall'];
        var seasonTitles = ['Зима', 'Весна', 'Лето', 'Осень']; // Названия сезонов на русском
        var seasonIndex = Math.floor((month + 1) / 3) % 4; // Определение индекса сезона
        return {
          code: `${seasons[seasonIndex]}_${year}`,
          title: `${seasonTitles[seasonIndex]} ${year}`
        };
      }

      function generateDynamicSeasons() {
        var now = new Date();
        var seasons = [];
        // Добавляем будущий, текущий и предыдущие сезоны
        for (var i = 1; i >= -3; i--) {
          var nextDate = new Date(now);
          nextDate.setMonth(now.getMonth() + 3 * i); // Добавляем 3 месяца для следующего сезона
          seasons.push(getCurrentSeason(nextDate));
        }
        return seasons;
      }

      function generateYearRanges() {
        var currentYear = new Date().getFullYear();
        var ranges = [];
        // Генерируем текущий и предыдущие три года
        for (var year = currentYear; year >= currentYear - 3; year--) {
          ranges.push({
            code: `${year}`,
            title: `${year} год`
          });
        }
        return ranges;
      }

      function generateSeasonJSON() {
        var dynamicSeasons = generateDynamicSeasons();
        var yearRanges = generateYearRanges();
        var allSeasons = [...dynamicSeasons, ...yearRanges]; // Объединяем сезоны и годы
        return allSeasons;
      }

      filters.seasons = {
        title: 'Сезон',
        items: generateSeasonJSON()
      };

      var serverElement = head.find('.Shikimori__search');

      function queryForShikimori() {
        var query = {};
        filters.AnimeKindEnum.items.forEach(function (a) {
          if (a.selected) query.kind = a.code;
        });
        filters.status.items.forEach(function (a) {
          if (a.selected) query.status = a.code;
        });
        filters.kind.items.forEach(function (a) {
          if (a.selected) query.genre = a.id;
        });
        filters.sort.items.forEach(function (a) {
          if (a.selected) query.sort = a.code;
        });
        filters.seasons.items.forEach(function (a) {
          if (a.selected) query.seasons = a.code;
        });
        return query;
      }

      function selected(where) {
        var title = [];
        where.items.forEach(function (a) {
          if (a.selected || a.checked) title.push(a.title);
        });
        where.subtitle = title.length ? title.join(', ') : Lampa.Lang.translate('nochoice');
      }

      function select(where, a) {
        where.forEach(function (element) {
          element.selected = false;
        });
        a.selected = true;
      }

      function submenu(item, main) {
        Lampa.Select.show({
          title: item.title,
          items: item.items,
          onBack: main,
          onSelect: function onSelect(a) {
            select(item.items, a);
            main();
          }
        });
      }

      function mainMenu() {
        for (var i in filters) selected(filters[i]);
        Lampa.Select.show({
          title: 'Фильтры',
          items: [{
            title: Lampa.Lang.translate('search_start'),
            searchShikimori: true
          }, filters.status, filters.AnimeKindEnum, filters.kind, filters.sort, filters.seasons],
          onBack: function onBack() {
            Lampa.Controller.toggle("content");
          },
          onSelect: function onSelect(a) {
            if (a.searchShikimori) {
              search();
            } else submenu(a, mainMenu);
          }
        });
      }

      function search() {
        var query = queryForShikimori();
        var params = {
          url: '',
          title: 'Shikimori',
          component: 'Shikimori',
          page: 1
        };

        // Добавляем параметры только если они существуют
        if (query.kind) {
          params.kind = query.kind;
        }
        if (query.status) {
          params.status = query.status;
        }
        if (query.genre) {
          params.genre = query.genre;
        }
        if (query.sort) {
          params.sort = query.sort;
        }
        if (query.seasons) {
          params.seasons = query.seasons;
        }

        Lampa.Activity.push(params);
      }

      serverElement.on('hover:enter', function () {
        mainMenu();
      });

      var homeElement = head.find('.Shikimori__home');
      homeElement.on('hover:enter', function () {
        Lampa.Activity.push({
          url: '',
          title: 'Главная',
          component: 'Shikimori',
          page: 1,
          status: 'anons' // Отображаем только анонсы
        });
      });

      var top100Element = head.find('.Shikimori__top100');
      top100Element.on('hover:enter', function () {
        Lampa.Activity.push({
          url: '',
          title: 'Топ 100',
          component: 'Shikimori',
          page: 1,
          limit: 100, // Устанавливаем лимит на 100 аниме
          sort: 'ranked' // Сортировка по рейтингу
        });
      });
    };

    this.empty = function () {
      var empty = new Lampa.Empty();
      html.appendChild(empty.render(true));
      this.start = empty.start;
      this.activity.loader(false);
      this.activity.toggle();
    };

    //Catalog build
    this.body = function (data) {
      data.forEach(function (anime) {
        var item = new Card(anime, userLang);
        item.render(true).on("hover:focus", function () {
          last = item.render()[0];
          active = items.indexOf(item);
          scroll.update(items[active].render(true), true);
        }).on("hover:enter", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
          return _regeneratorRuntime().wrap(function _callee$(_context) {
            while (1) switch (_context.prev = _context.next) {
              case 0:
                API.search(anime);
              case 1:
              case "end":
                return _context.stop();
            }
          }, _callee);
        })));
        body.append(item.render(true));
        items.push(item);
      });
    };

    this.start = function () {
      if (Lampa.Activity.active().activity !== this.activity) return;
      Lampa.Controller.add("content", {
        toggle: function toggle() {
          Lampa.Controller.collectionSet(scroll.render());
          Lampa.Controller.collectionFocus(last || false, scroll.render());
        },
        left: function left() {
          if (Navigator.canmove("left")) Navigator.move("left"); else Lampa.Controller.toggle("menu");
        },
        right: function right() {
          Navigator.move("right");
        },
        up: function up() {
          if (Navigator.canmove("up")) Navigator.move("up"); else Lampa.Controller.toggle("head");
        },
        down: function down() {
          if (Navigator.canmove("down")) Navigator.move("down");
        },
        back: this.back
      });
      Lampa.Controller.toggle("content");
    };

    this.pause = function () {};
    this.stop = function () {};
    this.render = function (js) {
      return js ? html : $(html);
    };
    this.destroy = function () {
      network.clear();
      Lampa.Arrays.destroy(items);
      scroll.destroy();
      html.remove();
      items = null;
      network = null;
    };
  }

  function add() {
    var button = $("\n	\n	Shikimori icon\n	\n	Shikimori\n	");
    button.on("hover:enter", function () {
      Lampa.Activity.push({
        url: '',
        title: 'Shikimori',
        component: 'Shikimori',
        page: 1
      });
    });
    $(".menu .menu__list").eq(0).append(button);
  }

  function startPlugin() {
    window.plugin_shikimori_ready = true;
    var manifest = {
      type: "other",
      version: "0.1",
      name: "LKE Shikimori",
      description: "Добавляет каталог Shikimori",
      component: "Shikimori"
    };
    Lampa.Manifest.plugins = manifest;
    Lampa.Template.add('ShikimoriStyle', "");
    Lampa.Template.add("Shikimori-Card", "\n	\n	\n	{type}\n	{rate}\n	{season}\n	{status}\n	\n	{title}\n	");
    Lampa.Component.add(manifest.component, Component$1);

    $('body').append(Lampa.Template.get('ShikimoriStyle', {}, true));
    if (window.appready) add(); else {
      Lampa.Listener.follow("app", function (e) {
        if (e.type === "ready") add();
      });
    }
  }

  if (!window.plugin_shikimori_ready) startPlugin();
})();