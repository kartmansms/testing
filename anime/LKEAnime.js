(function () {
    'use strict';

    // Основная функция для выполнения запроса к TMDB API
    function main(params, oncomplite, onerror) {
        $(document).ready(function () {
            var limit = params.isTop100 ? 100 : (params.limit || 20);
            var page = params.page || 1;
            var apiKey = "4ef0d7355d9ffb5151e987764708ce96";
            var baseUrl = 'https://api.themoviedb.org/3/';
            var queryParams = `api_key=${apiKey}&language=${Lampa.Storage.field('language')}&page=${page}&with_keywords=210024`; // 210024 - ключевое слово "аниме" в TMDB

            if (params.sort) {
                queryParams += `&sort_by=${params.sort}`;
            }
            if (params.type) {
                queryParams += `&with_type=${params.type}`;
            }
            if (params.status) {
                queryParams += `&with_status=${params.status}`;
            }
            if (params.genre) {
                queryParams += `&with_genres=${params.genre}`;
            }
            if (params.releaseYear) {
                queryParams += `&primary_release_year=${params.releaseYear}`;
            }

            var url = `${baseUrl}discover/tv?${queryParams}`;

            if (params.isTop100) {
                var requests = [
                    $.ajax({ url: url.replace(`page=${page}`, 'page=1'), method: 'GET' }),
                    $.ajax({ url: url.replace(`page=${page}`, 'page=2'), method: 'GET' })
                ];
                Promise.all(requests).then(function (responses) {
                    var allResults = responses[0].results.concat(responses[1].results);
                    oncomplite(allResults.slice(0, 100));
                }).catch(function (error) {
                    console.error('Ошибка:', error);
                    onerror(error);
                });
            } else {
                $.ajax({
                    url: url,
                    method: 'GET',
                    success: function (response) {
                        oncomplite(response.results);
                    },
                    error: function (error) {
                        console.error('Ошибка:', error);
                        onerror(error);
                    }
                });
            }
        });
    }

    // Поиск дополнительной информации об аниме
    function search(animeData) {
        var apiKey = "4ef0d7355d9ffb5151e987764708ce96";
        var apiUrl = `https://api.themoviedb.org/3/tv/${animeData.id}?api_key=${apiKey}&language=${Lampa.Storage.field('language')}`;

        $.get(apiUrl, function (response) {
            Lampa.Activity.push({
                url: '',
                component: 'full',
                id: response.id,
                method: 'tv',
                card: response
            });
        }).fail(function (error) {
            console.error('Ошибка при поиске на TMDB:', error);
            Lampa.Noty.show('Не удалось найти информацию об аниме');
        });
    }

    var API = {
        main: main,
        search: search
    };

    // Класс для создания карточки аниме
    function Card(data, userLang) {
        var typeTranslations = {
            0: 'ТВ Сериал',
            1: 'Фильм',
            2: 'OVA',
            3: 'ONA',
            4: 'Спешл'
        };

        var statusTranslations = {
            0: 'Планируется',
            1: 'В производстве',
            2: 'Выпущено',
            3: 'Отменено'
        };

        var item = Lampa.Template.get("TMDBAnime-Card", {
            img: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
            type: typeTranslations[data.type] || 'ТВ Сериал',
            status: statusTranslations[data.status] || 'Выпущено',
            rate: data.vote_average.toFixed(1),
            title: userLang === 'ru' ? data.name : data.original_name,
            season: data.first_air_date ? data.first_air_date.split('-')[0] : ''
        });

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
        var html = $("<div class='TMDBAnime-module'></div>");
        var head = $("<div class='TMDBAnime-head torrent-filter'><div class='TMDBAnime__home simple-button simple-button--filter selector'>Главная</div><div class='TMDBAnime__top100_tv simple-button simple-button--filter selector'>Топ100_ТВ</div><div class='TMDBAnime__top100_movies simple-button simple-button--filter selector'>Топ100_Фильмы</div><div class='TMDBAnime__top100_ona simple-button simple-button--filter selector'>Топ100_ONA</div><div class='TMDBAnime__search simple-button simple-button--filter selector'>Фильтр</div></div>");
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
            var filters = {
                type: {
                    title: 'Тип',
                    items: [
                        { title: "ТВ Сериал", code: "0" },
                        { title: "Фильм", code: "1" },
                        { title: "OVA", code: "2" },
                        { title: "ONA", code: "3" },
                        { title: "Спешл", code: "4" }
                    ]
                },
                status: {
                    title: 'Статус',
                    items: [
                        { title: "Планируется", code: "0" },
                        { title: "В производстве", code: "1" },
                        { title: "Выпущено", code: "2" },
                        { title: "Отменено", code: "3" }
                    ]
                },
                sort: {
                    title: 'Сортировка',
                    items: [
                        { title: "По популярности", code: "popularity.desc" },
                        { title: "По рейтингу", code: "vote_average.desc" },
                        { title: "По дате выхода", code: "first_air_date.desc" }
                    ]
                },
                genre: {
                    title: 'Жанр',
                    items: [
                        { title: "Экшен", code: "10759" },
                        { title: "Приключения", code: "10759" },
                        { title: "Комедия", code: "35" },
                        { title: "Драма", code: "18" },
                        { title: "Фэнтези", code: "10765" },
                        { title: "Ужасы", code: "27" },
                        { title: "Романтика", code: "10749" },
                        { title: "Научная фантастика", code: "878" }
                    ]
                },
                releaseYear: {
                    title: 'Год выпуска',
                    items: generateYearRanges()
                }
            };

            function generateYearRanges() {
                var currentYear = new Date().getFullYear();
                var ranges = [];
                for (var year = currentYear; year >= currentYear - 20; year--) {
                    ranges.push({ title: `${year}`, code: `${year}` });
                }
                return ranges;
            }

            var serverElement = head.find('.TMDBAnime__search');
            function queryForTMDB() {
                var query = {};
                filters.type.items.forEach(function (a) {
                    if (a.selected) query.type = a.code;
                });
                filters.status.items.forEach(function (a) {
                    if (a.selected) query.status = a.code;
                });
                filters.genre.items.forEach(function (a) {
                    if (a.selected) query.genre = a.code;
                });
                filters.sort.items.forEach(function (a) {
                    if (a.selected) query.sort = a.code;
                });
                filters.releaseYear.items.forEach(function (a) {
                    if (a.selected) query.releaseYear = a.code;
                });
                return query;
            }

            function selected(where) {
                var title = [];
                where.items.forEach(function (a) {
                    if (a.selected) title.push(a.title);
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
                        filters.type,
                        filters.status,
                        filters.genre,
                        filters.sort,
                        filters.releaseYear
                    ],
                    onBack: function () {
                        Lampa.Controller.toggle("content");
                    },
                    onSelect: function (a) {
                        if (a.searchTMDB) {
                            search();
                        } else submenu(a, mainMenu);
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
                if (query.type) params.type = query.type;
                if (query.status) params.status = query.status;
                if (query.genre) params.genre = query.genre;
                if (query.sort) params.sort = query.sort;
                if (query.releaseYear) params.releaseYear = query.releaseYear;
                Lampa.Activity.push(params);
            }

            serverElement.on('hover:enter', function () {
                mainMenu();
            });

            var homeElement = head.find('.TMDBAnime__home');
            homeElement.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'TMDB Anime',
                    component: 'TMDBAnime',
                    page: 1
                });
            });

            var top100TvElement = head.find('.TMDBAnime__top100_tv');
            top100TvElement.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'TMDB Топ100_ТВ',
                    component: 'TMDBAnime',
                    page: 1,
                    sort: 'vote_average.desc',
                    type: '0',
                    status: '2',
                    isTop100: true
                });
            });

            var top100MoviesElement = head.find('.TMDBAnime__top100_movies');
            top100MoviesElement.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'TMDB Топ100_Фильмы',
                    component: 'TMDBAnime',
                    page: 1,
                    sort: 'vote_average.desc',
                    type: '1',
                    status: '2',
                    isTop100: true
                });
            });

            var top100OnaElement = head.find('.TMDBAnime__top100_ona');
            top100OnaElement.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'TMDB Топ100_ONA',
                    component: 'TMDBAnime',
                    page: 1,
                    sort: 'vote_average.desc',
                    type: '3',
                    status: '2',
                    isTop100: true
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
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () {
                    if (Navigator.canmove("left")) Navigator.move("left");
                    else Lampa.Controller.toggle("menu");
                },
                right: function () {
                    Navigator.move("right");
                },
                up: function () {
                    if (Navigator.canmove("up")) Navigator.move("up");
                    else Lampa.Controller.toggle("head");
                },
                down: function () {
                    if (Navigator.canmove("down")) Navigator.move("down");
                },
                back: this.back
            });
            Lampa.Controller.toggle("content");
        };

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
        var button = $("<li class=\"menu__item selector\">\n" +
            "<div class=\"menu__ico\">\n" +
            "<svg fill=\"currentColor\" viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z\"/></svg>\n" +
            "</div>\n" +
            "<div class=\"menu__text\">TMDB Anime</div>\n" +
            "</li>");
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
        Lampa.Template.add('TMDBAnimeStyle', "<style>\n" +
            ".TMDBAnime-catalog--list.category-full{-webkit-box-pack:justify !important;-webkit-justify-content:space-between !important;-ms-flex-pack:justify !important;justify-content:space-between !important}\n" +
            ".TMDBAnime-head.torrent-filter{margin-left:1.5em}\n" +
            ".TMDBAnime.card__type{background:#ff4242;color:#fff}\n" +
            ".TMDBAnime .card__season{position:absolute;left:-0.8em;top:3.4em;padding:.4em .4em;background:#05f;color:#fff;font-size:.8em;-webkit-border-radius:.3em;border-radius:.3em}\n" +
            ".TMDBAnime .card__status{position:absolute;left:-0.8em;bottom:1em;padding:.4em .4em;background:#ffe216;color:#000;font-size:.8em;-webkit-border-radius:.3em;border-radius:.3em}\n" +
            "</style>");
        Lampa.Template.add("TMDBAnime-Card", "<div class=\"TMDBAnime card selector layer--visible layer--render\">\n" +
            "<div class=\"TMDBAnime card__view\">\n" +
            "<img src=\"{img}\" class=\"TMDBAnime card__img\" />\n" +
            "<div class=\"TMDBAnime card__type\">{type}</div>\n" +
            "<div class=\"TMDBAnime card__vote\">{rate}</div>\n" +
            "<div class=\"TMDBAnime card__season\">{season}</div>\n" +
            "<div class=\"TMDBAnime card__status\">{status}</div>\n" +
            "</div>\n" +
            "<div class=\"TMDBAnime card__title\">{title}</div>\n" +
            "</div>");
        Lampa.Component.add(manifest.component, Component$1);
        $('body').append(Lampa.Template.get('TMDBAnimeStyle', {}, true));
        if (window.appready) add();
        else {
            Lampa.Listener.follow("app", function (e) {
                if (e.type === "ready") add();
            });
        }
    }

    if (!window.plugin_tmdbanime_ready) startPlugin();
})();
