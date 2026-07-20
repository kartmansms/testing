/**
 * Light Family Plugin for Lampa v1.0.0
 *
 * Интеграция каталога аниме lightfamily.online для медиа-центра Lampa.
 * Каталог, поиск, постеры, фильтры.
 *
 * @author kartmansms
 * @license MIT
 */

(function () {
    'use strict';

    if (window.plugin_lightfamily_ready) return;
    window.plugin_lightfamily_ready = true;

    var SETTINGS_KEY = 'lightfamily_settings_v1';
    var BASE_URL_DEFAULT = 'https://lightfamily.online';
    var PAGE_LIMIT = 24;

    // ─── Storage Helpers ───────────────────────────────────────────────

    function storageGet(key, fallback) {
        var value;

        try {
            if (window.Lampa && Lampa.Storage && Lampa.Storage.get) {
                value = Lampa.Storage.get(key, fallback);
                return value === undefined || value === null ? fallback : value;
            }
        } catch (e) {}

        try {
            var raw = localStorage.getItem(key);
            if (raw) {
                try { return JSON.parse(raw); } catch (e) { return fallback; }
            }
            return fallback;
        } catch (err) {
            return fallback;
        }
    }

    function storageSet(key, value) {
        try {
            if (window.Lampa && Lampa.Storage && Lampa.Storage.set) {
                Lampa.Storage.set(key, value);
                return;
            }
        } catch (e) {}

        try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) {}
    }

    // ─── Settings ──────────────────────────────────────────────────────

    function defaults() {
        return {
            base_url: BASE_URL_DEFAULT
        };
    }

    function readSettings() {
        var base = defaults();
        var saved = storageGet(SETTINGS_KEY, {});

        if (!saved || typeof saved !== 'object') saved = {};

        for (var key in saved) {
            if (saved.hasOwnProperty(key)) base[key] = saved[key];
        }

        return base;
    }

    function getBaseUrl() {
        return (readSettings().base_url || BASE_URL_DEFAULT).replace(/\/$/, '');
    }

    // ─── Utilities ─────────────────────────────────────────────────────

    function notify(message) {
        if (window.Lampa && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(message);
        else if (window.console) console.log(message);
    }

    function esc(value) {
        value = value === undefined || value === null ? '' : String(value);
        return value.replace(/[&<>"']/g, function (s) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s];
        });
    }

    function posterUrl(path) {
        if (!path) return '';
        if (/^https?:\/\//.test(path)) return path;
        return getBaseUrl() + (path.indexOf('/') === 0 ? path : '/' + path);
    }

    function releaseUrl(slug) {
        return getBaseUrl() + '/release/' + slug + '/';
    }

    // ─── Network ───────────────────────────────────────────────────────

    function apiGet(url, success, error) {
        if (window.Lampa && typeof Lampa.Reguest === 'function') {
            try {
                var network = new Lampa.Reguest();
                if (typeof network.timeout === 'function') network.timeout(12000);
                if (typeof network.silent === 'function') {
                    network.silent(url, success, error || function () {});
                    return;
                }
            } catch (e) {}
        }

        if (window.$) {
            $.ajax({
                url: url,
                dataType: 'json',
                timeout: 12000,
                success: success,
                error: error || function () {}
            });
        } else {
            if (error) error();
        }
    }

    function apiGetHtml(url, success, error) {
        if (window.$) {
            $.ajax({
                url: url,
                dataType: 'html',
                timeout: 15000,
                success: success,
                error: error || function () {}
            });
        } else if (error) {
            error();
        }
    }

    // ─── Search API ────────────────────────────────────────────────────

    function searchReleases(query, limit, callback) {
        var url = getBaseUrl() + '/api/search.php?query=' + encodeURIComponent(query) +
            '&field=titles&limit=' + (limit || 20);

        apiGet(url, function (data) {
            if (data && data.success && data.results) {
                var items = [];
                for (var i = 0; i < data.results.length; i++) {
                    var r = data.results[i];
                    items.push({
                        id: r.id,
                        title: r.title || '',
                        slug: r.url_alias || '',
                        poster: posterUrl(r.poster_url),
                        category: r.category_name || '',
                        url: r.url || ('/release/' + r.url_alias + '/')
                    });
                }
                callback(items);
            } else {
                callback([]);
            }
        }, function () {
            callback([]);
        });
    }

    // ─── Catalog HTML Parsing ──────────────────────────────────────────

    function parseCatalogHtml(html) {
        var doc = $(html);
        var items = [];

        doc.find('.release-card').each(function () {
            var card = $(this);
            var linkEl = card.find('a').first();
            var imgEl = card.find('img');
            var titleEl = card.find('h4');

            var href = linkEl.attr('href') || '';
            var slug = href.replace(/^\/release\//, '').replace(/\/$/, '');
            var img = imgEl.attr('src') || '';
            var title = titleEl.text().trim();

            if (title && slug) {
                items.push({
                    id: slug,
                    title: title,
                    slug: slug,
                    poster: posterUrl(img),
                    category: '',
                    url: href
                });
            }
        });

        return items;
    }

    function parseCatalogPagination(html) {
        var doc = $(html);
        var nextUrl = '';

        doc.find('.pagination a, .page-link, a[href*="page="]').each(function () {
            var el = $(this);
            var text = el.text().trim().toLowerCase();
            var href = el.attr('href') || '';

            if (text === '\u00bb' || text === '>' || text === '\u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0430\u044f' || text === 'next' ||
                el.hasClass('next') || el.hasClass('page-next')) {
                nextUrl = href;
            }
        });

        return nextUrl;
    }

    function fetchCatalogPage(params, callback) {
        var url = getBaseUrl() + '/catalog.php';

        var parts = [];
        if (params.page && params.page > 1) parts.push('page=' + params.page);
        if (params.search) parts.push('search=' + encodeURIComponent(params.search));
        if (params.sort) parts.push('sort=' + params.sort);
        if (params.genre_id) parts.push('genre_id[]=' + params.genre_id);
        if (params.release_type_id) parts.push('release_type_id[]=' + params.release_type_id);
        if (params.release_status_id) parts.push('release_status_id[]=' + params.release_status_id);
        if (params.year_min) parts.push('year_min=' + params.year_min);
        if (params.year_max) parts.push('year_max=' + params.year_max);
        if (params.country_id) parts.push('country_id[]=' + params.country_id);

        if (parts.length) url += '?' + parts.join('&');

        apiGetHtml(url, function (html) {
            var items = parseCatalogHtml(html);
            var nextUrl = parseCatalogPagination(html);
            callback(items, nextUrl);
        }, function () {
            notify('Light Family: \u043d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043a\u0430\u0442\u0430\u043b\u043e\u0433');
            callback([], '');
        });
    }

    // ─── Catalog Options Parsing ───────────────────────────────────────

    function parseFilterOptions(html, selectName) {
        var doc = $(html);
        var options = [];

        doc.find('select[name="' + selectName + '"] option').each(function () {
            var val = $(this).attr('value');
            var text = $(this).text().trim();
            if (val && text && text !== '\u041e\u0442' && text !== '\u0414\u043e') {
                options.push({ value: val, title: text });
            }
        });

        return options;
    }

    function fetchCatalogFilters(callback) {
        var url = getBaseUrl() + '/catalog.php';

        apiGetHtml(url, function (html) {
            callback({
                genres: parseFilterOptions(html, 'genre_id[]'),
                types: parseFilterOptions(html, 'release_type_id[]'),
                statuses: parseFilterOptions(html, 'release_status_id[]'),
                countries: parseFilterOptions(html, 'country_id[]')
            });
        }, function () {
            callback({ genres: [], types: [], statuses: [], countries: [] });
        });
    }

    // ─── Card Component ────────────────────────────────────────────────

    function Card(data) {
        this.data = data;

        this.render = function () {
            var imgSrc = data.poster || '';
            var noPoster = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300">' +
                '<rect width="100%" height="100%" fill="#22252d"/>' +
                '<text x="50%" y="50%" fill="#777" font-family="Arial" font-size="16" text-anchor="middle">\u041d\u0435\u0442 \u043f\u043e\u0441\u0442\u0435\u0440\u0430</text>' +
                '</svg>'
            );

            var catBadge = data.category ?
                '<div class="lightfamily-card__badge">' + esc(data.category) + '</div>' : '';

            var element = $(
                '<div class="card lightfamily selector" data-slug="' + esc(data.slug) + '">' +
                    '<div class="card__view">' +
                        '<img class="card__img" src="' + esc(imgSrc || noPoster) + '" ' +
                            (imgSrc ? 'onerror="this.src=\'' + noPoster + '\'"' : '') + ' />' +
                        catBadge +
                    '</div>' +
                    '<div class="card__title">' + esc(data.title) + '</div>' +
                '</div>'
            );

            return element;
        };
    }

    // ─── Catalog Component ─────────────────────────────────────────────

    function Catalog(object) {
        var params = object || {};
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true,
            step: 250
        });

        var html = $('<div class="lightfamily-module"></div>');
        var head = $('<div class="lightfamily-head"></div>');
        var quick = $('<div class="lightfamily-quick"></div>');
        var active = $('<div class="lightfamily-active"></div>');
        var body = $('<div class="lightfamily-body"></div>');

        var last = null;
        var rendered = false;
        var loading = false;
        var ended = false;
        var allItems = [];

        params.page = parseInt(params.page, 10) || 1;

        this.render = function () {
            if (!rendered) {
                rendered = true;

                html.append(head).append(quick).append(active).append(scroll.render());
                scroll.append(body);
                scroll.minus();

                scroll.onWheel = function (step) {
                    var enabled = Lampa.Controller.enabled && Lampa.Controller.enabled();
                    if (enabled && enabled.name !== 'content') Lampa.Controller.toggle('content');
                    if (step > 0) Navigator.move('down');
                    else Navigator.move('up');
                };

                scroll.onEnd = function () {
                    if (!loading && !ended) loadNextPage();
                };

                buildHeader();
                load(false);
            }

            return html;
        };

        this.create = this.render;

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(html);

                    var focusTarget = null;
                    if (last) focusTarget = last;

                    Lampa.Controller.collectionFocus(focusTarget || html.find('.selector').first(), html);
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () {
                    Navigator.move('right');
                },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () {
                    Navigator.move('down');
                },
                back: function () {
                    if (Lampa.Activity && Lampa.Activity.backward) Lampa.Activity.backward();
                },
                enter: function () {
                    var focused = html.find('.selector.focus');
                    if (focused.length) {
                        var slug = focused.data('slug');
                        if (slug) openRelease(slug);
                    }
                }
            });

            Lampa.Controller.toggle('content');
        };

        this.stop = function () {};
        this.pause = function () {};
        this.destroy = function () {
            html.off();
            scroll.render().off();
            scroll.destroy();
            html.remove();
        };

        // ─── Header & Navigation ───────────────────────────────────────

        function buildHeader() {
            head.empty();
            quick.empty();
            active.empty();

            addHeadButton('\u0413\u043b\u0430\u0432\u043d\u0430\u044f', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', function () {
                openWith({ page: 1, sort: '', search: '', genre_id: '', release_type_id: '' });
            });

            addHeadButton('\u041f\u043e\u0438\u0441\u043a', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>', openSearch);
            addHeadButton('\u0424\u0438\u043b\u044c\u0442\u0440\u044b', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>', openFilters);

            addQuick('\u0412\u0441\u0435', { page: 1, sort: '', search: '', genre_id: '', release_type_id: '' });
            addQuick('\u0421\u0435\u0440\u0438\u0430\u043b\u044b', { page: 1, sort: '', search: '', genre_id: '', release_type_id: '1' });
            addQuick('\u0424\u0438\u043b\u044c\u043c\u044b', { page: 1, sort: '', search: '', genre_id: '', release_type_id: '4' });

            if (params.search || params.genre_id || params.release_type_id) {
                addQuick('\u0421\u0431\u0440\u043e\u0441', { page: 1, sort: '', search: '', genre_id: '', release_type_id: '' }, true);
            }

            renderActive();
        }

        function addHeadButton(title, iconSvg, action) {
            var btn = $('<div class="simple-button selector lightfamily-head__button">' + iconSvg + '<span>' + esc(title) + '</span></div>');

            btn.on('hover:focus nav_focus', function () {
                last = btn[0];
            });

            btn.on('hover:enter click tap', action);
            head.append(btn);
        }

        function addQuick(title, values, reset) {
            var selected = !reset;

            if (selected) {
                for (var key in values) {
                    if (String(params[key] || '') !== String(values[key] || '')) {
                        selected = false;
                        break;
                    }
                }
            }

            var btn = $('<div class="simple-button selector lightfamily-chip' + (selected ? ' lightfamily-chip--active' : '') + '">' + esc(title) + '</div>');

            btn.on('hover:focus nav_focus', function () {
                last = btn[0];
            });

            btn.on('hover:enter click tap', function () {
                openWith(values);
            });

            quick.append(btn);
        }

        function renderActive() {
            var parts = [];

            if (params.search) parts.push('\u043f\u043e\u0438\u0441\u043a: ' + params.search);
            if (params.genre_id) parts.push('\u0436\u0430\u043d\u0440: ' + params.genre_id);
            if (params.release_type_id) parts.push('\u0442\u0438\u043f: ' + params.release_type_id);

            active.html(parts.length ?
                '<span>\u0410\u043a\u0442\u0438\u0432\u043d\u043e:</span> ' + esc(parts.join(' / ')) :
                '<span>Light Family</span> \u043a\u0430\u0442\u0430\u043b\u043e\u0433 \u0430\u043d\u0438\u043c\u0435');
        }

        function openWith(values) {
            var next = {};

            for (var key in params) {
                if (params[key] !== undefined && params[key] !== null && params[key] !== '') next[key] = params[key];
            }

            next.page = values.hasOwnProperty('page') ? values.page : 1;

            for (var key2 in values) {
                if (values[key2] === '') delete next[key2];
                else next[key2] = values[key2];
            }

            Lampa.Activity.push({
                url: '',
                title: 'Light Family',
                component: 'lightfamily',
                page: next.page,
                search: next.search || '',
                genre_id: next.genre_id || '',
                release_type_id: next.release_type_id || '',
                sort: next.sort || ''
            });
        }

        // ─── Actions ───────────────────────────────────────────────────

        function openRelease(slug) {
            var url = releaseUrl(slug);

            if (window.Lampa && Lampa.Utils && Lampa.Utils.openUrl) {
                Lampa.Utils.openUrl(url);
            } else if (window.open) {
                window.open(url, '_blank');
            } else {
                notify('\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435: ' + url);
            }
        }

        function openSearch() {
            if (window.Lampa && Lampa.Input && Lampa.Input.edit) {
                Lampa.Input.edit({
                    title: '\u041f\u043e\u0438\u0441\u043a Light Family',
                    value: params.search || '',
                    free: true
                }, function (text) {
                    text = String(text || '').trim();

                    if (!text) {
                        notify('\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435');
                    } else {
                        openWith({ search: text });
                    }

                    Lampa.Controller.toggle('content');
                });
            } else {
                var value = window.prompt('\u041f\u043e\u0438\u0441\u043a Light Family', params.search || '');
                if (value !== null) {
                    value = String(value || '').trim();
                    if (value) openWith({ search: value });
                }
            }
        }

        function openFilters() {
            fetchCatalogFilters(function (filters) {
                var items = [
                    { title: '\u0416\u0430\u043d\u0440: ' + (params.genre_id || '\u043b\u044e\u0431\u043e\u0439'), value: 'genre' },
                    { title: '\u0422\u0438\u043f: ' + (params.release_type_id || '\u043b\u044e\u0431\u043e\u0439'), value: 'type' }
                ];

                if (params.genre_id || params.release_type_id || params.search) {
                    items.push({ title: '\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u0444\u0438\u043b\u044c\u0442\u0440\u044b', value: 'reset' });
                }

                Lampa.Select.show({
                    title: '\u0424\u0438\u043b\u044c\u0442\u0440\u044b Light Family',
                    items: items,
                    onSelect: function (item) {
                        if (item.value === 'genre') openGenreMenu(filters.genres);
                        else if (item.value === 'type') openTypeMenu(filters.types);
                        else if (item.value === 'reset') {
                            openWith({ genre_id: '', release_type_id: '', page: 1 });
                        }
                    },
                    onBack: function () {
                        Lampa.Controller.toggle('content');
                    }
                });
            });
        }

        function openGenreMenu(genres) {
            var items = [{ title: '\u041b\u044e\u0431\u043e\u0439', value: '' }];

            for (var i = 0; i < genres.length; i++) {
                items.push({
                    title: (params.genre_id === genres[i].value ? '\u2713 ' : '') + genres[i].title,
                    value: genres[i].value
                });
            }

            Lampa.Select.show({
                title: '\u0416\u0430\u043d\u0440',
                items: items,
                onSelect: function (item) {
                    openWith({ genre_id: item.value, page: 1 });
                },
                onBack: function () {
                    openFilters();
                }
            });
        }

        function openTypeMenu(types) {
            var items = [{ title: '\u041b\u044e\u0431\u043e\u0439', value: '' }];

            for (var i = 0; i < types.length; i++) {
                items.push({
                    title: (params.release_type_id === types[i].value ? '\u2713 ' : '') + types[i].title,
                    value: types[i].value
                });
            }

            Lampa.Select.show({
                title: '\u0422\u0438\u043f',
                items: items,
                onSelect: function (item) {
                    openWith({ release_type_id: item.value, page: 1 });
                },
                onBack: function () {
                    openFilters();
                }
            });
        }

        // ─── Data Loading ──────────────────────────────────────────────

        function load(append) {
            if (loading) return;

            loading = true;

            if (!append) {
                body.empty();
                allItems = [];
                ended = false;
            }

            if (params.search) {
                searchReleases(params.search, 50, function (items) {
                    loading = false;

                    if (!append) allItems = items;
                    else allItems = allItems.concat(items);

                    renderCards(items, append);

                    if (items.length < 10) ended = true;
                });
            } else {
                var catalogParams = {
                    page: params.page,
                    sort: params.sort || '',
                    genre_id: params.genre_id || '',
                    release_type_id: params.release_type_id || ''
                };

                fetchCatalogPage(catalogParams, function (items) {
                    loading = false;

                    if (!append) allItems = items;
                    else allItems = allItems.concat(items);

                    renderCards(items, append);

                    if (items.length < PAGE_LIMIT) ended = true;
                });
            }
        }

        function loadNextPage() {
            params.page = (params.page || 1) + 1;
            load(true);
        }

        function renderCards(items, append) {
            if (!append) body.empty();

            if (!items.length && !append) {
                body.html('<div class="lightfamily-empty">\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e</div>');
                return;
            }

            var row = $('<div class="cards-list"></div>');

            for (var i = 0; i < items.length; i++) {
                var card = new Card(items[i]);
                var element = card.render();

                element.on('hover:focus nav_focus', (function (el) {
                    return function () { last = el[0]; };
                })(element));

                element.on('hover:enter click tap', (function (slug) {
                    return function () { openRelease(slug); };
                })(items[i].slug));

                row.append(element);
            }

            body.append(row);
        }
    }

    // ─── CSS Styles ────────────────────────────────────────────────────

    function addStyles() {
        if (document.getElementById('lightfamily-plugin-css')) return;

        var css = '' +
            '.lightfamily-module { padding: 0 1.5em; }' +
            '.lightfamily-head { display: flex; flex-wrap: wrap; gap: 0.5em; padding: 0.8em 0; }' +
            '.lightfamily-head__button { display: flex; align-items: center; gap: 0.4em; padding: 0.5em 1em; font-size: 0.9em; }' +
            '.lightfamily-head__button svg { width: 1.2em; height: 1.2em; }' +
            '.lightfamily-quick { display: flex; flex-wrap: wrap; gap: 0.4em; padding: 0.4em 0; }' +
            '.lightfamily-chip { padding: 0.4em 1em; font-size: 0.8em; border-radius: 1em; opacity: 0.7; }' +
            '.lightfamily-chip--active { opacity: 1; background: rgba(255,255,255,0.15); }' +
            '.lightfamily-active { padding: 0.5em 0; font-size: 0.85em; color: rgba(255,255,255,0.6); }' +
            '.lightfamily-active span { color: rgba(255,255,255,0.4); }' +
            '.lightfamily-body { padding: 0.5em 0; }' +
            '.lightfamily-body .cards-list { display: flex; flex-wrap: wrap; gap: 1em; }' +
            '.lightfamily-body .card { width: calc(16.666% - 1em); min-width: 120px; }' +
            '.lightfamily-card__badge { position: absolute; top: 0.5em; left: 0.5em; background: rgba(0,0,0,0.7); color: #fff; padding: 0.2em 0.6em; font-size: 0.7em; border-radius: 0.3em; }' +
            '.lightfamily-empty { text-align: center; padding: 3em 0; color: rgba(255,255,255,0.4); font-size: 1.1em; }' +
            '';

        var style = document.createElement('style');
        style.id = 'lightfamily-plugin-css';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ─── Registration & Start ──────────────────────────────────────────

    function add() {
        addStyles();

        Lampa.Component.add('lightfamily', Catalog);

        Lampa.Manifest.plugins = {
            type: 'other',
            version: '1.0.0',
            name: 'Light Family',
            description: '\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u0430\u043d\u0438\u043c\u0435 lightfamily.online',
            component: 'lightfamily'
        };

        Lampa.Manifest.plugins.push({
            name: 'Light Family',
            component: 'lightfamily'
        });
    }

    function startPlugin() {
        if (window.appready) add();
        else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') add();
            });
        }
    }

    startPlugin();
})();
