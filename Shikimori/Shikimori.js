(function () {
  'use strict';

  // Основная функция для выполнения GraphQL-запроса к Shikimori API
  function main(params, oncomplite, onerror) {
    $(document).ready(function () {
      // Формирование GraphQL-запроса с параметрами
      var query = "\n	query Animes {\n	animes(limit: 36, order: ".concat(params.sort || 'aired_on', ", page: ").concat(params.page, "\n	");

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

      query += ") {\n                    id\n                    name\n                    russian\n                    licenseNameRu\n                    english\n                    japanese\n                    kind\n                    score\n                    status\n                    season\n                    airedOn { year }\n                    poster {\n                        originalUrl\n                    }\n                }\n            }\n        ";

      // AJAX-запрос к API Shikimori
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
          onerror(_error);
        }
      });
    });
  }

  // Поиск информации об аниме через внешние API
  function search(animeData) {
    // Очистка названия от сезонов и частей
    function cleanName(name) {
      var regex = /\b(Season|Part)\s*\d*\.?\d*\b/gi;
      var cleanedName = name.replace(regex, '').trim();
      cleanedName = cleanedName.replace(/\s{2,}/g, ' ');
      return cleanedName;
    }

    // Первый GET запрос к https://animeapi.my.id/shikimori/{animeData.id}
    $.get("https://arm.haglund.dev/api/v2/ids?source=myanimelist&id=".concat(animeData.id), function (response) {
      if (response === null) {
        console.log('Мы здесь шаг#1');
        // Если получили 404, продолжаем искать на TMDB
        searchTmdb(animeData.name, function (tmdbResponse) {
          handleTmdbResponse(tmdbResponse, animeData.japanese);
        });
      } else if (response.themoviedb === null) {
        console.log('Мы здесь шаг#2');
        // Если themoviedb: null, делаем запрос к https://api.themoviedb.org/3/search/multi?include_adult=true&query={animeData.name}
        searchTmdb(animeData.name, function (tmdbResponse) {
          handleTmdbResponse(tmdbResponse, animeData.japanese);
        });
      } else {
        console.log('Мы здесь шаг#3', animeData.kind);
        // Если themoviedb не равно null, делаем запрос к https://api.themoviedb.org/3/movie/{response.themoviedb}
        getTmdb(response.themoviedb, animeData.kind, processResults);
      }
    }).fail(function (jqXHR) {
      if (jqXHR.status === 404) {
        // Если получили 404, продолжаем искать на TMDB
        searchTmdb(animeData.name, function (tmdbResponse) {
          handleTmdbResponse(tmdbResponse, animeData.japanese);
        });
      } else {
        console.error('Ошибка при получении данных с animeapi.my.id:', jqXHR.status);
      }
    });

    // Поиск через TMDB API
    function searchTmdb(query, callback) {
      var apiKey = "4ef0d7355d9ffb5151e987764708ce96";
      var apiUrlTMDB = 'https://api.themoviedb.org/3/';
      var apiUrlProxy = 'apitmdb.' + (Lampa.Manifest && Lampa.Manifest.cub_domain ? Lampa.Manifest.cub_domain : 'cub.red') + '/3/';
      var request = "search/multi?api_key=".concat(apiKey, "&language=").concat(Lampa.Storage.field('language'), "&include_adult=true&query=").concat(cleanName(query));
      $.get(Lampa.Storage.field('proxy_tmdb') ? Lampa.Utils.protocol() + apiUrlProxy + request : apiUrlTMDB + request, callback);
    }

    // Получение детальной информации из TMDB
    function getTmdb(id) {
      var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'movie';
      var callback = arguments.length > 2 ? arguments[2] : undefined;
      var apiKey = "4ef0d7355d9ffb5151e987764708ce96";
      var apiUrlTMDB = 'https://api.themoviedb.org/3/';
      var apiUrlProxy = 'apitmdb.' + (Lampa.Manifest && Lampa.Manifest.cub_domain ? Lampa.Manifest.cub_domain : 'cub.red') + '/3/';
      var request = "".concat(type, "/").concat(id, "?api_key=").concat(apiKey, "&language=").concat(Lampa.Storage.field('language'));
      $.get(Lampa.Storage.field('proxy_tmdb') ? Lampa.Utils.protocol() + apiUrlProxy + request : apiUrlTMDB + request, callback);
    }

    // Обработка ответов от TMDB
    function handleTmdbResponse(tmdbResponse, fallbackQuery) {
      if (tmdbResponse.total_results === 0) {
        searchTmdb(fallbackQuery, handleFallbackResponse);
      } else {
        processResults(tmdbResponse);
      }
    }

    function handleFallbackResponse(fallbackResponse) {
      processResults(fallbackResponse);
    }

    function processResults(response) {
      var menu = [];
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
        } else if (response.total_results > 1) {
          response.results.forEach(function (animeItem) {
            menu.push({
              title: "[".concat(animeItem.media_type.toUpperCase(), "] ").concat(animeItem.name ? animeItem.name : animeItem.title),
              card: animeItem
            });
          });
          Lampa.Select.show({
            title: 'Найти',
            items: menu,
            onBack: function onBack() {
              Lampa.Controller.toggle("content");
            },
            onSelect: function onSelect(a) {
              Lampa.Activity.push({
                url: '',
                component: 'full',
                id: a.card.id,
                method: a.card.media_type,
                card: a.card
              });
            }
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

  var API = {
    main: main,
    search: search
  };

  // Класс для создания карточки аниме
  function Card(data, userLang) {
    // Локализация типов и статусов
    var typeTranslations = {
      'tv': 'ТВ',
      'movie': 'Фильм',
      'ova': 'OVA',
      'ona': 'ONA',
      'special': 'Спешл',
      'tv_special': 'ТВ Спешл',
      'music': 'Музыка',
      'pv': 'PV',
      'cm': 'CM'
    };

    var statusTranslations = {
      'anons': 'Анонс',
      'ongoing': 'Онгоинг',
      'released': 'Вышло'
    };

    // Форматирование сезона
    var formattedSeason = data.season ? data.season.replace(/_/g, ' ')
      .replace(/^\w/, function (c) { return c.toUpperCase(); })
      .replace(/(winter|spring|summer|fall)/gi, function (match) {
        return {
          'winter': 'Зима',
          'spring': 'Весна',
          'summer': 'Лето',
          'fall': 'Осень'
        }[match.toLowerCase()];
      }) : '';

    function capitalizeFirstLetter(string) {
      if (!string) return string;
      return string.charAt(0).toUpperCase() + string.slice(1);
    }

    var item = Lampa.Template.get("Shikimori-Card", {
      img: data.poster.originalUrl,
      type: typeTranslations[data.kind] || data.kind.toUpperCase(),
      status: statusTranslations[data.status] || capitalizeFirstLetter(data.status),
      rate: data.score,
      title: userLang === 'ru' ? data.russian || data.name || data.japanese : data.name || data.japanese,
      season: data.season !== null ? formattedSeason : data.airedOn.year
    });

    // Создание DOM-элемента карточки
    this.render = function () {
      return item;
    };
    this.destroy = function () {
      item.remove();
    };
  }

  // Основной компонент для отображения каталога
  function Component$1(object) {
    var userLang = Lampa.Storage.field('language');
    var network = new Lampa.Reguest();
    var scroll = new Lampa.Scroll({
      mask: true,
      over: true,
      step: 250
    });
    var items = [];
    var html = $("<div class='Shikimori-module'></div>");
    var head = $("<div class='Shikimori-head torrent-filter'><div class='Shikimori__home simple-button simple-button--filter selector'>Главная</div><div class='Shikimori__search simple-button simple-button--filter selector'>Фильтр</div></div>");
    var body = $('<div class="Shikimori-catalog--list category-full"></div>');
    var active, last;

    // Инициализация элементов интерфейса
    this.create = function () {
      API.main(object, this.build.bind(this), this.empty.bind(this));
    };

    // Построение списка карточек
    this.build = function (result) {
      var _this = this;
      scroll.minus();
      scroll.onWheel = function (step) {
        if (!Lampa.Controller.own(_this)) _this.start();
        if (step > 0) Navigator.move('down');else Navigator.move('up');
      };
      scroll.onEnd = function () {
        object.page++;
        API.main(object, _this.build.bind(_this), _this.empty.bind(_this));
      };

      // Обработка фильтров
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
        var genreTranslations = {
          "Action": "Экшен",
          "Adventure": "Приключения",
          "Cars": "Машины",
          "Comedy": "Комедия",
          "Dementia": "Деменция",
          "Demons": "Демоны",
          "Drama": "Драма",
          "Ecchi": "Этти",
          "Fantasy": "Фэнтези",
          "Game": "Игра",
          "Harem": "Гарем",
          "Historical": "Исторический",
          "Horror": "Ужасы",
          "Josei": "Дзёсей",
          "Kids": "Детский",
          "Magic": "Магия",
          "Martial Arts": "Боевые искусства",
          "Mecha": "Меха",
          "Military": "Военный",
          "Music": "Музыка",
          "Mystery": "Мистика",
          "Parody": "Пародия",
          "Police": "Полиция",
          "Psychological": "Психологический",
          "Romance": "Романтика",
          "Samurai": "Самурайский",
          "School": "Школьный",
          "Sci-Fi": "Научная фантастика",
          "Seinen": "Сейнэн",
          "Shoujo": "Сёдзё",
          "Shoujo Ai": "Сёдзё-ай",
          "Shounen": "Сёнэн",
          "Shounen Ai": "Сёнэн-ай",
          "Slice of Life": "Повседневность",
          "Space": "Космос",
          "Sports": "Спорт",
          "Super Power": "Суперсила",
          "Supernatural": "Сверхъестественное",
          "Thriller": "Триллер",
          "Erotica": "Эротика",
          "Hentai": "Хентай",
          "Yaoi": "Яой",
          "Yuri": "Юри",
          "Gourmet": "Гурман",
          "Work Life": "Трудяги",
          "Vampire": "Вампиры"
        };

        var filteredResponse = response.filter(function (item) {
          return item.entry_type === "Anime";
        }).map(function (item) {
          return Object.assign({}, item, {
            title: genreTranslations[item.name] || item.name,
            name: undefined
          });
        });
        filters.kind = {
          title: 'Жанр',
          items: filteredResponse
        };
      });
      filters.AnimeKindEnum = {
        title: 'Тип',
        items: [{
          title: "ТВ Сериал",
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
          title: "ТВ Спешл",
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
          title: "Онгоинг",
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
      function getCurrentSeason(date) {
        var month = date.getMonth();
        var year = date.getFullYear();
        var seasons = ['winter', 'spring', 'summer', 'fall'];
        var seasonTitles = ['Зима', 'Весна', 'Лето', 'Осень'];
        var seasonIndex = Math.floor((month + 1) / 3) % 4;
        return {
          code: `${seasons[seasonIndex]}_${year}`,
          title: `${seasonTitles[seasonIndex]} ${year}`
        };
      }
      function generateDynamicSeasons() {
        var now = new Date();
        var seasons = [];
        for (var i = 1; i >= -3; i--) {
          var nextDate = new Date(now);
          nextDate.setMonth(now.getMonth() + 3 * i);
          seasons.push(getCurrentSeason(nextDate));
        }
        return seasons;
      }
      function generateYearRanges() {
        var currentYear = new Date().getFullYear();
        var ranges = [];

        // Добавляем текущий год и предыдущие 3 года
        for (var year = currentYear; year >= currentYear - 3; year--) {
          ranges.push({
            code: `${year}`,
            title: `${year} год`
          });
        }

        // Генерируем диапазоны по 5 лет, начиная с текущего года
        for (var startYear = currentYear; startYear >= currentYear - 20; startYear -= 5) {
          var endYear = startYear - 5;
          // Проверка на корректность диапазона
          if (endYear <= startYear) {
            ranges.push({
              code: `${endYear}_${startYear}`,
              title: `${startYear}–${endYear} год`
            });
          }
          // Прерываем цикл, если достигли currentYear-20
          if (endYear === currentYear - 20) break;
        }
        return ranges;
      }
      function generateSeasonJSON() {
        var dynamicSeasons = generateDynamicSeasons();
        var yearRanges = generateYearRanges();
        return [...dynamicSeasons, ...yearRanges];
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
        if (query.kind) params.kind = query.kind;
        if (query.status) params.status = query.status;
        if (query.genre) params.genre = query.genre;
        if (query.sort) params.sort = query.sort;
        if (query.seasons) params.seasons = query.seasons;
        Lampa.Activity.push(params);
      }
      serverElement.on('hover:enter', function () {
        mainMenu();
      });
      var homeElement = head.find('.Shikimori__home');
      homeElement.on('hover:enter', function () {
        Lampa.Activity.push({
          url: '',
          title: 'Shikimori',
          component: 'Shikimori',
          page: 1
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
    this.body = function (data) {
      data.forEach(function (anime) {
        var item = new Card(anime, userLang);
        item.render(true).on("hover:focus", function () {
          last = item.render()[0];
          active = items.indexOf(item);
          scroll.update(items[active].render(true), true);
        }).on("hover:enter", function () {
          API.search(anime);
        });
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
          if (Navigator.canmove("left")) Navigator.move("left");else Lampa.Controller.toggle("menu");
        },
        right: function right() {
          Navigator.move("right");
        },
        up: function up() {
          if (Navigator.canmove("up")) Navigator.move("up");else Lampa.Controller.toggle("head");
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

  // Добавление кнопки в меню
  function add() {
    var button = $("<li class=\"menu__item selector\">\n            <div class=\"menu__ico icon\">\n                <img src=\"https://kartmansms.github.io/testing/icons/Shiki_icon.svg\" class=\"icon\" />\n            </div>\n            <div class=\"menu__text\">Shikimori</div>\n        </li>");
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

  // Инициализация плагина
  function startPlugin() {
    window.plugin_shikimori_ready = true;
    var manifest = {
      type: "other",
      version: "1.0",
      name: "LKE Shikimori",
      description: "Добавляет каталог Shikimori",
      component: "Shikimori"
    };

    // Регистрация компонентов и шаблонов
    Lampa.Manifest.plugins = manifest;
    Lampa.Template.add('ShikimoriStyle', "<style>\n            .Shikimori-catalog--list.category-full{-webkit-box-pack:justify !important;-webkit-justify-content:space-between !important;-ms-flex-pack:justify !important;justify-content:space-between !important}.Shikimori-head.torrent-filter{margin-left:1.5em}.Shikimori.card__type{background:#ff4242;color:#fff}.Shikimori .card__season{position:absolute;left:-0.8em;top:3.4em;padding:.4em .4em;background:#05f;color:#fff;font-size:.8em;-webkit-border-radius:.3em;border-radius:.3em}.Shikimori .card__status{position:absolute;left:-0.8em;bottom:1em;padding:.4em .4em;background:#ffe216;color:#000;font-size:.8em;-webkit-border-radius:.3em;border-radius:.3em}.Shikimori.card__season.no-season{display:none}\n        </style>");
    Lampa.Template.add("Shikimori-Card", "<div class=\"Shikimori card selector layer--visible layer--render\">\n                <div class=\"Shikimori card__view\">\n                    <img src=\"{img}\" class=\"Shikimori card__img\" />\n                    <div class=\"Shikimori card__type\">{type}</div>\n                    <div class=\"Shikimori card__vote\">{rate}</div>\n                    <div class=\"Shikimori card__season\">{season}</div>\n                    <div class=\"Shikimori card__status\">{status}</div>\n                </div>\n                <div class=\"Shikimori card__title\">{title}</div>\n            </div>");
    Lampa.Component.add(manifest.component, Component$1);
    $('body').append(Lampa.Template.get('ShikimoriStyle', {}, true));
    if (window.appready) add();else {
      Lampa.Listener.follow("app", function (e) {
        if (e.type === "ready") add();
      });
    }
  }

  // Запуск плагина при готовности
  if (!window.plugin_shikimori_ready) startPlugin();

})();