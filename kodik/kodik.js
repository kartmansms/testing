/**
 * @fileoverview Плагин «Kodik Catalog» для Lampa
 * Каталог аниме и дорам из Kodik API с фильтрами.
 * Автоматически получает API-токен из репозитория AnimeParsers.
 *
 * @requires Lampa.InteractionMain
 * @requires Lampa.InteractionCategory
 * @requires Lampa.Component
 * @requires Lampa.Activity
 * @requires Lampa.Reguest
 * @requires Lampa.Status
 * @requires Lampa.Storage
 * @requires Lampa.Utils
 * @requires jQuery ($)
 */
(function () {
    'use strict';

    var API_BASE = 'https://kodik-api.com';
    var TOKENS_URL = 'https://raw.githubusercontent.com/YaNesyTortiK/AnimeParsers/main/kdk_tokns/tokens.json';

    var TYPES = [
        { key: 'anime', title: 'Аниме фильмы', types: 'anime' },
        { key: 'anime_serial', title: 'Аниме сериалы', types: 'anime_serial' },
        { key: 'movie', title: 'Фильмы', types: 'movie' },
        { key: 'drama_series', title: 'Дорамы', types: 'drama_series,drama_movie' }
    ];

    var cachedToken = null;

    function decryptToken(tkn) {
        try {
            var half = Math.floor(tkn.length / 2);
            var p1 = atob(tkn.substring(0, half).split('').reverse().join(''));
            var p2 = atob(tkn.substring(half).split('').reverse().join(''));
            return p2 + p1;
        } catch (e) {
            return null;
        }
    }

    function getCachedToken() {
        if (cachedToken) return cachedToken;
        var stored = Lampa.Storage.get('kodik_token', null);
        var ts = Lampa.Storage.get('kodik_token_ts', 0);
        if (stored && Date.now() - ts < 24 * 60 * 60 * 1000) {
            cachedToken = stored;
            return stored;
        }
        return null;
    }

    function fetchToken(callback) {
        var network = new Lampa.Reguest();
        network.silent(TOKENS_URL, function (json) {
            try {
                var data = typeof json === 'string' ? JSON.parse(json) : json;
                var sources = ['stable', 'unstable'];
                for (var s = 0; s < sources.length; s++) {
                    var list = data[sources[s]];
                    if (!list || !list.length) continue;
                    for (var i = 0; i < list.length; i++) {
                        var entry = list[i];
                        if (entry.functions_availability && entry.functions_availability.search) {
                            var token = decryptToken(entry.tokn);
                            if (token) {
                                cachedToken = token;
                                Lampa.Storage.set('kodik_token', token, true);
                                Lampa.Storage.set('kodik_token_ts', Date.now(), true);
                                callback(token);
                                return;
                            }
                        }
                    }
                }
                callback(null);
            } catch (e) {
                callback(null);
            }
        }, function () {
            callback(null);
        });
    }

    function getToken(callback) {
        var userKey = Lampa.Storage.get('kodik_api_key', '');
        if (userKey) {
            callback(userKey);
            return;
        }
        var cached = getCachedToken();
        if (cached) {
            callback(cached);
            return;
        }
        fetchToken(callback);
    }

    function apiRequest(path, params, success, error) {
        getToken(function (token) {
            if (!token) {
                if (error) error();
                return;
            }
            var url = API_BASE + path + '?token=' + token;
            if (params) {
                for (var k in params) {
                    if (params[k] !== undefined && params[k] !== '') {
                        url += '&' + k + '=' + encodeURIComponent(params[k]);
                    }
                }
            }
            new Lampa.Reguest().silent(url, success, error || function () {});
        });
    }

    function buildUrl(path, params) {
        return API_BASE + path + '?' + Object.keys(params).map(function (k) {
            return k + '=' + encodeURIComponent(params[k]);
        }).join('&');
    }

    function toCard(item) {
        return {
            id: 'kodik_' + item.id,
            title: item.title || item.title_orig || 'Без названия',
            poster: item.poster || item.cover || '',
            year: item.release_year || '',
            source: 'tmdb',
            kodik_id: item.id,
            shikimori_id: item.shikimori_id || '',
            kinopoisk_id: item.kinopoisk_id || '',
            imdb_id: item.imdb_id || ''
        };
    }

    function KodikMain(object) {
        var comp = new Lampa.InteractionMain(object);

        comp.create = function () {
            var _this = this;
            this.activity.loader(true);

            var status = new Lampa.Status(TYPES.length);

            status.onComplite = function () {
                var fulldata = [];
                var keys = Object.keys(status.data).sort(function (a, b) { return a - b; });

                for (var i = 0; i < keys.length; i++) {
                    var data = status.data[keys[i]];
                    if (data && data.results && data.results.length) {
                        var cat = TYPES[parseInt(keys[i])];
                        var items = data.results.map(toCard);
                        Lampa.Utils.extendItemsParams(items, { style: { name: 'wide' } });
                        fulldata.push({
                            title: cat.title,
                            results: items,
                            component: 'kodik_list',
                            kodik_types: cat.types,
                            kodik_sort: 'shikimori_rating',
                            kodik_order: 'desc'
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

            TYPES.forEach(function (cat, index) {
                apiRequest('/list', {
                    types: cat.types,
                    limit: 20,
                    sort: 'shikimori_rating',
                    order: 'desc'
                }, function (json) {
                    status.append(index.toString(), json);
                }, function () {
                    status.error();
                });
            });

            return this.render();
        };

        comp.onMore = function (data) {
            Lampa.Activity.push({
                title: data.title,
                component: 'kodik_list',
                kodik_types: data.kodik_types,
                kodik_sort: data.kodik_sort,
                kodik_order: data.kodik_order,
                page: 1
            });
        };

        return comp;
    }

    function KodikList(object) {
        var comp = new Lampa.InteractionCategory(object);
        var network = new Lampa.Reguest();
        var currentToken = null;
        var currentSort = object.kodik_sort || 'shikimori_rating';
        var currentOrder = object.kodik_order || 'desc';

        function loadPage(page, callback, errback) {
            getToken(function (token) {
                if (!token) { if (errback) errback(); return; }
                currentToken = token;
                var url = buildUrl('/list', {
                    token: token,
                    types: object.kodik_types || 'anime,anime_serial',
                    limit: 20,
                    page: page,
                    sort: currentSort,
                    order: currentOrder
                });
                network.silent(url, function (json) {
                    if (json && json.results) {
                        json.results = json.results.map(toCard);
                    }
                    callback(json);
                }, errback);
            });
        }

        comp.create = function () {
            var _this = this;
            loadPage(1, function (json) {
                if (json && json.results && json.results.length) {
                    Lampa.Utils.extendItemsParams(json.results, { style: { name: 'wide' } });
                    _this.build(json);
                } else {
                    _this.empty();
                }
            }, this.empty.bind(this));
        };

        comp.nextPageReuest = function (obj, resolve, reject) {
            loadPage(obj.page, resolve, reject);
        };

        return comp;
    }

    function addSearchSource() {
        var network = new Lampa.Reguest();

        Lampa.Search.addSource({
            title: 'Kodik',
            params: {},
            search: function (params, onComplite) {
                var query = params.query;
                if (!query || query.length < 2) {
                    onComplite([]);
                    return;
                }

                getToken(function (token) {
                    if (!token) { onComplite([]); return; }

                    var url = buildUrl('/search', {
                        token: token,
                        query: query,
                        limit: 20
                    });

                    network.silent(url, function (json) {
                        if (json && json.results) {
                            var items = json.results.map(function (item) {
                                var card = toCard(item);
                                card.title = item.title || item.title_orig;
                                card.search_after = true;
                                return card;
                            });
                            onComplite([{ results: items }]);
                        } else {
                            onComplite([]);
                        }
                    }, function () {
                        onComplite([]);
                    });
                });
            },
            onCancel: network.clear.bind(network)
        });
    }

    function addStyles() {
        if ($('#kodik-css').length) return;
        $('head').append('<style id="kodik-css">' +
            '.kodik_main .card--wide { width: 18.3em !important; }' +
            '.kodik_list .card--wide { width: 18.3em !important; }' +
            '.kodik_list .category-full { padding-top: 1em; }' +
            '</style>');
    }

    function injectMenu() {
        var menu = $('.menu .menu__list').eq(0);
        if (!menu.length) return;
        if (menu.find('.menu__item[data-sid="kodik"]').length) return;

        var icon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15l3.5-4.5 2.5 3.01L14.5 9l4.5 6H5z"/></svg>';

        var btn = $('<li class="menu__item selector" data-action="kodik_action" data-sid="kodik">' +
            '<div class="menu__ico">' + icon + '</div>' +
            '<div class="menu__text">Kodik</div>' +
            '</li>');

        btn.on('hover:enter', function () {
            Lampa.Activity.push({
                title: 'Kodik',
                component: 'kodik_main',
                service_id: 'kodik',
                page: 1
            });
        });

        var donghuaBtn = menu.find('.menu__item[data-sid="donghua"]');
        if (donghuaBtn.length) {
            btn.insertAfter(donghuaBtn);
        } else {
            var animeBtn = menu.find('.menu__item[data-sid="anime"]');
            if (animeBtn.length) {
                btn.insertAfter(animeBtn);
            } else {
                menu.append(btn);
            }
        }
    }

    function addSettings() {
        if (!Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: 'kodik',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
            name: 'Kodik'
        });

        Lampa.SettingsApi.addParam({
            component: 'kodik',
            param: {
                type: 'title'
            },
            field: {
                name: 'Токен получается автоматически из репозитория AnimeParsers'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'kodik',
            param: {
                name: 'kodik_api_key',
                type: 'input',
                default: '',
                placeholder: 'Оставьте пустым для автополучения'
            },
            field: {
                name: 'API ключ Kodik (необязательно)'
            },
            onChange: function () {
                var key = Lampa.Storage.get('kodik_api_key', '');
                if (key) {
                    cachedToken = key;
                    Lampa.Storage.set('kodik_token', key, true);
                    Lampa.Storage.set('kodik_token_ts', Date.now(), true);
                } else {
                    cachedToken = null;
                    Lampa.Storage.set('kodik_token', '', true);
                }
            }
        });
    }

    function startPlugin() {
        if (window.plugin_kodik_ready) return;
        window.plugin_kodik_ready = true;

        getToken(function (token) {
            if (!token) {
                console.log('Kodik', 'Не удалось получить токен');
                return;
            }

            Lampa.Component.add('kodik_main', KodikMain);
            Lampa.Component.add('kodik_list', KodikList);

            addStyles();
            addSearchSource();
            injectMenu();

            setInterval(function () {
                if (window.appready && $('.menu .menu__list').eq(0).length) {
                    injectMenu();
                }
            }, 4000);
        });
    }

    if (window.appready) {
        addSettings();
        startPlugin();
    } else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                addSettings();
                startPlugin();
            }
        });
    }
})();
