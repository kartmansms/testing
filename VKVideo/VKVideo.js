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

    function findFilterName(items, value) {
        for (var i = 0; i < items.length; i++) {
            if (items[i].value === value) return items[i].title;
        }
        return null;
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

    // ─── Release Details ───────────────────────────────────────────────

    function fetchReleaseDetails(slug, callback) {
        var url = getBaseUrl() + '/release/' + slug + '/';

        apiGetHtml(url, function (html) {
            var info = { slug: slug, title: '', description: '', poster: '', year: 0, genres: [], type: '', status: '', episodes: [], playlistUrl: '' };

            try {
                // Parse JSON-LD
                var ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
                if (ldMatch) {
                    var ld = JSON.parse(ldMatch[1]);
                    info.title = ld.name || '';
                    info.description = ld.description || '';
                    info.poster = ld.image || '';
                }

                // Parse lfNewPlayerData for playlist URL - find sourceUrl directly
                var srcMatch = html.match(/sourceUrl\s*:\s*"([^"]+playlist\.txt[^"]*)"/);
                if (srcMatch) {
                    info.playlistUrl = srcMatch[1].replace(/\\\//g, '/');
                }

                // Fallback: construct playlist URL from lf_video_folder
                if (!info.playlistUrl) {
                    var folderMatch = html.match(/lf_video_folder=([A-Za-z0-9_-]+)/);
                    if (folderMatch && folderMatch[1]) {
                        var folder = folderMatch[1];
                        info.playlistUrl = getBaseUrl() + '/video/stream.php?path=' + encodeURIComponent(folder + '/playlist.txt');
                    }
                }

                // Parse catalog data for extra info
                var catMatch = html.match(/catalogReleases\s*=\s*(\[[\s\S]*?\]);/);
                if (catMatch) {
                    var catData = JSON.parse(catMatch[1]);
                    if (catData.length) {
                        var r = catData[0];
                        info.year = r.year || 0;
                        info.genres = r.genre_names || [];
                        info.type = r.release_type_name || '';
                        info.status = r.release_status_name || '';
                        if (!info.title) info.title = r.title || '';
                    }
                }
            } catch (e) {}

            callback(info);
        }, function () {
            callback(null);
        });
    }

    function fetchPlaylist(playlistUrl, callback) {
        if (!playlistUrl) { callback([]); return; }

        apiGet(playlistUrl, function (data) {
            if (Array.isArray(data)) {
                var episodes = [];
                for (var f = 0; f < data.length; f++) {
                    var folder = data[f];
                    if (folder.folder && Array.isArray(folder.folder)) {
                        for (var e = 0; e < folder.folder.length; e++) {
                            var ep = folder.folder[e];
                            episodes.push({
                                title: ep.title || ('Episode ' + (e + 1)),
                                file: ep.file || '',
                                skip: ep.skip || '',
                                folder: folder.title || ''
                            });
                        }
                    }
                }
                callback(episodes);
            } else {
                callback([]);
            }
        }, function () {
            callback([]);
        });
    }

    // ─── Player ────────────────────────────────────────────────────────

    function playEpisode(episode, releaseTitle) {
        if (!episode || !episode.file) {
            notify('\u041d\u0435\u0442 \u0444\u0430\u0439\u043b\u0430 \u0434\u043b\u044f \u0432\u043e\u0441\u043f\u0440\u043e\u043f\u0438\u0437\u0432\u0435\u0434\u0435\u043d\u0438\u044f');
            return;
        }

        // Try Lampa's built-in player
        if (window.Lampa && Lampa.Player) {
            try {
                Lampa.Player.play({
                    url: episode.file,
                    title: releaseTitle + ' - ' + episode.title,
                    type: 'dash'
                });
                return;
            } catch (e) {}
        }

        // Try Lampa.Activity player overlay
        if (window.Lampa && Lampa.Activity) {
            try {
                Lampa.Activity.push({
                    url: episode.file,
                    title: releaseTitle + ' - ' + episode.title,
                    component: 'player',
                    type: 'dash'
                });
                return;
            } catch (e) {}
        }

        // Fallback: open in browser
        window.open(episode.file, '_blank');
    }

    // ─── Full Card Component ───────────────────────────────────────────

    function FullCard(object) {
        var data = object || {};
        var html = $('<div class="lightfamily-module lightfamily-full"></div>');
        var scrollContainer = $('<div class="lightfamily-scroll"></div>');
        var body = $('<div class="lightfamily-full-body"></div>');
        var rendered = false;
        var episodes = [];

        this.render = function () {
            if (!rendered) {
                rendered = true;
                scrollContainer.append(body);
                html.append(scrollContainer);
                loadData();
            }
            return html;
        };

        this.create = this.render;

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(html);
                    Lampa.Controller.collectionFocus(html.find('.selector').first(), html);
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () { Navigator.move('right'); },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () { Navigator.move('down'); },
                back: function () {
                    if (Lampa.Activity && Lampa.Activity.backward) Lampa.Activity.backward();
                },
                enter: function () {
                    var focused = html.find('.selector.focus');
                    if (focused.length) {
                        var idx = parseInt(focused.data('episode'), 10);
                        if (!isNaN(idx) && episodes[idx]) {
                            playEpisode(episodes[idx], data.title);
                        }
                    }
                }
            });
            Lampa.Controller.toggle('content');
        };

        this.stop = function () {};
        this.pause = function () {};
        this.destroy = function () {
            html.off();
            html.remove();
        };

        function loadData() {
            body.html('<div class="lightfamily-loader">\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</div>');

            fetchReleaseDetails(data.slug, function (info) {
                if (!info) {
                    body.html('<div class="lightfamily-empty">\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435</div>');
                    return;
                }

                renderInfo(info);

                if (info.playlistUrl) {
                    body.append($('<div class="lightfamily-loader lightfamily-episodes-loader">\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0441\u0435\u0440\u0438\u0439...</div>'));

                    fetchPlaylist(info.playlistUrl, function (eps) {
                        body.find('.lightfamily-episodes-loader').remove();
                        episodes = eps;
                        if (eps.length) {
                            renderEpisodes(eps);
                        } else {
                            body.append($('<div class="lightfamily-full__episodes-empty">\u0421\u0435\u0440\u0438\u0438 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b</div>'));
                        }
                    });
                } else {
                    body.append($('<div class="lightfamily-full__episodes-empty">\u0412\u0438\u0434\u0435\u043e \u043d\u0435 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e \u0434\u043b\u044f \u044d\u0442\u043e\u0433\u043e \u0440\u0435\u043b\u0438\u0437\u0430</div>'));
                }
            });
        }

        function renderInfo(info) {
            var meta = [];
            if (info.type) meta.push(info.type);
            if (info.year) meta.push(info.year);
            if (info.status) meta.push(info.status);
            if (info.genres && info.genres.length) meta.push(info.genres.join(', '));

            var htmlStr = '' +
                '<div class="lightfamily-full__header">' +
                    '<div class="lightfamily-full__poster">' +
                        '<img src="' + esc(info.poster) + '" onerror="this.style.display=\'none\'" />' +
                    '</div>' +
                    '<div class="lightfamily-full__info">' +
                        '<h1 class="lightfamily-full__title">' + esc(info.title) + '</h1>' +
                        (meta.length ? '<div class="lightfamily-full__meta">' + esc(meta.join(' \u2022 ')) + '</div>' : '') +
                        (info.description ? '<div class="lightfamily-full__desc">' + esc(info.description) + '</div>' : '') +
                    '</div>' +
                '</div>';

            body.append($(htmlStr));
        }

        function renderEpisodes(eps) {
            if (!eps.length) {
                body.append($('<div class="lightfamily-full__episodes-empty">\u0421\u0435\u0440\u0438\u0438 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b</div>'));
                return;
            }

            var container = $('<div class="lightfamily-full__episodes"></div>');
            container.append($('<h2 class="lightfamily-full__episodes-title">\u0421\u0435\u0440\u0438\u0438</h2>'));

            var list = $('<div class="lightfamily-full__episodes-list"></div>');

            for (var i = 0; i < eps.length; i++) {
                var ep = eps[i];
                var label = ep.folder ? ep.folder + ' / ' + ep.title : ep.title;
                var btn = $('<div class="simple-button selector lightfamily-full__episode" data-episode="' + i + '">' +
                    '<span class="lightfamily-full__episode-num">' + (i + 1) + '</span>' +
                    '<span class="lightfamily-full__episode-title">' + esc(label) + '</span>' +
                '</div>');

                btn.on('hover:enter click tap', (function (idx) {
                    return function () {
                        playEpisode(episodes[idx], data.title);
                    };
                })(i));

                list.append(btn);
            }

            container.append(list);
            body.append(container);
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
                        original_title: '',
                        slug: r.url_alias || '',
                        poster: posterUrl(r.poster_url),
                        category: r.category_name || '',
                        year: 0,
                        genres: [],
                        type: '',
                        status: ''
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

    // ─── Catalog JSON Parsing ──────────────────────────────────────────

    function parseCatalogJson(html) {
        var items = [];

        try {
            var match = html.match(/catalogReleases\s*=\s*(\[[\s\S]*?\]);/);
            if (!match) return items;

            var data = JSON.parse(match[1]);

            for (var i = 0; i < data.length; i++) {
                var r = data[i];
                items.push({
                    id: r.id,
                    title: r.title || '',
                    original_title: r.original_title || '',
                    slug: r.url_alias || '',
                    poster: posterUrl(r.poster_url),
                    category: r.category_name || '',
                    year: r.year || 0,
                    genres: r.genre_names || [],
                    type: r.release_type_name || '',
                    status: r.release_status_name || ''
                });
            }
        } catch (e) {}

        return items;
    }

    function parseCatalogHasNext(html) {
        var match = html.match(/pagination-next/);
        return !!match;
    }

    function fetchCatalogPage(params, callback) {
        var url = getBaseUrl() + '/catalog.php';

        var parts = [];
        if (params.page && params.page > 1) parts.push('page=' + params.page);
        if (params.sort) parts.push('sort=' + params.sort);
        if (params.genre_id) parts.push('genre_id[]=' + params.genre_id);
        if (params.release_type_id) parts.push('release_type_id[]=' + params.release_type_id);
        if (params.release_status_id) parts.push('release_status_id[]=' + params.release_status_id);
        if (params.country_id) parts.push('country_id[]=' + params.country_id);
        if (params.year) {
            parts.push('year_min=' + params.year);
            parts.push('year_max=' + params.year);
        } else {
            if (params.year_min) parts.push('year_min=' + params.year_min);
            if (params.year_max) parts.push('year_max=' + params.year_max);
        }

        if (parts.length) url += '?' + parts.join('&');

        apiGetHtml(url, function (html) {
            var items = parseCatalogJson(html);
            var hasNext = parseCatalogHasNext(html);
            callback(items, hasNext);
        }, function () {
            notify('Light Family: \u043d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043a\u0430\u0442\u0430\u043b\u043e\u0433');
            callback([], false);
        });
    }

    // ─── Catalog Options Parsing ───────────────────────────────────────

    function parseFilterOptions(html, selectName) {
        var options = [];

        try {
            var escapedName = selectName.replace(/\[\]/g, '\\[\\]');
            var selectRegex = new RegExp('<select[^>]*name="' + escapedName + '"[^>]*>([\\s\\S]*?)</select>');
            var selectMatch = html.match(selectRegex);

            if (selectMatch) {
                var optionRegex = /<option[^>]*value="([^"]*)"[^>]*>([^<]+)<\/option>/g;
                var optMatch;
                while ((optMatch = optionRegex.exec(selectMatch[1])) !== null) {
                    var val = optMatch[1];
                    var text = optMatch[2].trim();
                    if (val && text && text !== '\u041e\u0442' && text !== '\u0414\u043e') {
                        options.push({ value: val, title: text });
                    }
                }
            }
        } catch (e) {}

        return options;
    }

    function fetchCatalogFilters(callback) {
        var url = getBaseUrl() + '/catalog.php';

        apiGetHtml(url, function (html) {
            var genres = parseFilterOptions(html, 'genre_id[]');
            var types = parseFilterOptions(html, 'release_type_id[]');
            var statuses = parseFilterOptions(html, 'release_status_id[]');
            var countries = parseFilterOptions(html, 'country_id[]');

            var years = [];
            try {
                var yearRegex = /<select[^>]*name="year_min"[^>]*>([\s\S]*?)<\/select>/;
                var yearMatch = html.match(yearRegex);
                if (yearMatch) {
                    var optRegex = /<option[^>]*value="(\d{4})"[^>]*>(\d{4})<\/option>/g;
                    var m;
                    while ((m = optRegex.exec(yearMatch[1])) !== null) {
                        years.push({ value: m[1], title: m[2] });
                    }
                }
            } catch (e) {}

            callback({
                genres: genres,
                types: types,
                statuses: statuses,
                countries: countries,
                years: years
            });
        }, function () {
            callback({ genres: [], types: [], statuses: [], countries: [], years: [] });
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

            var badges = '';
            if (data.category) {
                badges += '<div class="lightfamily-card__badge">' + esc(data.category) + '</div>';
            }

            var meta = [];
            if (data.type) meta.push(data.type);
            if (data.year) meta.push(data.year);
            if (data.genres && data.genres.length) meta.push(data.genres.slice(0, 2).join(', '));

            var metaHtml = meta.length ?
                '<div class="lightfamily-card__meta">' + esc(meta.join(' \u2022 ')) + '</div>' : '';

            var element = $(
                '<div class="card lightfamily selector" data-slug="' + esc(data.slug) + '">' +
                    '<div class="card__view">' +
                        '<img class="card__img" src="' + esc(imgSrc || noPoster) + '" ' +
                            (imgSrc ? 'onerror="this.src=\'' + noPoster + '\'"' : '') + ' />' +
                        badges +
                    '</div>' +
                    '<div class="card__title">' + esc(data.title) + '</div>' +
                    metaHtml +
                '</div>'
            );

            return element;
        };
    }

    // ─── Catalog Component ─────────────────────────────────────────────

    function Catalog(object) {
        var params = object || {};

        var html = $('<div class="lightfamily-module"></div>');
        var head = $('<div class="lightfamily-head"></div>');
        var quick = $('<div class="lightfamily-quick"></div>');
        var active = $('<div class="lightfamily-active"></div>');
        var scrollContainer = $('<div class="lightfamily-scroll"></div>');
        var body = $('<div class="lightfamily-body"></div>');

        var last = null;
        var rendered = false;
        var loading = false;
        var ended = false;
        var allItems = [];
        var filtersCache = null;

        params.page = parseInt(params.page, 10) || 1;

        this.render = function () {
            if (!rendered) {
                rendered = true;

                scrollContainer.append(body);
                html.append(head).append(quick).append(active).append(scrollContainer);

                scrollContainer.on('scroll', function () {
                    var el = scrollContainer[0];
                    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
                        if (!loading && !ended) loadNextPage();
                    }
                });

                buildHeader();

                fetchCatalogFilters(function (filters) {
                    filtersCache = filters;
                    renderActive();
                });

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

            addQuick('\u0412\u0441\u0435', { page: 1, sort: '', search: '', genre_id: '', release_type_id: '', release_status_id: '', country_id: '', year: '' });
            addQuick('\u0421\u0435\u0440\u0438\u0430\u043b\u044b', { page: 1, sort: '', search: '', genre_id: '', release_type_id: '1', release_status_id: '', country_id: '', year: '' });
            addQuick('\u0424\u0438\u043b\u044c\u043c\u044b', { page: 1, sort: '', search: '', genre_id: '', release_type_id: '4', release_status_id: '', country_id: '', year: '' });

            if (params.search || params.genre_id || params.release_type_id || params.release_status_id || params.country_id || params.year) {
                addQuick('\u0421\u0431\u0440\u043e\u0441', { page: 1, sort: '', search: '', genre_id: '', release_type_id: '', release_status_id: '', country_id: '', year: '' }, true);
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

            if (params.genre_id) {
                var genreName = findFilterName(filtersCache ? filtersCache.genres : [], params.genre_id) || params.genre_id;
                parts.push('\u0436\u0430\u043d\u0440: ' + genreName);
            }

            if (params.release_type_id) {
                var typeName = findFilterName(filtersCache ? filtersCache.types : [], params.release_type_id) || params.release_type_id;
                parts.push('\u0442\u0438\u043f: ' + typeName);
            }

            if (params.release_status_id) {
                var statusName = findFilterName(filtersCache ? filtersCache.statuses : [], params.release_status_id) || params.release_status_id;
                parts.push('\u0441\u0442\u0430\u0442\u0443\u0441: ' + statusName);
            }

            if (params.country_id) {
                var countryName = findFilterName(filtersCache ? filtersCache.countries : [], params.country_id) || params.country_id;
                parts.push('\u0441\u0442\u0440\u0430\u043d\u0430: ' + countryName);
            }

            if (params.year) parts.push('\u0433\u043e\u0434: ' + params.year);

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
                release_status_id: next.release_status_id || '',
                country_id: next.country_id || '',
                year: next.year || '',
                sort: next.sort || ''
            });
        }

        // ─── Actions ───────────────────────────────────────────────────

        function openRelease(slug) {
            Lampa.Activity.push({
                url: '',
                title: 'Light Family',
                component: 'lightfamily-full',
                slug: slug
            });
        }

        function openSearch() {
            var currentValue = params.search || '';

            if (window.Lampa && Lampa.Input && Lampa.Input.edit) {
                Lampa.Input.edit({
                    title: '\u041f\u043e\u0438\u0441\u043a Light Family',
                    value: currentValue,
                    free: true
                }, function (text) {
                    text = String(text || '').trim();

                    if (text) {
                        openWith({ search: text });
                    } else if (currentValue) {
                        openWith({ search: '' });
                    }

                    Lampa.Controller.toggle('content');
                });
            } else {
                var value = window.prompt('\u041f\u043e\u0438\u0441\u043a Light Family', currentValue);
                if (value !== null) {
                    value = String(value || '').trim();
                    openWith({ search: value });
                }
            }
        }

        function openFilters() {
            fetchCatalogFilters(function (filters) {
                filtersCache = filters;

                var genreName = findFilterName(filters.genres, params.genre_id) || '\u043b\u044e\u0431\u043e\u0439';
                var typeName = findFilterName(filters.types, params.release_type_id) || '\u043b\u044e\u0431\u043e\u0439';
                var statusName = findFilterName(filters.statuses, params.release_status_id) || '\u043b\u044e\u0431\u043e\u0439';
                var countryName = findFilterName(filters.countries, params.country_id) || '\u043b\u044e\u0431\u0430\u044f';
                var yearName = params.year || '\u043b\u044e\u0431\u043e\u0439';

                var items = [
                    { title: '\u0416\u0430\u043d\u0440: ' + genreName, value: 'genre' },
                    { title: '\u0422\u0438\u043f: ' + typeName, value: 'type' },
                    { title: '\u0421\u0442\u0430\u0442\u0443\u0441: ' + statusName, value: 'status' },
                    { title: '\u0421\u0442\u0440\u0430\u043d\u0430: ' + countryName, value: 'country' },
                    { title: '\u0413\u043e\u0434: ' + yearName, value: 'year' }
                ];

                var hasFilter = params.genre_id || params.release_type_id || params.release_status_id || params.country_id || params.year || params.search;
                if (hasFilter) {
                    items.push({ title: '\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u0444\u0438\u043b\u044c\u0442\u0440\u044b', value: 'reset' });
                }

                Lampa.Select.show({
                    title: '\u0424\u0438\u043b\u044c\u0442\u0440\u044b Light Family',
                    items: items,
                    onSelect: function (item) {
                        if (item.value === 'genre') openFilterMenu('\u0416\u0430\u043d\u0440', filters.genres, params.genre_id, 'genre_id', '\u041b\u044e\u0431\u043e\u0439');
                        else if (item.value === 'type') openFilterMenu('\u0422\u0438\u043f', filters.types, params.release_type_id, 'release_type_id', '\u041b\u044e\u0431\u043e\u0439');
                        else if (item.value === 'status') openFilterMenu('\u0421\u0442\u0430\u0442\u0443\u0441', filters.statuses, params.release_status_id, 'release_status_id', '\u041b\u044e\u0431\u043e\u0439');
                        else if (item.value === 'country') openFilterMenu('\u0421\u0442\u0440\u0430\u043d\u0430', filters.countries, params.country_id, 'country_id', '\u041b\u044e\u0431\u0430\u044f');
                        else if (item.value === 'year') openFilterMenu('\u0413\u043e\u0434', filters.years, params.year, 'year', '\u041b\u044e\u0431\u043e\u0439');
                        else if (item.value === 'reset') {
                            openWith({ genre_id: '', release_type_id: '', release_status_id: '', country_id: '', year: '', search: '', page: 1 });
                        }
                    },
                    onBack: function () {
                        Lampa.Controller.toggle('content');
                    }
                });
            });
        }

        function openFilterMenu(title, items, currentValue, paramKey, anyLabel) {
            var list = [{ title: anyLabel || '\u041b\u044e\u0431\u043e\u0439', value: '' }];

            for (var i = 0; i < items.length; i++) {
                list.push({
                    title: (currentValue === items[i].value ? '\u2713 ' : '') + items[i].title,
                    value: items[i].value
                });
            }

            var update = {};
            update[paramKey] = '';

            Lampa.Select.show({
                title: title,
                items: list,
                onSelect: function (item) {
                    var opts = { page: 1 };
                    opts[paramKey] = item.value;
                    openWith(opts);
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

                if (!filtersCache) {
                    fetchCatalogFilters(function (f) {
                        filtersCache = f;
                        renderActive();
                    });
                }
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
                    release_type_id: params.release_type_id || '',
                    release_status_id: params.release_status_id || '',
                    country_id: params.country_id || '',
                    year: params.year || ''
                };

                fetchCatalogPage(catalogParams, function (items, hasNext) {
                    loading = false;

                    if (!append) allItems = items;
                    else allItems = allItems.concat(items);

                    renderCards(items, append);

                    if (!hasNext) ended = true;
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
            '.lightfamily-module { padding: 1.2em 1.5em 2.5em; color: #fff; height: 100%; display: flex; flex-direction: column; box-sizing: border-box; }' +
            '.lightfamily-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; min-height: 0; -webkit-overflow-scrolling: touch; }' +
            '.lightfamily-head { display: flex; flex-wrap: wrap; gap: 0.5em; padding: 0 0 0.8em 0; flex-shrink: 0; }' +
            '.lightfamily-head__button { display: flex; align-items: center; gap: 0.4em; padding: 0.5em 1em; font-size: 0.9em; }' +
            '.lightfamily-head__button svg { width: 1.2em; height: 1.2em; }' +
            '.lightfamily-quick { display: flex; flex-wrap: wrap; gap: 0.4em; padding: 0.4em 0; flex-shrink: 0; }' +
            '.lightfamily-chip { padding: 0.4em 1em; font-size: 0.8em; border-radius: 1em; opacity: 0.7; }' +
            '.lightfamily-chip--active { opacity: 1; background: rgba(255,255,255,0.15); }' +
            '.lightfamily-active { padding: 0.5em 0; font-size: 0.85em; color: rgba(255,255,255,0.6); flex-shrink: 0; }' +
            '.lightfamily-active span { color: rgba(255,255,255,0.4); }' +
            '.lightfamily-body { padding: 0.5em 0; }' +
            '.lightfamily-body .cards-list { display: flex; flex-wrap: wrap; gap: 1em; width: 100%; }' +
            '.lightfamily-body .card { width: calc(16.666% - 1em); min-width: 120px; position: relative; flex-shrink: 0; }' +
            '.lightfamily-card__badge { position: absolute; top: 0.5em; left: 0.5em; background: rgba(0,0,0,0.7); color: #fff; padding: 0.2em 0.6em; font-size: 0.7em; border-radius: 0.3em; }' +
            '.lightfamily-card__meta { font-size: 0.75em; color: rgba(255,255,255,0.5); margin-top: 0.3em; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
            '.lightfamily-empty, .lightfamily-loader { text-align: center; padding: 3em 0; color: rgba(255,255,255,0.4); font-size: 1.1em; }' +
            '.lightfamily-full__header { display: flex; gap: 1.5em; padding: 1em 0; }' +
            '.lightfamily-full__poster { flex: 0 0 200px; }' +
            '.lightfamily-full__poster img { width: 100%; border-radius: 0.5em; }' +
            '.lightfamily-full__info { flex: 1; }' +
            '.lightfamily-full__title { font-size: 1.6em; margin: 0 0 0.5em 0; color: #fff; }' +
            '.lightfamily-full__meta { font-size: 0.9em; color: rgba(255,255,255,0.6); margin-bottom: 0.8em; }' +
            '.lightfamily-full__desc { font-size: 0.9em; color: rgba(255,255,255,0.7); line-height: 1.5; max-height: 6em; overflow: hidden; }' +
            '.lightfamily-full__episodes-title { font-size: 1.2em; color: #fff; margin: 1em 0 0.5em; }' +
            '.lightfamily-full__episodes-list { display: flex; flex-direction: column; gap: 0.3em; }' +
            '.lightfamily-full__episode { display: flex; align-items: center; gap: 0.8em; padding: 0.6em 1em; }' +
            '.lightfamily-full__episode-num { flex: 0 0 2em; text-align: center; color: rgba(255,255,255,0.5); font-size: 0.9em; }' +
            '.lightfamily-full__episode-title { flex: 1; }' +
            '.lightfamily-full__episodes-empty { color: rgba(255,255,255,0.4); padding: 1em 0; }' +
            '';

        var style = document.createElement('style');
        style.id = 'lightfamily-plugin-css';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ─── Menu ──────────────────────────────────────────────────────────

    function addMenu() {
        var menu = $('.menu .menu__list').eq(0);

        if (!menu.length || $('.menu__item.selector[data-action="lightfamily"]').length) return;

        var button = $(
            '<li class="menu__item selector" data-action="lightfamily">' +
                '<div class="menu__ico">' +
                    '<svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#f5a623" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">' +
                        '<circle cx="12" cy="12" r="10"/>' +
                        '<path d="M8 14s1.5 2 4 2 4-2 4-2"/>' +
                        '<line x1="9" y1="9" x2="9.01" y2="9"/>' +
                        '<line x1="15" y1="9" x2="15.01" y2="9"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="menu__text">Light Family</div>' +
            '</li>'
        );

        button.on('hover:enter click tap mouseup', function () {
            Lampa.Activity.push({
                url: '',
                title: 'Light Family',
                component: 'lightfamily',
                page: 1
            });
        });

        menu.append(button);
    }

    // ─── Registration & Start ──────────────────────────────────────────

    function add() {
        addStyles();

        Lampa.Component.add('lightfamily', Catalog);
        Lampa.Component.add('lightfamily-full', FullCard);

        Lampa.Manifest.plugins.push({
            type: 'other',
            version: '1.0.0',
            name: 'Light Family',
            description: '\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u0430\u043d\u0438\u043c\u0435 lightfamily.online',
            component: 'lightfamily'
        });
    }

    function startPlugin() {
        if (!window.Lampa || !window.$) return;

        add();

        if (window.appready) {
            addMenu();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') addMenu();
            });
        }
    }

    startPlugin();
})();
