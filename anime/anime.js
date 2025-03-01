(function () {
    'use strict';

    // Основная функция для выполнения запроса к TMDB API
    function main(params, oncomplete, onerror) {
        $(document).ready(function () {
            var apiKey = "4ef0d7355d9ffb5151e987764708ce96";
            var limit = params.isTop100 ? 100 : (params.limit || 20);
            var apiUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=${Lampa.Storage.field('language')}&with_keywords=210024|222243&page=${params.page}&sort_by=${params.sort || 'first_air_date.desc'}`;

            if (params.genre) apiUrl += `&with_genres=${params.genre}`;
            if (params.status) apiUrl += `&with_status=${params.status}`;
            if (params.seasons) apiUrl += `&first_air_date_year=${params.seasons}`;

            if (params.isTop100) {
                var requests = [
                    $.ajax({ url: apiUrl.replace(`page=${params.page}`, "page=1") }),
                    $.ajax({ url: apiUrl.replace(`page=${params.page}`, "page=2") })
                ];
                Promise.all(requests).then(function (responses) {
                    var allAnimes = responses[0].results.concat(responses[1].results);
                    oncomplete(allAnimes);
                }).catch(function (error) {
                    console.error('Ошибка:', error);
                    onerror(error);
                });
            } else {
                $.ajax({
                    url: apiUrl,
                    method: 'GET',
                    success: function (response) {
                        oncomplete(response.results);
                    },
                    error: function (error) {
                        console.error('Ошибка:', error);
                        onerror(error);
                    }
                });
            }
        });
    }

    // Поиск информации об аниме через TMDB API
    function search(animeData) {
        var apiKey = "4ef0d7355d9ffb5151e987764708ce96";
        var apiUrl = `https://api.themoviedb.org/3/tv/${animeData.id}?api_key=${apiKey}&language=${Lampa.Storage.field('language')}`;
        
        $.get(apiUrl, function (response) {
            processResults(response);
        }).fail(function (jqXHR) {
            console.error('Ошибка при получении данных с TMDB:', jqXHR.status);
        });

        function processResults(response) {
            Lampa.Activity.push({
                url: '',
                component: 'full',
                id: response.id,
                method: 'tv',
                card: response
            });
        }
    }

    var API = { main: main, search: search };

    // Класс для создания карточки аниме
    function Card(data, userLang) {
        var statusTranslations = {
            'Returning Series': 'Онгоинг',
            'Ended': 'Вышло',
            'In Production': 'Анонс'
        };

        var item = Lampa.Template.get("TMDBAnime-Card", {
            img: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
            type: 'ТВ Сериал',
            status: statusTranslations[data.status] || data.status,
            rate: data.vote_average,
            title: userLang === 'ru' ? data.name : data.original_name,
            season: data.first_air_date ? data.first_air_date.split('-')[0] : ''
        });

        this.render = function () { return item; };
        this.destroy = function () { item.remove(); };
    }

    // Основной компонент для отображения каталога
    function Component(object) {
        var userLang = Lampa.Storage.field('language');
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = [];
        var html = $("<div class='TMDBAnime-module'></div>");
        var head = $("<div class='TMDBAnime-head torrent-filter'><div class='TMDBAnime__home simple-button simple-button--filter selector'>Главная</div><div class='TMDBAnime__search simple-button simple-button--filter selector'>Фильтры</div></div>");
        var body = $('<div class="TMDBAnime-catalog--list category-full"></div>');
        var active, last;

        this.create = function () {
            API.main(object, this.build.bind(this), this.empty.bind(this));
        };

        this.build = function (result) {
            var _this = this;
            scroll.minus();
            scroll.onWheel = function (step) {
                if (!Lampa.Controller.own(_this)) _this.start();
                if (step > 0) Navigator.move('down'); else Navigator.move('up');
            };
            if (!object.isTop100) {
                scroll.onEnd = function () {
                    object.page++;
                    API.main(object, _this.build.bind(_this), _this.empty.bind(_this));
                };
            }

            this.headeraction();
            this.body(result);
            scroll.append(head);
            scroll.append(body);
            html.append(scroll.render(true));
            this.activity.loader(false);
            this.activity.toggle();
        };

        this.headeraction = function () {
            var filters = {};
            $.ajax({
                url: "https://api.themoviedb.org/3/genre/tv/list?api_key=4ef0d7355d9ffb5151e987764708ce96&language=" + Lampa.Storage.field('language'),
                method: "GET"
            }).done(function (response) {
                filters.genre = {
                    title: 'Жанр',
                    items: response.genres.map(function (item) {
                        return { title: item.name, code: item.id };
                    })
                };
            });

            filters.status = {
                title: 'Статус',
                items: [
                    { title: "Анонс", code: "In Production" },
                    { title: "Онгоинг", code: "Returning Series" },
                    { title: "Вышло", code: "Ended" }
                ]
            };

            filters.sort = {
                title: 'Сортировка',
                items: [
                    { title: "По рейтингу", code: "vote_average.desc" },
                    { title: "По популярности", code: "popularity.desc" },
                    { title: "По дате выхода", code: "first_air_date.desc" }
                ]
            };

            function generateYearRanges() {
                var currentYear = new Date().getFullYear();
                var ranges = [];
                for (var year = currentYear; year >= currentYear - 20; year--) {
                    ranges.push({ code: `${year}`, title: `${year} год` });
                }
                return ranges;
            }

            filters.seasons = {
                title: 'Год',
                items: generateYearRanges()
            };

            var homeElement = head.find('.TMDBAnime__home');
            homeElement.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'TMDB Anime',
                    component: 'TMDBAnime',
                    page: 1
                });
            });

            var serverElement = head.find('.TMDBAnime__search');
            function queryForTMDB() {
                var query = {};
                filters.genre.items.forEach(function (a) { if (a.selected) query.genre = a.code; });
                filters.status.items.forEach(function (a) { if (a.selected) query.status = a.code; });
                filters.sort.items.forEach(function (a) { if (a.selected) query.sort = a.code; });
                filters.seasons.items.forEach(function (a) { if (a.selected) query.seasons = a.code; });
                return query;
            }

            function selected(where) {
                var title = [];
                where.items.forEach(function (a) { if (a.selected) title.push(a.title); });
                where.subtitle = title.length ? title.join(', ') : Lampa.Lang.translate('nochoice');
            }

            function select(where, a) {
                where.forEach(function (element) { element.selected = false; });
                a.selected = true;
            }

            function submenu(item, main) {
                Lampa.Select.show({
                    title: item.title,
                    items: item.items,
                    onBack: main,
                    onSelect: function (a) {
                        select(item.items, a);
                        main();
                    }
                });
            }

            function mainMenu() {
                for (var i in filters) selected(filters[i]);
                Lampa.Select.show({
                    title: 'Фильтры',
                    items: [
                        { title: Lampa.Lang.translate('search_start'), searchTMDB: true },
                        filters.status, filters.genre, filters.sort, filters.seasons
                    ],
                    onBack: function () { Lampa.Controller.toggle("content"); },
                    onSelect: function (a) {
                        if (a.searchTMDB) search(); else submenu(a, mainMenu);
                    }
                });
            }

            function search() {
                var query = queryForTMDB();
                var params = {
                    url: '',
                    title: 'TMDB Anime',
                    component: 'TMDBAnime',
                    page: 1
                };
                if (query.genre) params.genre = query.genre;
                if (query.status) params.status = query.status;
                if (query.sort) params.sort = query.sort;
                if (query.seasons) params.seasons = query.seasons;
                Lampa.Activity.push(params);
            }

            serverElement.on('hover:enter', function () { mainMenu(); });
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
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () { if (Navigator.canmove("left")) Navigator.move("left"); else Lampa.Controller.toggle("menu"); },
                right: function () { Navigator.move("right"); },
                up: function () { if (Navigator.canmove("up")) Navigator.move("up"); else Lampa.Controller.toggle("head"); },
                down: function () { if (Navigator.canmove("down")) Navigator.move("down"); },
                back: this.back
            });
            Lampa.Controller.toggle("content");
        };

        this.render = function (js) { return js ? html : $(html); };
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
        var button = $("<li class=\"menu__item selector\"><div class=\"menu__ico\"><svg>...</svg></div><div class=\"menu__text\">TMDB Anime</div></li>");
        button.on("hover:enter", function () {
            Lampa.Activity.push({
                url: '',
                title: 'TMDB Anime',
                component: 'TMDBAnime',
                page: 1
            });
        });
        $(".menu .menu__list").eq(0).append(button);
    }

    // Инициализация плагина
    function startPlugin() {
        window.plugin_tmdbanime_ready = true;
        var manifest = {
            type: "other",
            version: "1.0",
            name: "LKE TMDB Anime",
            description: "Добавляет каталог аниме с TMDB",
            component: "TMDBAnime"
        };

        Lampa.Manifest.plugins = manifest;
        Lampa.Template.add('TMDBAnimeStyle', "<style>.TMDBAnime-catalog--list.category-full{justify-content:space-between !important}.TMDBAnime-head.torrent-filter{margin-left:1.5em}.TMDBAnime.card__type{background:#ff4242;color:#fff}.TMDBAnime .card__season{position:absolute;left:-0.8em;top:3.4em;padding:.4em .4em;background:#05f;color:#fff;font-size:.8em;border-radius:.3em}.TMDBAnime .card__status{position:absolute;left:-0.8em;bottom:1em;padding:.4em .4em;background:#ffe216;color:#000;font-size:.8em;border-radius:.3em}</style>");
        Lampa.Template.add("TMDBAnime-Card", "<div class=\"TMDBAnime card selector layer--visible layer--render\"><div class=\"TMDBAnime card__view\"><img src=\"{img}\" class=\"TMDBAnime card__img\" /><div class=\"TMDBAnime card__type\">{type}</div><div class=\"TMDBAnime card__vote\">{rate}</div><div class=\"TMDBAnime card__season\">{season}</div><div class=\"TMDBAnime card__status\">{status}</div></div><div class=\"TMDBAnime card__title\">{title}</div></div>");
        Lampa.Component.add(manifest.component, Component);
        $('body').append(Lampa.Template.get('TMDBAnimeStyle', {}, true));
        if (window.appready) add(); else {
            Lampa.Listener.follow("app", function (e) { if (e.type === "ready") add(); });
        }
    }

    if (!window.plugin_tmdbanime_ready) startPlugin();
})();
