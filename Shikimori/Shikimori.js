(function () {
    'use strict';

    if (window.plugin_shikimori_ready) return;
    window.plugin_shikimori_ready = true;

    var SETTINGS_KEY = 'shikimori_settings_v1';
    var GENRES_CACHE_KEY = 'shikimori_genres_cache_v1';
    var SHIKI_HOST = 'https://shikimori.one';
    var ARM_HOST = 'https://arm.haglund.dev';
    var adultGenres = { hentai: true, erotica: true, yaoi: true, yuri: true };

    function defaults() {
        return { title_language: 'ru', hide_adult: true, default_sort: 'popularity', card_size: 'normal', tmdb_proxy: 'auto' };
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
        var parts = ['limit: 24', 'page: ' + page, 'order: ' + gqlValue(params.sort || readSettings().default_sort)];
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

    function useTmdbProxy(url) {
        var proxy = '';
        try {
            proxy = Lampa.Storage.get('proxy_tmdb', '') || Lampa.Storage.get('tmdb_proxy', '') || '';
        } catch (e) {}
        return proxy ? proxy + encodeURIComponent(url) : url;
    }

    function openAnime(data) {
        $.ajax({
            url: useTmdbProxy(ARM_HOST + '/api/v2/themoviedb?title=' + encodeURIComponent(titleOf(data))),
            dataType: 'json',
            success: function (answer) {
                var results = answer && answer.results ? answer.results : answer;
                var list = results && results.length ? results : (results && results.id ? [results] : []);
                var item;
                var i;
                for (i = 0; i < list.length; i++) {
                    item = list[i];
                    if (item && (item.media_type === 'movie' || item.media_type === 'tv' || item.type === 'movie' || item.type === 'tv' || item.id)) {
                        openTmdb(item, data);
                        return;
                    }
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
            id: item.id || item.tmdb_id,
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

        params.page = parseInt(params.page, 10) || 1;
        if (!params.sort) params.sort = readSettings().default_sort;

        this.create = function () {
            html.append(head).append(quick).append(active).append(scroll.render());
            scroll.render().append(body);
            buildHeader();
            load();
            return html;
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () { Navigator.move('left'); },
                right: function () { Navigator.move('right'); },
                up: function () { Navigator.move('up'); },
                down: function () { Navigator.move('down'); },
                back: function () { if (Lampa.Activity && Lampa.Activity.backward) Lampa.Activity.backward(); },
                enter: function () { enterFocused(); }
            });
            Lampa.Controller.toggle('content');
        };

        this.stop = function () {};
        this.pause = function () {};
        this.destroy = function () {
            scroll.destroy();
            html.remove();
        };

        function buildHeader() {
            head.empty();
            quick.empty();
            active.empty();
            addHeadButton('Главная', function () { openWith({ page: 1, sort: readSettings().default_sort, search: '', status: '', kind: '', season: '', genre: '' }); });
            addHeadButton('Поиск', openSearch);
            addHeadButton('Фильтры', openFilters);
            addHeadButton('Сезоны', openSeasons);
            addHeadButton('Настройки', openSettings);
            addQuick('Популярное', { sort: 'popularity', status: '', kind: '', season: '', genre: '', search: '' });
            addQuick('Онгоинги', { status: 'ongoing', sort: 'popularity', kind: '', season: '', genre: '', search: '' });
            addQuick('Анонсы', { status: 'anons', sort: 'popularity', kind: '', season: '', genre: '', search: '' });
            addQuick('Фильмы', { kind: 'movie', sort: 'popularity', status: '', season: '', genre: '', search: '' });
            addQuick('Текущий сезон', { season: currentSeasonCode(), sort: 'popularity', status: '', kind: '', genre: '', search: '' });
            if (hasActiveFilters()) addQuick('Сброс', { page: 1, sort: readSettings().default_sort, search: '', status: '', kind: '', season: '', genre: '' }, true);
            renderActive();
        }

        function bindPress(element, action) {
            element.data('action', action);
            element.on('hover:enter click tap mouseup', function () { action(); });
            element.on('keydown keyup', function (e) {
                var code = e.keyCode || e.which;
                if (code === 13 || code === 32) {
                    if (e.type === 'keyup') action();
                    e.preventDefault();
                    return false;
                }
            });
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
            for (key in values) {
                if (values.hasOwnProperty(key) && values[key] && params[key] !== values[key]) return false;
            }
            return true;
        }

        function renderActive() {
            var parts = [];
            if (params.search) parts.push('поиск: ' + params.search);
            if (params.kind) parts.push('тип: ' + kindName(params.kind));
            if (params.status) parts.push('статус: ' + statusName(params.status));
            if (params.season) parts.push('сезон: ' + seasonName(params.season));
            if (params.genre) parts.push('жанр: ' + params.genre);
            if (params.sort && params.sort !== readSettings().default_sort) parts.push('сортировка: ' + sortName(params.sort));
            active.html(parts.length ? '<span>Активно:</span> ' + esc(parts.join(' / ')) : '<span>Shikimori</span> быстрый каталог аниме');
        }

        function hasActiveFilters() {
            return !!(params.search || params.kind || params.status || params.season || params.genre || (params.sort && params.sort !== readSettings().default_sort));
        }

        function openWith(values) {
            var next = cloneParams(params);
            var key;
            next.page = values.page || 1;
            for (key in values) {
                if (values.hasOwnProperty(key)) {
                    if (values[key] === '') delete next[key];
                    else next[key] = values[key];
                }
            }
            if (!next.sort) next.sort = readSettings().default_sort;
            Lampa.Activity.push({ url: '', title: 'Shikimori', component: 'shikimori', page: next.page, search: next.search || '', kind: next.kind || '', status: next.status || '', season: next.season || '', genre: next.genre || '', sort: next.sort || readSettings().default_sort });
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
                    if (genres[i] && genres[i].name) items.push({ title: 'Жанр: ' + (genres[i].russian || genres[i].name), value: 'genre:' + genres[i].name });
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
            out[parts[0]] = parts.slice(1).join(':');
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
                { title: 'TMDB proxy: из настроек Lampa', value: 'tmdb_proxy' },
                { title: 'Размер карточек: ' + (settings.card_size === 'compact' ? 'компактный' : 'обычный'), value: 'card_size' }
            ];
            showSelect('Настройки Shikimori', items, function (item) { changeSetting(item.value); });
        }

        function settingTitleLanguage(value) {
            if (value === 'original') return 'оригинал';
            if (value === 'en') return 'English';
            return 'русский';
        }

        function changeSetting(name) {
            var settings = readSettings();
            if (name === 'title_language') settings.title_language = settings.title_language === 'ru' ? 'original' : (settings.title_language === 'original' ? 'en' : 'ru');
            else if (name === 'hide_adult') settings.hide_adult = !settings.hide_adult;
            else if (name === 'default_sort') settings.default_sort = settings.default_sort === 'popularity' ? 'ranked' : (settings.default_sort === 'ranked' ? 'aired_on' : 'popularity');
            else if (name === 'card_size') settings.card_size = settings.card_size === 'normal' ? 'compact' : 'normal';
            saveSettings(settings);
            notify('Настройки Shikimori сохранены');
            openWith({ page: 1, sort: settings.default_sort });
        }

        function showSelect(title, items, callback) {
            if (window.Lampa && Lampa.Select && Lampa.Select.show) {
                Lampa.Select.show({ title: title, items: items, onSelect: callback, onBack: function () { Lampa.Controller.toggle('content'); } });
                return;
            }
            if (items.length) callback(items[0]);
        }

        function load() {
            body.append('<div class="Shikimori-loader">Загрузка...</div>');
            requestAnime(params, function (data) {
                body.empty();
                if (!data.length) {
                    body.append('<div class="Shikimori-empty">Ничего не найдено</div>');
                    return;
                }
                data.forEach(function (item) {
                    var card = new Card(item);
                    var render = card.render();
                    render.data('card', card);
                    bindPress(render, function () { openAnime(item); });
                    body.append(render);
                });
                addMoreButton();
                if (window.Lampa && Lampa.Controller) {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last || body.find('.selector').first(), scroll.render());
                }
            }, function () {
                body.find('.Shikimori-loader').remove();
                body.append('<div class="Shikimori-empty">Ошибка загрузки</div>');
            });
        }

        function addMoreButton() {
            var more = $('<div class="simple-button selector Shikimori-more">Еще</div>');
            bindPress(more, function () {
                var next = cloneParams(params);
                next.page = (parseInt(next.page, 10) || 1) + 1;
                openWith(next);
            });
            body.append(more);
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
                success: function (answer) {
                    var mal = answer && (answer.mal || answer.mal_id || answer.id);
                    if (!mal) return;
                    $.ajax({
                        url: SHIKI_HOST + '/api/animes/' + encodeURIComponent(mal),
                        dataType: 'json',
                        success: function (anime) { appendFull(event.object.activity, anime); }
                    });
                }
            });
        });
    }

    function appendFull(activity, anime) {
        var page = $('.full-start, .full-start-new, .full');
        var line;
        var url;
        var score;
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
