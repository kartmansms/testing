(function () {
    'use strict';

    if (window.plugin_shikimori_ready) return;
    window.plugin_shikimori_ready = true;

    var SETTINGS_KEY = 'shikimori_settings_v1';
    var GENRES_CACHE_KEY = 'shikimori_genres_cache_v1';
    var AUTH_KEY = 'shikimori_auth_v1';
    var SHIKI_HOST = 'https://shikimori.one';
    var ARM_HOST = 'https://arm.haglund.dev';
    var PAGE_LIMIT = 48;
    var adultGenres = { hentai: true, erotica: true, yaoi: true, yuri: true };

    function defaults() {
        return { title_language: 'ru', hide_adult: true, default_sort: 'popularity', card_size: 'normal' };
    }

    function storageGet(key, fallback) {
        var value;
        try {
            if (window.Lampa && Lampa.Storage && Lampa.Storage.get) {
                value = Lampa.Storage.get(key, fallback);
                return value === undefined || value === null ? fallback : value;
            }
        } catch (e) {}
        try {
            value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
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
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (err) {}
    }

    function readSettings() {
        var base = defaults();
        var saved = storageGet(SETTINGS_KEY, {});
        var key;
        if (!saved || typeof saved !== 'object') saved = {};
        for (key in saved) if (saved.hasOwnProperty(key)) base[key] = saved[key];
        return base;
    }

    function saveSettings(settings) {
        storageSet(SETTINGS_KEY, settings || defaults());
    }

    function defaultAuth() {
        return { client_id: '', client_secret: '', redirect_uri: 'urn:ietf:wg:oauth:2.0:oob', access_token: '', refresh_token: '', expires_at: 0, nickname: '' };
    }

    function readAuth() {
        var base = defaultAuth();
        var saved = storageGet(AUTH_KEY, {});
        var key;
        if (!saved || typeof saved !== 'object') saved = {};
        for (key in saved) if (saved.hasOwnProperty(key)) base[key] = saved[key];
        return base;
    }

    function saveAuth(auth) {
        storageSet(AUTH_KEY, auth || defaultAuth());
    }

    function isAuthorized() {
        var auth = readAuth();
        return !!(auth.access_token && auth.expires_at && auth.expires_at > Date.now() + 60000);
    }

    function authStatusTitle() {
        var auth = readAuth();
        if (isAuthorized()) return 'подключено' + (auth.nickname ? ': ' + auth.nickname : '');
        if (auth.refresh_token) return 'требуется обновление';
        if (auth.client_id && auth.client_secret) return 'ключи введены';
        return 'не подключено';
    }

    function notify(message) {
        if (window.Lampa && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(message);
        else if (window.console) console.log(message);
    }

    function esc(value) {
        value = value === undefined || value === null ? '' : String(value);
        return value.replace(/[&<>"']/g, function (symbol) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[symbol];
        });
    }

    function gqlValue(value) {
        value = value === undefined || value === null ? '' : String(value);
        return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    function currentSeasonCode() {
        var now = new Date();
        var month = now.getMonth() + 1;
        var season = 'winter';
        if (month >= 3 && month <= 5) season = 'spring';
        else if (month >= 6 && month <= 8) season = 'summer';
        else if (month >= 9 && month <= 11) season = 'fall';
        return season + '_' + now.getFullYear();
    }

    function seasonName(code) {
        var map = { winter: 'зима', spring: 'весна', summer: 'лето', fall: 'осень' };
        var parts;
        if (!code) return '';
        parts = String(code).split('_');
        return (map[parts[0]] || parts[0] || '') + (parts[1] ? ' ' + parts[1] : '');
    }

    function kindName(kind) {
        var map = { tv: 'TV', movie: 'Movie', ova: 'OVA', ona: 'ONA', special: 'Special', tv_special: 'TV Special', music: 'Music', pv: 'PV', cm: 'CM' };
        return map[kind] || (kind ? String(kind).toUpperCase() : 'Anime');
    }

    function statusName(status) {
        var map = { anons: 'анонс', ongoing: 'онгоинг', released: 'вышло' };
        return map[status] || status || '';
    }

    function sortName(sort) {
        var map = { popularity: 'популярность', ranked: 'рейтинг', name: 'название', aired_on: 'дата выхода' };
        return map[sort] || sort || '';
    }

    function titleOf(data) {
        var settings = readSettings();
        if (settings.title_language === 'original') return data.name || data.english || data.russian || 'Shikimori';
        if (settings.title_language === 'en') return data.english || data.name || data.russian || 'Shikimori';
        return data.russian || data.name || data.english || 'Shikimori';
    }

    function posterOf(data) {
        var poster = data && data.poster ? data.poster.originalUrl : '';
        if (poster && poster.indexOf('//') === 0) poster = 'https:' + poster;
        if (poster && poster.indexOf('http') !== 0) poster = SHIKI_HOST + poster;
        return poster || 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="440"><rect width="100%" height="100%" fill="#22252d"/><text x="50%" y="50%" fill="#777" font-family="Arial" font-size="24" text-anchor="middle">Shikimori</text></svg>');
    }

    function readGenreCache() {
        var cache = storageGet(GENRES_CACHE_KEY, []);
        return cache && cache.length ? cache : [];
    }

    function isAdultGenre(genre) {
        var name = String((genre && (genre.name || genre.russian)) || '').toLowerCase();
        return !!adultGenres[name];
    }

    function filterGenres(genres) {
        var settings = readSettings();
        var result = [];
        var i;
        for (i = 0; i < genres.length; i++) {
            if (genres[i] && genres[i].entry_type && genres[i].entry_type !== 'Anime') continue;
            if (!settings.hide_adult || !isAdultGenre(genres[i])) result.push(genres[i]);
        }
        return result;
    }

    function loadGenres(callback) {
        var cache = readGenreCache();
        var usedCache = false;
        if (cache.length) {
            usedCache = true;
            callback(filterGenres(cache));
        }
        $.ajax({
            url: SHIKI_HOST + '/api/genres',
            dataType: 'json',
            timeout: 12000,
            success: function (genres) {
                if (!genres || !genres.length) return;
                storageSet(GENRES_CACHE_KEY, genres);
                if (!usedCache) callback(filterGenres(genres));
            },
            error: function () {
                if (!cache.length) callback([]);
            }
        });
    }

    function requestAnime(params, oncomplete, onerror) {
        var page = parseInt(params.page, 10) || 1;
        var parts = ['limit: ' + PAGE_LIMIT, 'page: ' + page, 'order: ' + gqlValue(params.sort || readSettings().default_sort)];
        if (params.search) parts.push('search: "' + gqlValue(params.search) + '"');
        if (params.kind) parts.push('kind: "' + gqlValue(params.kind) + '"');
        if (params.status) parts.push('status: "' + gqlValue(params.status) + '"');
        if (params.season) parts.push('season: "' + gqlValue(params.season) + '"');
        if (params.genre) parts.push('genre: "' + gqlValue(params.genre) + '"');
        $.ajax({
            url: SHIKI_HOST + '/api/graphql',
            method: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            timeout: 15000,
            data: JSON.stringify({ query: '{ animes(' + parts.join(', ') + ') { id name russian english japanese kind score status season airedOn { year } poster { originalUrl } } }' }),
            success: function (answer) {
                oncomplete(answer && answer.data && answer.data.animes ? answer.data.animes : []);
            },
            error: function (xhr) {
                notify('Shikimori: не удалось загрузить каталог');
                if (onerror) onerror(xhr);
            }
        });
    }

    function openAnime(data) {
        $.ajax({
            url: ARM_HOST + '/api/v2/ids?source=myanimelist&id=' + encodeURIComponent(data.id) + '&include=themoviedb,myanimelist',
            dataType: 'json',
            timeout: 12000,
            success: function (answer) {
                if (answer && answer.themoviedb) {
                    openTmdb(answer, data);
                    return;
                }
                notify('TMDB-сопоставление не найдено. Shikimori: ' + SHIKI_HOST + '/animes/' + data.id);
            },
            error: function () {
                notify('Не удалось найти TMDB. Shikimori: ' + SHIKI_HOST + '/animes/' + data.id);
            }
        });
    }

    function openTmdb(item, shiki) {
        var type = item.media_type || item.type || (shiki.kind === 'movie' ? 'movie' : 'tv');
        var movie = {
            id: item.id || item.tmdb_id || item.themoviedb,
            title: item.title || item.name || titleOf(shiki),
            original_title: item.original_title || item.original_name || shiki.name,
            name: item.name || item.title || titleOf(shiki),
            original_name: item.original_name || item.original_title || shiki.name,
            poster_path: item.poster_path || '',
            backdrop_path: item.backdrop_path || '',
            vote_average: item.vote_average || 0,
            shikimori: shiki
        };
        if (!movie.id) {
            notify('TMDB ID не найден. Shikimori: ' + SHIKI_HOST + '/animes/' + shiki.id);
            return;
        }
        Lampa.Activity.push({ url: '', title: movie.title, component: 'full', id: movie.id, method: type === 'movie' ? 'movie' : 'tv', card: movie, source: 'tmdb' });
    }

    function authUrl() {
        var auth = readAuth();
        if (!auth.client_id || !auth.redirect_uri) return '';
        return SHIKI_HOST + '/oauth/authorize?client_id=' + encodeURIComponent(auth.client_id) + '&redirect_uri=' + encodeURIComponent(auth.redirect_uri) + '&response_type=code&scope=';
    }

    function requestTokenByCode(code, callback) {
        var auth = readAuth();

        if (!auth.client_id || !auth.client_secret || !auth.redirect_uri) {
            notify('Введите Client ID, Client Secret и Redirect URI');
            return;
        }

        $.ajax({
            url: SHIKI_HOST + '/oauth/token',
            method: 'POST',
            dataType: 'json',
            timeout: 15000,
            data: {
                grant_type: 'authorization_code',
                client_id: auth.client_id,
                client_secret: auth.client_secret,
                code: code,
                redirect_uri: auth.redirect_uri
            },
            success: function (answer) {
                saveTokenAnswer(answer);
                if (callback) callback();
            },
            error: function () {
                notify('Shikimori: не удалось получить токен');
            }
        });
    }

    function refreshToken(callback) {
        var auth = readAuth();

        if (!auth.client_id || !auth.client_secret || !auth.refresh_token) {
            notify('Shikimori: нет данных для обновления токена');
            return;
        }

        $.ajax({
            url: SHIKI_HOST + '/oauth/token',
            method: 'POST',
            dataType: 'json',
            timeout: 15000,
            data: {
                grant_type: 'refresh_token',
                client_id: auth.client_id,
                client_secret: auth.client_secret,
                refresh_token: auth.refresh_token
            },
            success: function (answer) {
                saveTokenAnswer(answer);
                if (callback) callback();
            },
            error: function () {
                notify('Shikimori: не удалось обновить токен');
            }
        });
    }

    function saveTokenAnswer(answer) {
        var auth = readAuth();
        var expires = parseInt(answer && answer.expires_in, 10) || 86400;

        auth.access_token = answer && answer.access_token ? answer.access_token : '';
        auth.refresh_token = answer && answer.refresh_token ? answer.refresh_token : auth.refresh_token;
        auth.expires_at = Date.now() + expires * 1000;
        saveAuth(auth);
        notify('Авторизация Shikimori сохранена');
    }

    function withAccessToken(callback) {
        var auth = readAuth();
        if (isAuthorized()) {
            callback(auth.access_token);
            return;
        }
        if (auth.refresh_token) {
            refreshToken(function () {
                callback(readAuth().access_token);
            });
            return;
        }
        notify('Shikimori: требуется авторизация');
    }

    function loadWhoami() {
        withAccessToken(function (token) {
            $.ajax({
                url: SHIKI_HOST + '/api/users/whoami',
                method: 'GET',
                dataType: 'json',
                timeout: 12000,
                headers: { Authorization: 'Bearer ' + token },
                success: function (user) {
                    var auth = readAuth();
                    auth.nickname = user && user.nickname ? user.nickname : '';
                    saveAuth(auth);
                    notify(auth.nickname ? 'Shikimori: ' + auth.nickname : 'Shikimori: профиль получен');
                },
                error: function () {
                    notify('Shikimori: не удалось проверить профиль');
                }
            });
        });
    }

    function Card(data) {
        var settings = readSettings();
        var year = data && data.airedOn ? data.airedOn.year : '';
        var season = seasonName(data.season);
        var compact = settings.card_size === 'compact' ? ' Shikimori--compact' : '';
        var score = data.score && data.score !== '0.0' ? data.score : '—';
        var meta = [];
        if (season) meta.push(season);
        else if (year) meta.push(year);
        if (data.status) meta.push(statusName(data.status));
        this.data = data;
        this.render = function () {
            return $('<div class="card Shikimori selector' + compact + '" data-id="' + esc(data.id) + '">' +
                '<div class="card__view"><img class="card__img" src="' + esc(posterOf(data)) + '" />' +
                '<div class="Shikimori-card__rating">' + esc(score) + '</div><div class="Shikimori-card__badge">' + esc(kindName(data.kind)) + '</div></div>' +
                '<div class="card__title">' + esc(titleOf(data)) + '</div><div class="Shikimori-card__meta">' + esc(meta.join(' • ')) + '</div></div>');
        };
    }

    function cloneParams(params) {
        var copy = {};
        var key;
        params = params || {};
        for (key in params) if (params.hasOwnProperty(key) && params[key] !== undefined && params[key] !== null && params[key] !== '') copy[key] = params[key];
        return copy;
    }

    function Catalog(object) {
        var params = cloneParams(object);
        var scroll = new Lampa.Scroll({ over: true, step: 250 });
        var html = $('<div class="Shikimori-module"></div>');
        var head = $('<div class="Shikimori-head"></div>');
        var quick = $('<div class="Shikimori-quick"></div>');
        var active = $('<div class="Shikimori-active"></div>');
        var body = $('<div class="Shikimori-body"></div>');
        var last;
        var rendered = false;
        var loading = false;
        var ended = false;
        var autoLoading = false;

        params.page = parseInt(params.page, 10) || 1;
        if (!params.sort) params.sort = readSettings().default_sort;

        this.render = function () {
            if (!rendered) {
                rendered = true;
                html.append(head).append(quick).append(active).append(scroll.render());
                scroll.append(body);
                bindScrollFallback();
                bindAutoLoad();
                buildHeader();
                load(false);
            }
            return html;
        };

        this.create = this.render;

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () { moveFocus('left'); },
                right: function () { moveFocus('right'); },
                up: function () { moveFocus('up'); },
                down: function () { moveFocus('down'); },
                back: function () { if (Lampa.Activity && Lampa.Activity.backward) Lampa.Activity.backward(); },
                enter: function () { enterFocused(); }
            });
            Lampa.Controller.toggle('content');
        };

        this.stop = function () {};
        this.pause = function () {};
        this.destroy = function () {
            html.off('.shikimoriScroll');
            scroll.render().off('.shikimoriScroll');
            scroll.destroy();
            html.remove();
        };

        function buildHeader() {
            head.empty();
            quick.empty();
            active.empty();
            addHeadButton('Главная', function () { openWith({ page: 1, sort: readSettings().default_sort, search: '', status: '', kind: '', season: '', genre: '', genre_title: '' }); });
            addHeadButton('Поиск', openSearch);
            addHeadButton('Фильтры', openFilters);
            addHeadButton('Сезоны', openSeasons);
            addHeadButton('Настройки', openSettings);
            addQuick('Популярное', { sort: 'popularity', status: '', kind: '', season: '', genre: '', genre_title: '', search: '' });
            addQuick('Онгоинги', { status: 'ongoing', sort: 'popularity', kind: '', season: '', genre: '', genre_title: '', search: '' });
            addQuick('Анонсы', { status: 'anons', sort: 'popularity', kind: '', season: '', genre: '', genre_title: '', search: '' });
            addQuick('Фильмы', { kind: 'movie', sort: 'popularity', status: '', season: '', genre: '', genre_title: '', search: '' });
            addQuick('Текущий сезон', { season: currentSeasonCode(), sort: 'popularity', status: '', kind: '', genre: '', genre_title: '', search: '' });
            if (hasActiveFilters()) addQuick('Сброс', { page: 1, sort: readSettings().default_sort, search: '', status: '', kind: '', season: '', genre: '', genre_title: '' }, true);
            renderActive();
        }

        function bindPress(element, action) {
            var locked = false;
            var run = function () {
                if (locked) return;
                locked = true;
                setTimeout(function () {
                    locked = false;
                }, 280);
                action();
            };
            element.data('action', run);
            element.on('hover:enter click tap mouseup', function () { run(); });
            element.on('keydown keyup', function (e) {
                var code = e.keyCode || e.which;
                if (code === 13 || code === 32) {
                    if (e.type === 'keyup') run();
                    e.preventDefault();
                    return false;
                }
            });
        }

        function bindScrollFallback() {
            var target = scroll.render();

            target.addClass('scroll--wheel');

            html.on('wheel.shikimoriScroll mousewheel.shikimoriScroll DOMMouseScroll.shikimoriScroll', function (e) {
                var original = e.originalEvent || e;
                var delta = original.deltaY || -original.wheelDelta || original.detail * 40 || 0;
                if (scroll && scroll.wheel) scroll.wheel(delta);
                e.preventDefault();
                return false;
            });

            html.on('keydown.shikimoriScroll', function (e) {
                var code = e.keyCode || e.which;
                if (code === 38) {
                    moveFocus('up');
                    e.preventDefault();
                } else if (code === 40) {
                    moveFocus('down');
                    e.preventDefault();
                } else if (code === 37) {
                    moveFocus('left');
                    e.preventDefault();
                } else if (code === 39) {
                    moveFocus('right');
                    e.preventDefault();
                } else if (code === 33) {
                    if (scroll && scroll.wheel) scroll.wheel(-420);
                    e.preventDefault();
                } else if (code === 34) {
                    if (scroll && scroll.wheel) scroll.wheel(420);
                    e.preventDefault();
                }
            });
        }

        function bindAutoLoad() {
            scroll.onEnd = function () {
                loadNextPage(true);
            };
        }

        function scrollBy(delta) {
            if (scroll && scroll.wheel) scroll.wheel(delta);
        }

        function moveFocus(direction) {
            var before = Navigator.getFocusedElement ? Navigator.getFocusedElement() : $('.selector.focus');

            Navigator.move(direction);
            keepFocusVisible(direction, before);
        }

        function keepFocusVisible(direction, before) {
            var focused = Navigator.getFocusedElement ? Navigator.getFocusedElement() : $('.selector.focus');
            if (!focused || !focused.length || !focused.get(0)) {
                if (direction === 'down') scrollBy(260);
                else if (direction === 'up') scrollBy(-260);
                return;
            }

            if (before && before.length && before.get(0) === focused.get(0)) {
                if (direction === 'down') scrollBy(260);
                else if (direction === 'up') scrollBy(-260);
                return;
            }

            if (scroll && scroll.update) scroll.update(focused);
        }

        function addHeadButton(title, action) {
            var btn = $('<div class="simple-button selector Shikimori-head__button">' + esc(title) + '</div>');
            bindPress(btn, action);
            head.append(btn);
        }

        function addQuick(title, values, reset) {
            var selected = !reset && quickSelected(values);
            var btn = $('<div class="simple-button selector Shikimori-chip' + (selected ? ' Shikimori-chip--active' : '') + '">' + esc(title) + '</div>');
            bindPress(btn, function () { openWith(values); });
            quick.append(btn);
        }

        function quickSelected(values) {
            var key;
            var current;
            for (key in values) {
                if (values.hasOwnProperty(key)) {
                    current = key === 'sort' ? (params[key] || readSettings().default_sort) : (params[key] || '');
                    if (String(current) !== String(values[key] || '')) return false;
                }
            }
            return true;
        }

        function renderActive() {
            var parts = [];
            if (params.search) parts.push('поиск: ' + params.search);
            if (params.kind) parts.push('тип: ' + kindName(params.kind));
            if (params.status) parts.push('статус: ' + statusName(params.status));
            if (params.season) parts.push('сезон: ' + seasonName(params.season));
            if (params.genre) parts.push('жанр: ' + (params.genre_title || params.genre));
            if (params.sort && params.sort !== readSettings().default_sort) parts.push('сортировка: ' + sortName(params.sort));
            active.html(parts.length ? '<span>Активно:</span> ' + esc(parts.join(' / ')) : '<span>Shikimori</span> быстрый каталог аниме');
        }

        function hasActiveFilters() {
            return !!(params.search || params.kind || params.status || params.season || params.genre || (params.sort && params.sort !== readSettings().default_sort));
        }

        function openWith(values) {
            var next = cloneParams(params);
            var key;
            next.page = values.hasOwnProperty('page') ? values.page : 1;
            for (key in values) {
                if (values.hasOwnProperty(key)) {
                    if (values[key] === '') delete next[key];
                    else next[key] = values[key];
                }
            }
            if (!next.genre) delete next.genre_title;
            if (!next.sort) next.sort = readSettings().default_sort;
            Lampa.Activity.push({ url: '', title: 'Shikimori', component: 'shikimori', page: next.page, search: next.search || '', kind: next.kind || '', status: next.status || '', season: next.season || '', genre: next.genre || '', genre_title: next.genre_title || '', sort: next.sort || readSettings().default_sort });
        }

        function openSearch() {
            var value = params.search || '';
            if (window.Lampa && Lampa.Input && Lampa.Input.edit) {
                Lampa.Input.edit({ title: 'Поиск Shikimori', value: value, free: true }, function (text) {
                    text = String(text || '').replace(/^\s+|\s+$/g, '');
                    if (!text) {
                        notify('Введите название аниме');
                        return;
                    }
                    openWith({ search: text });
                });
                return;
            }
            value = window.prompt('Поиск Shikimori', value);
            if (value !== null) {
                value = String(value || '').replace(/^\s+|\s+$/g, '');
                if (value) openWith({ search: value });
                else notify('Введите название аниме');
            }
        }

        function openFilters() {
            loadGenres(function (genres) {
                var items = [
                    { title: 'Сортировка: популярность', value: 'sort:popularity' },
                    { title: 'Сортировка: рейтинг', value: 'sort:ranked' },
                    { title: 'TV', value: 'kind:tv' },
                    { title: 'Movie', value: 'kind:movie' },
                    { title: 'OVA', value: 'kind:ova' },
                    { title: 'Онгоинг', value: 'status:ongoing' },
                    { title: 'Анонс', value: 'status:anons' },
                    { title: 'Вышло', value: 'status:released' }
                ];
                var i;
                for (i = 0; i < genres.length; i++) {
                    if (genres[i] && genres[i].id) items.push({ title: 'Жанр: ' + (genres[i].russian || genres[i].name || genres[i].id), value: 'genre:' + genres[i].id + ':' + (genres[i].russian || genres[i].name || genres[i].id) });
                }
                if (!genres.length) items.push({ title: 'Жанры недоступны, используется кэш при наличии', value: 'noop' });
                showSelect('Фильтры Shikimori', items, function (item) { applyFilterValue(item.value); });
            });
        }

        function applyFilterValue(value) {
            var parts;
            var out = {};
            if (value === 'noop') return;
            parts = String(value).split(':');
            out[parts[0]] = parts[1];
            if (parts[0] === 'genre') out.genre_title = parts.slice(2).join(':') || parts[1];
            openWith(out);
        }

        function openSeasons() {
            var year = new Date().getFullYear();
            var items = [
                { title: 'Текущий сезон', value: currentSeasonCode() },
                { title: 'Зима ' + year, value: 'winter_' + year },
                { title: 'Весна ' + year, value: 'spring_' + year },
                { title: 'Лето ' + year, value: 'summer_' + year },
                { title: 'Осень ' + year, value: 'fall_' + year },
                { title: 'Прошлый год', value: String(year - 1) }
            ];
            showSelect('Сезоны', items, function (item) { openWith({ season: item.value }); });
        }

        function openSettings() {
            var settings = readSettings();
            var items = [
                { title: 'Язык названий: ' + settingTitleLanguage(settings.title_language), value: 'title_language' },
                { title: 'Скрывать 18+: ' + (settings.hide_adult ? 'да' : 'нет'), value: 'hide_adult' },
                { title: 'Сортировка по умолчанию: ' + sortName(settings.default_sort), value: 'default_sort' },
                { title: 'Размер карточек: ' + (settings.card_size === 'compact' ? 'компактный' : 'обычный'), value: 'card_size' },
                { title: 'Авторизация Shikimori: ' + authStatusTitle(), value: 'auth' }
            ];
            showSelect('Настройки Shikimori', items, function (item) { changeSetting(item.value); });
        }

        function settingTitleLanguage(value) {
            if (value === 'original') return 'оригинал';
            if (value === 'en') return 'английский';
            return 'русский';
        }

        function changeSetting(name) {
            var settings = readSettings();
            if (name === 'title_language') settings.title_language = settings.title_language === 'ru' ? 'original' : (settings.title_language === 'original' ? 'en' : 'ru');
            else if (name === 'hide_adult') settings.hide_adult = !settings.hide_adult;
            else if (name === 'default_sort') settings.default_sort = settings.default_sort === 'popularity' ? 'ranked' : (settings.default_sort === 'ranked' ? 'aired_on' : 'popularity');
            else if (name === 'card_size') settings.card_size = settings.card_size === 'normal' ? 'compact' : 'normal';
            else if (name === 'auth') {
                openAuthSettings();
                return;
            }
            saveSettings(settings);
            notify('Настройки Shikimori сохранены');
            openWith({ page: 1, sort: settings.default_sort });
        }

        function openAuthSettings() {
            var auth = readAuth();
            var items = [
                { title: 'Статус: ' + authStatusTitle(), value: 'whoami' },
                { title: 'Ввести Client ID', value: 'client_id' },
                { title: 'Ввести Client Secret', value: 'client_secret' },
                { title: 'Redirect URI: ' + auth.redirect_uri, value: 'redirect_uri' },
                { title: 'Скопировать ссылку авторизации', value: 'copy_url' },
                { title: 'Ввести код авторизации', value: 'code' },
                { title: 'Обновить токен', value: 'refresh' },
                { title: 'Выйти из Shikimori', value: 'logout' }
            ];
            showSelect('Авторизация Shikimori', items, function (item) { changeAuthSetting(item.value); });
        }

        function changeAuthSetting(name) {
            var auth = readAuth();
            var url;

            if (name === 'client_id') {
                askText('Client ID Shikimori', auth.client_id, function (value) {
                    auth.client_id = value;
                    saveAuth(auth);
                    notify('Client ID сохранён');
                });
            } else if (name === 'client_secret') {
                askText('Client Secret Shikimori', auth.client_secret, function (value) {
                    auth.client_secret = value;
                    saveAuth(auth);
                    notify('Client Secret сохранён локально');
                });
            } else if (name === 'redirect_uri') {
                askText('Redirect URI Shikimori', auth.redirect_uri, function (value) {
                    auth.redirect_uri = value || defaultAuth().redirect_uri;
                    saveAuth(auth);
                    notify('Redirect URI сохранён');
                });
            } else if (name === 'copy_url') {
                url = authUrl();
                if (!url) {
                    notify('Сначала введите Client ID и Redirect URI');
                    return;
                }
                copyOrShow(url, 'Ссылка авторизации скопирована');
            } else if (name === 'code') {
                askText('Код авторизации Shikimori', '', function (value) {
                    if (value) requestTokenByCode(value, loadWhoami);
                });
            } else if (name === 'refresh') {
                refreshToken(loadWhoami);
            } else if (name === 'whoami') {
                loadWhoami();
            } else if (name === 'logout') {
                saveAuth(defaultAuth());
                notify('Выход из Shikimori выполнен');
            }
        }

        function askText(title, value, callback) {
            if (window.Lampa && Lampa.Input && Lampa.Input.edit) {
                Lampa.Input.edit({ title: title, value: value || '', free: true }, function (text) {
                    callback(String(text || '').replace(/^\s+|\s+$/g, ''));
                });
                return;
            }
            value = window.prompt(title, value || '');
            if (value !== null) callback(String(value || '').replace(/^\s+|\s+$/g, ''));
        }

        function copyOrShow(text, message) {
            if (window.Lampa && Lampa.Utils && Lampa.Utils.copyTextToClipboard) {
                Lampa.Utils.copyTextToClipboard(text, function () { notify(message); });
            } else {
                notify(text);
            }
        }

        function showSelect(title, items, callback) {
            if (window.Lampa && Lampa.Select && Lampa.Select.show) {
                Lampa.Select.show({ title: title, items: items, onSelect: callback, onBack: function () { Lampa.Controller.toggle('content'); } });
                return;
            }
            if (items.length) callback(items[0]);
        }

        function load(append) {
            if (loading || ended && append) return;
            loading = true;
            body.find('.Shikimori-more').remove();
            if (!append) body.empty();
            body.append('<div class="Shikimori-loader' + (append ? ' Shikimori-loader--more' : '') + '">Загрузка...</div>');
            requestAnime(params, function (data) {
                var i;
                loading = false;
                body.find('.Shikimori-loader').remove();
                if (!append) body.empty();
                if (!data.length) {
                    ended = true;
                    if (append) return;
                    body.append('<div class="Shikimori-empty">Ничего не найдено</div>');
                    return;
                }
                autoLoading = false;
                if (data.length < PAGE_LIMIT) ended = true;
                for (i = 0; i < data.length; i++) appendCard(data[i]);
                if (!ended) addMoreButton();
                if (window.Lampa && Lampa.Controller) {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last || body.find('.selector').first(), scroll.render());
                }
            }, function () {
                autoLoading = false;
                loading = false;
                body.find('.Shikimori-loader').remove();
                if (append) addMoreButton();
                else body.append('<div class="Shikimori-empty">Ошибка загрузки</div>');
            });
        }

        function appendCard(item) {
            var card = new Card(item);
            var render = card.render();
            render.data('card', card);
            bindPress(render, function () { openAnime(item); });
            body.append(render);
        }

        function addMoreButton() {
            var more = $('<div class="simple-button selector Shikimori-more">Еще</div>');
            bindPress(more, function () {
                loadNextPage(false);
            });
            body.append(more);
        }

        function loadNextPage(auto) {
            if (loading || ended || autoLoading) return;
            autoLoading = !!auto;
            last = body.find('.Shikimori.card').last();
            params.page = (parseInt(params.page, 10) || 1) + 1;
            load(true);
        }

        function enterFocused() {
            var focused = Navigator.getFocusedElement ? Navigator.getFocusedElement() : $('.selector.focus');
            var action;
            if (!focused || !focused.length) return;
            last = focused;
            action = focused.data('action');
            if (action) action();
        }
    }

    function extendFull() {
        if (!window.Lampa || !Lampa.Listener || !Lampa.Listener.follow) return;
        Lampa.Listener.follow('full', function (event) {
            var card;
            var id;
            if (!event || event.type !== 'complite') return;
            if (!event.object || !event.object.activity) return;
            card = event.object.activity.card || {};
            id = card && card.shikimori && card.shikimori.id ? card.shikimori.id : '';
            if (id) {
                appendFull(event.object.activity, card.shikimori);
                return;
            }
            if (!card.id) return;
            $.ajax({
                url: ARM_HOST + '/api/v2/themoviedb?id=' + encodeURIComponent(card.id),
                dataType: 'json',
                timeout: 12000,
                success: function (answer) {
                    var mal = extractMalId(answer);
                    if (!mal) return;
                    $.ajax({
                        url: SHIKI_HOST + '/api/animes/' + encodeURIComponent(mal),
                        dataType: 'json',
                        timeout: 12000,
                        success: function (anime) { appendFull(event.object.activity, anime); }
                    });
                }
            });
        });
    }

    function extractMalId(answer) {
        var i;

        if (!answer) return '';
        if (answer.mal || answer.mal_id || answer.myanimelist) return answer.mal || answer.mal_id || answer.myanimelist;

        if (answer.length) {
            for (i = 0; i < answer.length; i++) {
                if (answer[i] && answer[i].myanimelist) return answer[i].myanimelist;
            }
        }

        return '';
    }

    function appendFull(activity, anime) {
        var page = $('.full-start, .full-start-new').last();
        var line;
        var url;
        var score;
        if (!page.length) page = $('.full').last();
        if (!anime || !anime.id || !page.length) return;
        if (page.find('.shikimori-full-extra').length) return;
        url = SHIKI_HOST + '/animes/' + anime.id;
        score = anime.score && anime.score !== '0.0' ? anime.score : '—';
        if (!page.find('.rate--shikimori').length) {
            page.find('.full-start__rate-line, .full-start-new__rate-line').first().append('<div class="rate rate--shikimori"><div>' + esc(score) + '</div><span>Shikimori</span></div>');
        }
        line = $('<div class="shikimori-full-extra"></div>');
        line.append('<div class="shikimori-full-extra__item"><span>Статус</span><b>' + esc(statusName(anime.status)) + '</b></div>');
        line.append('<div class="shikimori-full-extra__item"><span>Сезон</span><b>' + esc(seasonName(anime.season) || (anime.aired_on ? anime.aired_on : '—')) + '</b></div>');
        line.append('<div class="shikimori-full-extra__item"><span>Фандаб</span><b>' + esc(anime.fandubbers && anime.fandubbers.length ? anime.fandubbers.slice(0, 3).join(', ') : '—') + '</b></div>');
        line.append('<div class="shikimori-full-extra__item"><span>Фансаб</span><b>' + esc(anime.fansubbers && anime.fansubbers.length ? anime.fansubbers.slice(0, 3).join(', ') : '—') + '</b></div>');
        line.append('<div class="simple-button selector shikimori-full-extra__link">Открыть на Shikimori</div>');
        line.find('.shikimori-full-extra__link').on('hover:enter click tap mouseup', function () {
            if (window.Lampa && Lampa.Utils && Lampa.Utils.copyTextToClipboard) {
                Lampa.Utils.copyTextToClipboard(url, function () { notify('Ссылка Shikimori скопирована'); });
            } else {
                notify(url);
            }
        });
        page.find('.full-start__buttons, .full-start-new__buttons').first().after(line);
    }

    function addMenu() {
        var menu = $('.menu .menu__list').eq(0);
        var button;
        if (!menu.length || $('.menu__item.selector[data-action="shikimori"]').length) return;
        button = $('<li class="menu__item selector" data-action="shikimori"><div class="menu__ico"><svg viewBox="0 0 44 44" width="44" height="44"><circle cx="22" cy="22" r="19" fill="#c83a4b"/><path d="M13 29c2 3 5 5 9 5 6 0 10-3 10-8 0-4-2-6-8-8l-3-1c-3-1-4-2-4-4s2-3 5-3c3 0 5 1 7 3l3-4c-2-3-6-4-10-4-6 0-10 3-10 8 0 4 3 7 8 8l3 1c3 1 4 2 4 4s-2 3-5 3c-3 0-6-2-8-4l-1 4z" fill="#fff"/></svg></div><div class="menu__text">Shikimori</div></li>');
        button.on('hover:enter click tap mouseup', function () {
            Lampa.Activity.push({ url: '', title: 'Shikimori', component: 'shikimori', page: 1, sort: readSettings().default_sort });
        });
        menu.append(button);
    }

    function addStyles() {
        if ($('#shikimori-style').length) return;
        $('body').append('<style id="shikimori-style">' +
            '.Shikimori-module{padding:1.2em 1.5em 2.5em;color:#fff}' +
            '.Shikimori-module>.scroll{height:calc(100vh - 11em);overflow:hidden;position:relative}' +
            '.Shikimori-module>.scroll>.scroll__content{width:100%}' +
            '.Shikimori-module .scroll__body{width:100%}' +
            '.Shikimori-head,.Shikimori-quick{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-flow:row wrap;flex-flow:row wrap;margin-bottom:.75em}' +
            '.Shikimori-head__button,.Shikimori-chip,.Shikimori-more{margin:0 .55em .55em 0;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.08)}' +
            '.Shikimori-head__button.focus,.Shikimori-chip.focus,.Shikimori-more.focus,.shikimori-full-extra__link.focus{background:#c83a4b;color:#fff;border-color:#e95a68}' +
            '.Shikimori-chip--active{background:rgba(200,58,75,.28);border-color:rgba(200,58,75,.7)}' +
            '.Shikimori-active{font-size:1.05em;color:rgba(255,255,255,.62);margin:.15em 0 1em;line-height:1.35}' +
            '.Shikimori-active span{color:#e95a68;font-weight:600}' +
            '.Shikimori-body{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-flow:row wrap;flex-flow:row wrap;align-items:flex-start}' +
            '.Shikimori.card{width:13.8em;margin:0 1.1em 1.55em 0;position:relative}' +
            '.Shikimori.card.Shikimori--compact{width:11.4em}' +
            '.Shikimori.card .card__view{background:#1b1d24;border-radius:.35em;overflow:hidden;position:relative}' +
            '.Shikimori.card .card__img{display:block;width:100%;min-height:17em;object-fit:cover;background:#22252d}' +
            '.Shikimori.card.Shikimori--compact .card__img{min-height:14.5em}' +
            '.Shikimori.card.focus .card__view{box-shadow:0 0 0 .22em #fff,0 .4em 1.4em rgba(200,58,75,.45)}' +
            '.Shikimori-card__rating,.Shikimori-card__badge{position:absolute;top:.45em;padding:.25em .45em;border-radius:.25em;background:rgba(10,12,16,.82);font-size:.9em;line-height:1;color:#fff}' +
            '.Shikimori-card__rating{left:.45em;color:#ffd166}' +
            '.Shikimori-card__badge{right:.45em;color:#fff;background:rgba(200,58,75,.88)}' +
            '.Shikimori.card .card__title{font-size:1.06em;line-height:1.22;max-height:2.55em;overflow:hidden;margin-top:.55em}' +
            '.Shikimori-card__meta{font-size:.88em;line-height:1.25;color:rgba(255,255,255,.52);height:2.35em;overflow:hidden;margin-top:.25em}' +
            '.Shikimori-loader,.Shikimori-empty{font-size:1.2em;color:rgba(255,255,255,.68);padding:2em 0}' +
            '.Shikimori-loader--more{width:100%;font-size:1em;padding:1em 0;color:rgba(255,255,255,.48)}' +
            '.Shikimori-more{height:2.8em;line-height:2.8em;min-width:8em;text-align:center;margin-top:2em}' +
            '.shikimori-full-extra{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-flow:row wrap;flex-flow:row wrap;margin:1em 0;color:#fff}' +
            '.shikimori-full-extra__item{margin:0 1.3em .8em 0;min-width:8em}' +
            '.shikimori-full-extra__item span{display:block;color:rgba(255,255,255,.48);font-size:.88em;margin-bottom:.2em}' +
            '.shikimori-full-extra__item b{font-weight:500;color:#fff}' +
            '.shikimori-full-extra__link{margin:.1em 0 .8em 0}' +
        '</style>');
    }

    function start() {
        if (!window.Lampa || !window.$) return;
        addStyles();
        Lampa.Component.add('shikimori', Catalog);
        extendFull();
        if (window.appready) addMenu();
        else Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') addMenu();
        });
    }

    start();
})();
