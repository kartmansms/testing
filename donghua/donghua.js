/**
 * @fileoverview Плагин «Дунхуа» для Lampa
 *
 * @description
 * Каталог китайской анимации (донхуа) с источником данных TMDB.
 * Добавляет раздел «Дунхуа» в главное меню приложения.
 *
 * @requires Lampa.InteractionMain
 * @requires Lampa.InteractionCategory
 * @requires Lampa.Component
 * @requires Lampa.Activity
 * @requires Lampa.Reguest
 * @requires Lampa.Status
 * @requires Lampa.TMDB
 * @requires Lampa.Storage
 * @requires Lampa.Search
 * @requires Lampa.Utils
 * @requires jQuery ($)
 *
 * @version 1.0.0
 * @author dunghua plugin
 *
 * @example
 * // Установка: Настройки → Расширения → Добавить плагин
 * // URL: https://your-host.com/donghua.js
 *
 * @changelog
 * - 1.0.0: Первая версия. 11 категорий TMDB, поиск, фильтр по годам.
 */
(function () {
    'use strict';

    /**
     * Объект локализации плагина
     * @type {Object.<string, Object>}
     */
    var TRANSLATIONS = {
        'ru': {
            title: 'Дунхуа',
            categories: {
                popular: 'Популярные',
                new_releases: 'Новые',
                top_rated: 'Лучшие',
                completed: 'Завершённые',
                ongoing: 'Онгоинг',
                fantasy: 'Фэнтези',
                action: 'Экшн',
                romance: 'Романтические',
                modern: 'Современные',
                historical: 'Исторические',
                comedy: 'Комедийные'
            },
            search_hint: 'Поиск китайских комиксов и анимации...'
        },
        'en': {
            title: 'Donghua',
            categories: {
                popular: 'Popular',
                new_releases: 'New Releases',
                top_rated: 'Top Rated',
                completed: 'Completed',
                ongoing: 'Ongoing',
                fantasy: 'Fantasy',
                action: 'Action',
                romance: 'Romance',
                modern: 'Modern',
                historical: 'Historical',
                comedy: 'Comedy'
            },
            search_hint: 'Search Chinese comics and animation...'
        }
    };

    /**
     * Получить перевод по ключу
     * @param {string} key - Ключ перевода (точечная нотация, например 'categories.popular')
     * @returns {string} Переведённая строка или ключ, если перевод не найден
     */
    function t(key) {
        var lang = (Lampa.Storage.get('language', 'ru') || 'ru').toLowerCase();
        if (!TRANSLATIONS[lang]) lang = 'ru';

        var keys = key.split('.');
        var val = TRANSLATIONS[lang];
        for (var i = 0; i < keys.length; i++) {
            if (val && val[keys[i]] !== undefined) {
                val = val[keys[i]];
            } else {
                val = TRANSLATIONS['ru'];
                for (var j = 0; j < keys.length; j++) {
                    if (val && val[keys[j]] !== undefined) val = val[keys[j]];
                    else return key;
                }
                break;
            }
        }
        return val;
    }

    var ICON_DONGHUA = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15l3.5-4.5 2.5 3.01L14.5 9l4.5 6H5z"/></svg>';

    var TMDB_ENDPOINT = 'discover/tv';

    var BASE_PARAMS = { with_original_language: 'zh', with_genres: '16' };

    var DONGHUA_CATEGORIES = [
        { key: 'popular', params: { sort_by: 'popularity.desc', vote_count_gte: '10' } },
        { key: 'new_releases', params: { sort_by: 'first_air_date.desc', vote_count_gte: '3' } },
        { key: 'top_rated', params: { sort_by: 'vote_average.desc', vote_average_gte: '7.0', vote_count_gte: '100' } },
        { key: 'completed', params: { sort_by: 'vote_average.desc', with_status: '0', vote_count_gte: '20' } },
        { key: 'ongoing', params: { sort_by: 'popularity.desc', with_status: '0', vote_count_gte: '5' } },
        { key: 'fantasy', params: { with_genres: '16,10765', sort_by: 'popularity.desc', vote_count_gte: '10' } },
        { key: 'action', params: { with_genres: '16,10759', sort_by: 'popularity.desc', vote_count_gte: '10' } },
        { key: 'romance', params: { with_genres: '16,10749', sort_by: 'popularity.desc', vote_count_gte: '10' } },
        { key: 'modern', params: { sort_by: 'popularity.desc', without_genres: '10765,10768', vote_count_gte: '10' } },
        { key: 'historical', params: { with_genres: '16,18', sort_by: 'popularity.desc', vote_count_gte: '10' } },
        { key: 'comedy', params: { with_genres: '16,35', sort_by: 'popularity.desc', vote_count_gte: '10' } }
    ];

    /**
     * Построить URL для API TMDB
     * @param {string} endpoint - Эндпоинт API (например 'discover/tv')
     * @param {Object} [extraParams] - Дополнительные параметры запроса
     * @returns {string} Полный URL запроса
     */
    function buildTmdbUrl(endpoint, extraParams) {
        var params = ['api_key=' + Lampa.TMDB.key(), 'language=' + (Lampa.Storage.get('language', 'ru') || 'ru')];

        if (extraParams) {
            for (var key in extraParams) {
                var val = extraParams[key];
                if (key === 'vote_count_gte') params.push('vote_count.gte=' + val);
                else if (key === 'vote_average_gte') params.push('vote_average.gte=' + val);
                else if (key === 'with_status') params.push('with_status=' + val);
                else params.push(key + '=' + val);
            }
        }

        return Lampa.TMDB.api(endpoint + '?' + params.join('&'));
    }

    function buildSearchUrl(query) {
        return buildTmdbUrl('search/tv', { query: query, with_original_language: 'zh', page: '1' });
    }

    /**
     * Главный компонент — отображает все категории донхуа
     * @param {Object} object - Параметры активности
     * @returns {Lampa.InteractionMain} Компонент главной страницы
     */
    function DonghuaMain(object) {
        var comp = new Lampa.InteractionMain(object);

        comp.create = function () {
            var _this = this;
            this.activity.loader(true);

            var categories = DONGHUA_CATEGORIES;
            var network = new Lampa.Reguest();
            var status = new Lampa.Status(categories.length);

            status.onComplite = function () {
                var fulldata = [];
                var keys = Object.keys(status.data).sort(function (a, b) { return a - b; });

                for (var i = 0; i < keys.length; i++) {
                    var data = status.data[keys[i]];
                    if (data && data.results && data.results.length) {
                        var cat = categories[parseInt(keys[i])];
                        Lampa.Utils.extendItemsParams(data.results, { style: { name: 'wide' } });
                        fulldata.push({
                            title: t('categories.' + cat.key),
                            results: data.results,
                            url: TMDB_ENDPOINT,
                            params: Object.assign({}, BASE_PARAMS, cat.params),
                            service_id: object.service_id
                        });
                    }
                }

                if (fulldata.length) {
                    _this.build(fulldata);
                    _this.activity.loader(false);
                } else {
                    _this.empty();
                }
            };

            categories.forEach(function (cat, index) {
                var url = buildTmdbUrl(TMDB_ENDPOINT, Object.assign({}, BASE_PARAMS, cat.params));
                network.silent(url, function (json) {
                    status.append(index.toString(), json);
                }, function () {
                    status.error();
                });
            });

            return this.render();
        };

        comp.onMore = function (data) {
            Lampa.Activity.push({
                url: data.url,
                params: data.params,
                title: data.title,
                component: 'donghua_view',
                page: 1
            });
        };

        return comp;
    }

    /**
     * Компонент категории — список фильмов/сериалов с пагинацией
     * @param {Object} object - Параметры с url, params, title
     * @returns {Lampa.InteractionCategory} Компонент списка
     */
    function DonghuaView(object) {
        var comp = new Lampa.InteractionCategory(object);
        var network = new Lampa.Reguest();

        function buildUrl(page) {
            var params = {};
            if (object.params) {
                for (var key in object.params) {
                    params[key] = object.params[key];
                }
            }
            params.page = page;
            return buildTmdbUrl(object.url, params);
        }

        comp.create = function () {
            var _this = this;
            network.silent(buildUrl(1), function (json) {
                _this.build(json);
            }, this.empty.bind(this));
        };

        comp.nextPageReuest = function (object, resolve, reject) {
            network.silent(buildUrl(object.page), resolve, reject);
        };

        return comp;
    }

    /**
     * Компонент поиска донхуа через TMDB
     * @returns {Lampa.InteractionCategory} Компонент результатов поиска
     */
    function DonghuaSearch() {
        var comp = new Lampa.InteractionCategory({
            search: true,
            query: ''
        });
        var network = new Lampa.Reguest();

        comp.create = function () {
            this.activity.loader(false);
            return this.render();
        };

        comp.search = function () {
            var _this = this;
            var query = Lampa.Storage.get('donghua_search_query', '');

            if (!query) return;

            _this.activity.loader(true);

            var url = buildSearchUrl(query);

            network.silent(url, function (json) {
                _this.activity.loader(false);
                if (json && json.results && json.results.length) {
                    _this.build(json);
                } else {
                    _this.empty();
                }
            }, function () {
                _this.activity.loader(false);
                _this.empty();
            });
        };

        return comp;
    }

    /**
     * Компонент фильтра по годам
     * @param {Object} object - Параметры с year
     * @returns {Lampa.InteractionCategory} Компонент списка по годам
     */
    function DonghuaYears(object) {
        var comp = new Lampa.InteractionCategory(object);
        var network = new Lampa.Reguest();

        function buildUrl(page) {
            var year = object.year || new Date().getFullYear();
            return buildTmdbUrl('discover/tv', {
                with_original_language: 'zh',
                with_genres: '16',
                sort_by: 'popularity.desc',
                first_air_date_year: year,
                vote_count_gte: '3',
                page: page
            });
        }

        comp.create = function () {
            var _this = this;
            network.silent(buildUrl(1), function (json) {
                _this.build(json);
            }, this.empty.bind(this));
        };

        comp.nextPageReuest = function (object, resolve, reject) {
            network.silent(buildUrl(object.page), resolve, reject);
        };

        return comp;
    }

    /**
     * Добавить источник поиска в глобальный поиск Lampa
     * Фильтрует результаты по китайскому языку (zh)
     */
    function addSearchSource() {
        var network = new Lampa.Reguest();

        Lampa.Search.addSource({
            title: 'Дунхуа',
            search: function (params, onComplite) {
                var url = buildSearchUrl(params.query);

                network.silent(url, function (json) {
                    if (json && json.results) {
                        var items = json.results.map(function (item) {
                            item.title = item.name || item.original_name || item.title;
                            item.search_after = true;
                            item.component = 'full_torrent';
                            item.source = 'tmdb';
                            return item;
                        });
                        onComplite(items);
                    } else {
                        onComplite([]);
                    }
                }, function () {
                    onComplite([]);
                });
            },
            onCancel: network.clear.bind(network)
        });
    }

    /**
     * Добавить меню выбора года в шаблон
     * Годы от текущего до 2000
     */
    function addYearsMenu() {
        var currentYear = new Date().getFullYear();
        var years = [];
        for (var y = currentYear; y >= 2000; y--) years.push(y);

        var yearsHtml = '';
        for (var i = 0; i < years.length; i++) {
            yearsHtml += '<div class="menu__item selector" data-year="' + years[i] + '">' +
                '<div class="menu__text">' + years[i] + '</div></div>';
        }

        Lampa.Template.add('donghua_years_menu', '<div class="donghua-years">' + yearsHtml + '</div>');
    }

    /**
     * Внедрить пункт меню «Дунхуа» в главное меню
     * Позиция: после раздела «Аниме»
     */
    function injectMenu() {
        var menu = $('.menu .menu__list').eq(0);
        if (!menu.length) return;
        if (menu.find('.menu__item[data-sid="donghua"]').length) return;

        var btn = $('<li class="menu__item selector" data-action="donghua_action" data-sid="donghua">' +
            '<div class="menu__ico">' + ICON_DONGHUA + '</div>' +
            '<div class="menu__text">' + t('title') + '</div>' +
            '</li>');

        btn.on('hover:enter', function () {
            Lampa.Activity.push({
                title: t('title'),
                component: 'donghua_main',
                service_id: 'donghua',
                page: 1
            });
        });

        var animeBtn = menu.find('.menu__item[data-sid="anime"]');
        if (animeBtn.length) {
            btn.insertAfter(animeBtn);
        } else {
            menu.append(btn);
        }
    }

    /**
     * Добавить CSS-стили плагина
     */
    function addStyles() {
        if ($('#donghua-css').length) return;
        $('head').append('<style id="donghua-css">' +
            '.donghua_main .card--wide { width: 18.3em !important; }' +
            '.donghua_view .card--wide { width: 18.3em !important; }' +
            '.donghua_view .category-full { padding-top: 1em; }' +
            '.menu__ico svg { width: 1.4em; height: 1.4em; }' +
            '</style>');
    }

    /**
     * Инициализация плагина
     * Регистрирует компоненты, стили, поиск, меню
     */
    function startPlugin() {
        if (window.plugin_donghua_ready) return;
        window.plugin_donghua_ready = true;

        Lampa.Component.add('donghua_main', DonghuaMain);
        Lampa.Component.add('donghua_view', DonghuaView);
        Lampa.Component.add('donghua_search', DonghuaSearch);
        Lampa.Component.add('donghua_years', DonghuaYears);

        addStyles();
        addSearchSource();
        addYearsMenu();

        injectMenu();

        setInterval(function () {
            if (window.appready && $('.menu .menu__list').eq(0).length) {
                injectMenu();
            }
        }, 4000);
    }

    if (window.appready) {
        startPlugin();
    } else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();
