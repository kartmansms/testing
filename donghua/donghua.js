/**
 * Donghua Plugin for Lampa v1.0.0
 *
 * Каталог китайской анимации (дунхуа) для медиа-центра Lampa.
 * Источник данных: TMDB — жанр «Анимация» (16) с оригинальным языком zh,
 * запросы идут через встроенный в Lampa TMDB-прокси (Lampa.TMDB.api /
 * Lampa.TMDB.image), поэтому плагин работает и там, где api.themoviedb.org
 * недоступен напрямую.
 *
 * Возможности:
 * - Каталог дунхуа: сериалы и фильмы TMDB с русскими названиями и постерами
 * - Быстрые подборки: Популярное, Онгоинги, Анонсы, Фильмы, Топ рейтинга
 * - Фильтры: тип, статус, жанр, сортировка; бесконечная прокрутка
 * - Поиск по китайским анимационным тайтлам (поиск TMDB с фильтром zh + анимация)
 * - Открытие полной страницы TMDB (родной компонент Lampa 'full')
 * - Навигация с ТВ-пульта (Android TV, Tizen) с восстановлением фокуса
 *
 * @author kartmansms
 * @license MIT
 */

(function () {
    'use strict';

    if (window.plugin_donghua_ready) return;
    window.plugin_donghua_ready = true;

    var SETTINGS_KEY = 'donghua_settings_v1';

    var TMDB_API_KEY = '4ef0d7355d9ffb5151e987764708ce96';
    var PAGE_LIMIT = 20; // TMDB discover/search отдаёт 20 элементов на страницу

    // Оригинальные языки, которые TMDB использует для китайских тайтлов
    var zhLanguages = { zh: true, cn: true, 'zh-CN': true, 'zh-TW': true, 'zh-HK': true };

    /**
     * Фильтры жанров. У TMDB id жанров зависят от типа (tv/movie),
     * поэтому храним общий slug и два набора id.
     */
    var genreFilters = [
        { slug: '', title: 'Любой' },
        { slug: 'action', title: 'Экшен и приключения', tv: '10759', movie: '28' },
        { slug: 'comedy', title: 'Комедия', tv: '35', movie: '35' },
        { slug: 'drama', title: 'Драма', tv: '18', movie: '18' },
        { slug: 'mystery', title: 'Детектив', tv: '9648', movie: '9648' },
        { slug: 'fantasy', title: 'Фэнтези', tv: '10765', movie: '14' },
        { slug: 'science_fiction', title: 'Фантастика', tv: '10765', movie: '878' },
        { slug: 'romance', title: 'Романтика', tv: '18', movie: '10749' }
    ];

    var statusFilters = [
        { slug: '', title: 'Любой' },
        { slug: 'ongoing', title: 'Онгоинги' },
        { slug: 'finished', title: 'Завершённые' },
        { slug: 'anons', title: 'Анонсы' }
    ];

    var mediaFilters = [
        { slug: '', title: 'Все' },
        { slug: 'tv', title: 'Сериалы' },
        { slug: 'movie', title: 'Фильмы' }
    ];

    function defaults() {
        return {
            card_size: 'normal',
            default_sort: 'popularity',
            min_votes: '5'
        };
    }

    // ─── Storage Helpers ───────────────────────────────────────────────

    /**
     * Чтение значения из Lampa.Storage с fallback на localStorage.
     * @param {string} key - Ключ хранилища
     * @param {*} fallback - Значение по умолчанию если ключ не найден
     * @returns {*} Сохранённое значение или fallback
     */
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
                try {
                    return JSON.parse(raw);
                } catch (e) {
                    return fallback;
                }
            }
            return fallback;
        } catch (err) {
            return fallback;
        }
    }

    /**
     * Запись значения в Lampa.Storage с fallback на localStorage.
     * @param {string} key - Ключ хранилища
     * @param {*} value - Значение
     */
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

    /** Настройки плагина (merge с дефолтом — устойчиво к новым полям). */
    function readSettings() {
        var saved = storageGet(SETTINGS_KEY, {});

        var settings = defaults();

        for (var key in saved) {
            if (saved.hasOwnProperty(key) && saved[key] !== undefined && saved[key] !== null) {
                settings[key] = saved[key];
            }
        }

        return settings;
    }

    /** Сохранить настройки плагина. */
    function saveSettings(settings) {
        storageSet(SETTINGS_KEY, settings);
    }

    /** Короткое уведомление через Lampa.Noty. */
    function notify(message) {
        try {
            if (window.Lampa && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(message);
        } catch (e) {}
    }

    /** Экранирование HTML в выводе. */
    function esc(value) {
        value = value === undefined || value === null ? '' : String(value);

        return value.replace(/[&<>"']/g, function (symbol) {
            switch (symbol) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                default: return '&#39;';
            }
        });
    }

    /** Сегодняшняя дата в формате YYYY-MM-DD (для фильтра анонсов). */
    function todayStr() {
        var now = new Date();
        var month = now.getMonth() + 1;
        var day = now.getDate();

        return now.getFullYear() + '-' + (month < 10 ? '0' + month : month) + '-' + (day < 10 ? '0' + day : day);
    }

    // ─── TMDB Helpers ──────────────────────────────────────────────────

    /**
     * URL TMDB API. Через Lampa.TMDB.api() запросы идут через прокси Lampa
     * (если включён в настройках), иначе — напрямую.
     * @param {string} path - Путь с query-строкой, напр. 'discover/tv?api_key=...'
     */
    function tmdbApiUrl(path) {
        if (window.Lampa && Lampa.TMDB && typeof Lampa.TMDB.api === 'function') {
            return Lampa.TMDB.api(path);
        }

        return 'https://api.themoviedb.org/3/' + path;
    }

    /**
     * URL картинки TMDB. Через Lampa.TMDB.image() — с поддержкой прокси.
     * @param {string} path - poster_path/backdrop_path или полный URL
     * @param {string} [size] - размер 'w342' (по умолчанию) или другой
     */
    function tmdbPosterUrl(path, size) {
        path = path === undefined || path === null ? '' : String(path).trim();

        if (!path) return '';
        if (/^https?:\/\//.test(path)) return path;

        var sub = 't/p/' + (size || 'w342') + (path.indexOf('/') === 0 ? path : '/' + path);

        if (window.Lampa && Lampa.TMDB && typeof Lampa.TMDB.image === 'function') {
            return Lampa.TMDB.image(sub);
        }

        return 'https://image.tmdb.org/' + sub;
    }

    /** Текущий язык Lampa (по умолчанию 'ru' — русские названия TMDB). */
    function tmdbLanguage() {
        try {
            return window.Lampa && Lampa.Storage ? Lampa.Storage.get('language', 'ru') : 'ru';
        } catch (e) {
            return 'ru';
        }
    }

    /**
     * Универсальный хелпер для JSON-запросов. Использует Lampa.Reguest или $.ajax.
     * При временных сетевых сбоях выполняется одна повторная попытка.
     * @param {string} url - URL API
     * @param {Function} success - Колбэк с распарсенным JSON
     * @param {Function} [error] - Колбэк ошибки (опционально)
     */
    function apiGetJson(url, success, error) {
        var retried = false;

        function isRetryable(xhr, status) {
            if (status === 'timeout' || status === 'parsererror') return true;

            if (status === 'error' || status === undefined || status === null) {
                return !xhr || !xhr.status || xhr.status >= 500;
            }

            return false;
        }

        function handleError(xhr, status) {
            if (!retried && isRetryable(xhr, status)) {
                retried = true;
                setTimeout(attempt, 1500);
                return;
            }
            if (error) error(xhr);
        }

        function attempt() {
            if (window.Lampa && typeof Lampa.Reguest === 'function') {
                try {
                    var network = new Lampa.Reguest();
                    if (typeof network.timeout === 'function') network.timeout(12000);
                    if (typeof network.silent === 'function') {
                        network.silent(url, success, function (xhr) {
                            handleError(xhr);
                        });
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
                    error: function (xhr, status) {
                        handleError(xhr, status);
                    }
                });
            } else {
                console.error('Donghua: no network method available');
            }
        }

        attempt();
    }

    // ─── Names & Mappings ──────────────────────────────────────────────

    function lookupTitle(list, slug) {
        for (var i = 0; i < list.length; i++) {
            if (list[i].slug === slug) return list[i].title;
        }
        return slug;
    }

    function genreIdFor(slug, media) {
        for (var i = 0; i < genreFilters.length; i++) {
            if (genreFilters[i].slug === slug) return genreFilters[i][media] || '';
        }
        return '';
    }

    function sortName(sort) {
        var map = { popularity: 'Популярность', rating: 'Рейтинг', new: 'Новые' };
        return map[sort] || sort;
    }

    function mediaName(media) {
        return lookupTitle(mediaFilters, media);
    }

    function statusName(status) {
        return lookupTitle(statusFilters, status);
    }

    /**
     * Параметры discover для одного типа (tv/movie) с учётом фильтров.
     * @returns {string|null} query-строка для tmdbApiUrl или null если тип не подходит под статус
     */
    function discoverQuery(media, params, page, sort) {
        var status = params.status || '';
        var settings = readSettings();
        var minVotes = parseInt(settings.min_votes, 10) || 0;

        // Статусы имеют смысл только для сериалов; для фильмов — только анонсы
        if (media === 'movie' && (status === 'ongoing' || status === 'finished')) return null;

        var sortMap = media === 'movie'
            ? { popularity: 'popularity.desc', rating: 'vote_average.desc', new: 'primary_release_date.desc' }
            : { popularity: 'popularity.desc', rating: 'vote_average.desc', new: 'first_air_date.desc' };

        var query = 'discover/' + media + '?api_key=' + TMDB_API_KEY +
            '&language=' + encodeURIComponent(tmdbLanguage()) +
            '&include_adult=false' +
            '&page=' + page +
            '&sort_by=' + (sortMap[sort] || sortMap.popularity);

        var genreId = params.genre ? genreIdFor(params.genre, media) : '';

        query += '&with_genres=16' + (genreId ? ',' + encodeURIComponent(genreId) : '');
        query += '&with_original_language=zh';

        if (minVotes > 0) query += '&vote_count.gte=' + minVotes;

        if (status === 'ongoing') query += '&status=0'; // Returning Series
        else if (status === 'finished') query += '&status=3,4'; // Ended + Canceled
        else if (status === 'anons') {
            if (media === 'movie') query += '&primary_release_date.gte=' + todayStr();
            else query += '&status=1,2'; // Planned + In Production
        }

        return query;
    }

    /**
     * Привести элемент ответа TMDB к карточке с media_type.
     * @param {Object} item - Элемент results
     * @param {string} type - 'tv' или 'movie'
     * @returns {Object|null} null если элемент не подходит (без постера и т.п.)
     */
    function mapTmdbItem(item, type) {
        if (!item || !item.id || !item.poster_path) return null;

        item.media_type = type;

        return item;
    }

    // ─── API Requests ──────────────────────────────────────────────────

    /**
     * Запрос каталога дунхуа. Для типа «все» выполняет два параллельных
     * запроса (tv + movie) и чередует результаты.
     *
     * @param {Object} params - Параметры активности (page, media, status, sort, genre)
     * @param {Function} oncomplete - Вызывается с { list: [...], ended: boolean }
     * @param {Function} [onerror] - Колбэк ошибки (опционально)
     */
    function requestDonghua(params, oncomplete, onerror) {
        if (params.search) {
            requestSearch(params, oncomplete, onerror);
            return;
        }

        var page = parseInt(params.page, 10) || 1;
        var sort = params.sort || readSettings().default_sort;
        var media = params.media || 'all';

        var useTv = media !== 'movie';
        var useMovie = media === 'movie' || (media === 'all' && (params.status === '' || params.status === undefined || params.status === 'anons'));

        var tasks = [];

        if (useTv) {
            var tvQuery = discoverQuery('tv', params, page, sort);

            if (tvQuery) tasks.push({ media: 'tv', query: tvQuery });
        }

        if (useMovie) {
            var movieQuery = discoverQuery('movie', params, page, sort);

            if (movieQuery) tasks.push({ media: 'movie', query: movieQuery });
        }

        if (!tasks.length) {
            oncomplete({ list: [], ended: true });
            return;
        }

        var results = {};
        var tasksLeft = tasks.length;
        var hadError = false;

        function finish() {
            tasksLeft--;

            if (tasksLeft > 0) return;

            if (hadError) {
                notify('Donghua: не удалось загрузить каталог');
                if (onerror) onerror();
                return;
            }

            var list = [];
            var ended = true;

            // Чередуем tv/movie, чтобы в «все» типы шли вперемешку
            for (var i = 0; i < PAGE_LIMIT; i++) {
                for (var j = 0; j < tasks.length; j++) {
                    var part = results[tasks[j].media] || [];

                    if (part[i]) list.push(part[i]);
                }
            }

            for (var k = 0; k < tasks.length; k++) {
                var part2 = results[tasks[k].media] || [];

                if (part2.length >= PAGE_LIMIT) ended = false;
            }

            oncomplete({ list: list, ended: ended });
        }

        for (var i = 0; i < tasks.length; i++) {
            (function (task) {
                apiGetJson(tmdbApiUrl(task.query), function (res) {
                    if (!(res && res.results) || res.success === false) {
                        hadError = true;
                        finish();
                        return;
                    }

                    var items = res.results;
                    var mapped = [];

                    for (var m = 0; m < items.length; m++) {
                        var mappedItem = mapTmdbItem(items[m], task.media);
                        if (mappedItem) mapped.push(mappedItem);
                    }

                    results[task.media] = mapped;
                    finish();
                }, function () {
                    hadError = true;
                    finish();
                });
            })(tasks[i]);
        }
    }

    /**
     * Поиск по TMDB (multi) с фильтром: китайское производство + анимация.
     * @param {Object} params - Параметры (search, page)
     * @param {Function} oncomplete - Вызывается с { list, ended }
     * @param {Function} [onerror] - Колбэк ошибки
     */
    function requestSearch(params, oncomplete, onerror) {
        var page = parseInt(params.page, 10) || 1;

        var url = tmdbApiUrl('search/multi?api_key=' + TMDB_API_KEY +
            '&language=' + encodeURIComponent(tmdbLanguage()) +
            '&include_adult=false' +
            '&page=' + page +
            '&query=' + encodeURIComponent(params.search));

        apiGetJson(url, function (res) {
            if (res && res.success === false) {
                if (onerror) onerror();
                return;
            }

            var items = res && res.results ? res.results : [];
            var list = [];

            for (var i = 0; i < items.length; i++) {
                var item = items[i];

                if (item.media_type !== 'tv' && item.media_type !== 'movie') continue;
                if (!item.poster_path) continue;
                if (!zhLanguages[item.original_language]) continue;
                if (!item.genre_ids || item.genre_ids.indexOf(16) === -1) continue;

                list.push(mapTmdbItem(item, item.media_type));
            }

            // Конец пагинации считаем по страницам TMDB: клиентский фильтр
            // (zh + анимация) может сильно сокращать выдачу, но не страницы
            var totalPages = res && res.total_pages ? parseInt(res.total_pages, 10) || 1 : 1;
            var ended = page >= totalPages || page >= 500;

            oncomplete({ list: list, ended: ended });
        }, function () {
            notify('Donghua: не удалось выполнить поиск');
            if (onerror) onerror();
        });
    }

    // ─── Full Page ─────────────────────────────────────────────────────

    /**
     * Открыть полную страницу TMDB. Данные уже в формате TMDB,
     * поэтому Lookup-цепочка (как в плагине Shikimori) не нужна.
     * @param {Object} item - Карточка TMDB с media_type
     */
    function openCard(item) {
        var type = item.media_type === 'movie' ? 'movie' : 'tv';

        var card = {
            id: item.id,
            title: item.title || item.name || '',
            original_title: item.original_title || item.original_name || '',
            name: item.title || item.name || '',
            original_name: item.original_title || item.original_name || '',
            poster_path: item.poster_path || '',
            backdrop_path: item.backdrop_path || '',
            vote_average: item.vote_average || 0,
            release_date: item.release_date || '',
            first_air_date: item.first_air_date || '',
            img: tmdbPosterUrl(item.poster_path)
        };

        if (!card.id) {
            notify('Donghua: не удалось открыть карточку');
            return;
        }

        if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.push === 'function') {
            Lampa.Activity.push({
                url: '',
                title: card.title,
                component: 'full',
                id: card.id,
                method: type,
                card: card,
                source: 'tmdb'
            });
        } else {
            notify('Donghua: Lampa Activity недоступна');
        }
    }

    // ─── Card & Catalog ────────────────────────────────────────────────

    /**
     * Конструктор карточки дунхуа в каталоге.
     * @param {Object} data - Карточка TMDB (name/title, poster_path, vote_average...)
     */
    function Card(data) {
        var settings = readSettings();
        var compact = settings.card_size === 'compact' ? ' Donghua--compact' : '';
        var year = String(data.first_air_date || data.release_date || '').substring(0, 4);
        var score = data.vote_average ? Number(data.vote_average).toFixed(1) : '—';
        var type = data.media_type === 'movie' ? 'Фильм' : 'Сериал';

        var noPosterSVG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="440">' +
            '<rect width="100%" height="100%" fill="#22252d"/>' +
            '<text x="50%" y="50%" fill="#777" font-family="Arial" font-size="22" text-anchor="middle">Нет постера</text>' +
            '</svg>'
        );

        var posterUrl = tmdbPosterUrl(data.poster_path);
        var imgSrc = posterUrl ? esc(posterUrl) : noPosterSVG;

        this.data = data;

        this.render = function () {
            var element = $(
                '<div class="card Donghua selector' + compact + '" data-id="' + esc(data.id) + '">' +
                    '<div class="card__view">' +
                        '<img class="card__img" src="' + imgSrc + '" />' +
                        '<div class="Donghua-card__rating">★ ' + esc(score) + '</div>' +
                        '<div class="Donghua-card__badge">' + esc(type) + '</div>' +
                    '</div>' +
                    '<div class="card__title">' + esc(data.title || data.name || '') + '</div>' +
                    '<div class="Donghua-card__meta">' + esc(year) + '</div>' +
                '</div>'
            );

            element.find('.card__img').on('error', function () {
                if (this.src !== noPosterSVG) this.src = noPosterSVG;
            });

            return element;
        };
    }

    /**
     * Компонент каталога: сетка карточек дунхуа с шапкой, фильтрами и пагинацией.
     * Регистрируется как Lampa компонент 'donghua'.
     * @param {Object} object - Параметры активности (page, media, status, sort, genre, search)
     */
    function Catalog(object) {
        var params = object || {};
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true,
            step: 250
        });

        var html = $('<div class="Donghua-module"></div>');
        var head = $('<div class="Donghua-head"></div>');
        var quick = $('<div class="Donghua-quick"></div>');
        var active = $('<div class="Donghua-active"></div>');
        var body = $('<div class="Donghua-body"></div>');

        var last;
        var lastCardId = null;
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
                scroll.minus();

                scroll.onWheel = function (step) {
                    var enabledController = Lampa.Controller.enabled && Lampa.Controller.enabled();

                    if (enabledController && enabledController.name !== 'content') Lampa.Controller.toggle('content');

                    if (step > 0) Navigator.move('down');
                    else Navigator.move('up');
                };

                scroll.onEnd = function () {
                    loadNextPage(true);
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

                    if (lastCardId) {
                        focusTarget = html.find('.selector[data-id="' + lastCardId + '"]')[0];
                    }

                    if (!focusTarget) focusTarget = last;

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
                    if (Navigator.canmove('down')) Navigator.move('down');
                },
                back: function () {
                    if (Lampa.Activity && Lampa.Activity.backward) Lampa.Activity.backward();
                },
                enter: function () {
                    var focused = html.find('.selector.focus');

                    if (focused.length) {
                        var action = focused.data('action');

                        if (action) action();
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

        function buildHeader() {
            head.empty();
            quick.empty();
            active.empty();

            addHeadButton('Главная', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', function () {
                openWith({
                    page: 1,
                    sort: readSettings().default_sort,
                    search: '',
                    media: '',
                    status: '',
                    genre: '',
                    genre_title: ''
                });
            });

            addHeadButton('Поиск', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>', openSearch);
            addHeadButton('Фильтры', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>', openFilters);
            addHeadButton('Настройки', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>', openSettings);

            addQuick('Популярное', {
                sort: 'popularity',
                media: '',
                status: '',
                genre: '',
                genre_title: '',
                search: ''
            });

            addQuick('Онгоинги', {
                status: 'ongoing',
                media: 'tv',
                sort: 'popularity',
                genre: '',
                genre_title: '',
                search: ''
            });

            addQuick('Анонсы', {
                status: 'anons',
                media: '',
                sort: 'popularity',
                genre: '',
                genre_title: '',
                search: ''
            });

            addQuick('Фильмы', {
                media: 'movie',
                status: '',
                sort: 'popularity',
                genre: '',
                genre_title: '',
                search: ''
            });

            addQuick('Топ рейтинга', {
                sort: 'rating',
                media: '',
                status: '',
                genre: '',
                genre_title: '',
                search: ''
            });

            if (
                params.search ||
                params.media ||
                params.status ||
                params.genre ||
                (params.sort && params.sort !== readSettings().default_sort)
            ) {
                addQuick('Сброс', {
                    page: 1,
                    sort: readSettings().default_sort,
                    search: '',
                    media: '',
                    status: '',
                    genre: '',
                    genre_title: ''
                }, true);
            }

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

                action(element);
            };

            element.data('action', run);
            element.on('hover:enter click tap mouseup', run);

            element.on('keydown keyup', function (e) {
                var code = e.keyCode || e.which;

                if (code === 13 || code === 32) {
                    if (e.type === 'keyup') run();

                    e.preventDefault();

                    return false;
                }
            });
        }

        function addHeadButton(title, iconSvg, action) {
            var btn = $('<div class="simple-button selector Donghua-head__button">' + iconSvg + '<span>' + esc(title) + '</span></div>');

            btn.on('hover:focus nav_focus', function () {
                last = btn[0];
            });

            bindPress(btn, action);
            head.append(btn);
        }

        function addQuick(title, values, reset) {
            var selected = !reset;

            if (selected) {
                for (var key in values) {
                    var current = key === 'sort'
                        ? (params[key] || readSettings().default_sort)
                        : (params[key] || '');

                    if (String(current) !== String(values[key] || '')) {
                        selected = false;
                        break;
                    }
                }
            }

            var btn = $('<div class="simple-button selector Donghua-chip' + (selected ? ' Donghua-chip--active' : '') + '">' + esc(title) + '</div>');

            btn.on('hover:focus nav_focus', function () {
                last = btn[0];
            });

            bindPress(btn, function () {
                openWith(values);
            });

            quick.append(btn);
        }

        function renderActive() {
            var parts = [];

            if (params.search) parts.push('поиск: ' + params.search);
            if (params.media) parts.push('тип: ' + mediaName(params.media));
            if (params.status) parts.push('статус: ' + statusName(params.status));
            if (params.genre) parts.push('жанр: ' + (params.genre_title || params.genre));
            if (params.sort && params.sort !== readSettings().default_sort) parts.push('сортировка: ' + sortName(params.sort));

            active.html(parts.length ? '<span>Активно:</span> ' + esc(parts.join(' / ')) : '<span>Дунхуа</span> китайская анимация');
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

            if (!next.sort) next.sort = readSettings().default_sort;

            Lampa.Activity.push({
                url: '',
                title: 'Дунхуа',
                component: 'donghua',
                page: next.page,
                search: next.search || '',
                media: next.media || '',
                status: next.status || '',
                genre: next.genre || '',
                genre_title: next.genre_title || '',
                sort: next.sort || readSettings().default_sort
            });
        }

        function openSearch(btnElement) {
            var value = params.search || '';

            if (window.Lampa && Lampa.Input && Lampa.Input.edit) {
                Lampa.Input.edit({
                    title: 'Поиск дунхуа',
                    value: value,
                    free: true
                }, function (text) {
                    text = String(text || '').trim();

                    if (!text) notify('Введите название');
                    else openWith({
                        search: text,
                        media: '',
                        status: '',
                        genre: '',
                        genre_title: ''
                    });

                    Lampa.Controller.toggle('content');

                    if (btnElement) {
                        Lampa.Controller.collectionSet(html);
                        Lampa.Controller.collectionFocus(btnElement, html);
                    }
                });
            } else {
                value = window.prompt('Поиск дунхуа', value);

                if (value !== null) {
                    value = String(value || '').trim();

                    if (value) openWith({
                        search: value,
                        media: '',
                        status: '',
                        genre: '',
                        genre_title: ''
                    });
                    else notify('Введите название');
                }
            }
        }

        function hasFilterSelection() {
            return params.media || params.status || params.genre ||
                (params.sort && params.sort !== readSettings().default_sort);
        }

        function openFilters() {
            var items = [
                {
                    title: 'Тип: ' + (params.media ? mediaName(params.media) : 'любой'),
                    value: 'media'
                },
                {
                    title: 'Статус: ' + (params.status ? statusName(params.status) : 'любой'),
                    value: 'status'
                },
                {
                    title: 'Жанр: ' + (params.genre_title || 'любой'),
                    value: 'genre'
                },
                {
                    title: 'Сортировка: ' + sortName(params.sort || readSettings().default_sort),
                    value: 'sort'
                }
            ];

            if (hasFilterSelection()) {
                items.push({
                    title: 'Сбросить фильтры',
                    value: 'reset'
                });
            }

            Lampa.Select.show({
                title: 'Фильтры',
                items: items,
                onSelect: function (item) {
                    if (item.value === 'media') openFilterMediaMenu();
                    else if (item.value === 'status') openFilterStatusMenu();
                    else if (item.value === 'genre') openFilterGenreMenu();
                    else if (item.value === 'sort') openFilterSortMenu();
                    else if (item.value === 'reset') {
                        openWith({
                            sort: readSettings().default_sort,
                            media: '',
                            status: '',
                            genre: '',
                            genre_title: '',
                            page: 1
                        });
                    }
                },
                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        }

        function selectedTitle(isSelected, title) {
            return isSelected ? '✓ ' + title : title;
        }

        function openFilterMediaMenu() {
            var current = params.media || '';
            var items = [];

            for (var i = 0; i < mediaFilters.length; i++) {
                items.push({
                    title: selectedTitle(current === mediaFilters[i].slug, mediaFilters[i].title),
                    value: mediaFilters[i].slug
                });
            }

            Lampa.Select.show({
                title: 'Тип',
                items: items,
                onSelect: function (item) {
                    openWith({ media: item.value, page: 1 });
                },
                onBack: function () {
                    openFilters();
                }
            });
        }

        function openFilterStatusMenu() {
            var current = params.status || '';
            var items = [];

            for (var i = 0; i < statusFilters.length; i++) {
                items.push({
                    title: selectedTitle(current === statusFilters[i].slug, statusFilters[i].title),
                    value: statusFilters[i].slug
                });
            }

            Lampa.Select.show({
                title: 'Статус',
                items: items,
                onSelect: function (item) {
                    openWith({ status: item.value, page: 1 });
                },
                onBack: function () {
                    openFilters();
                }
            });
        }

        function openFilterGenreMenu() {
            var current = params.genre || '';
            var items = [];

            for (var i = 0; i < genreFilters.length; i++) {
                items.push({
                    title: selectedTitle(current === genreFilters[i].slug, genreFilters[i].title),
                    value: genreFilters[i].slug,
                    genre_title: genreFilters[i].title
                });
            }

            Lampa.Select.show({
                title: 'Жанры',
                items: items,
                onSelect: function (item) {
                    openWith({
                        genre: item.value,
                        genre_title: item.value ? item.genre_title : '',
                        page: 1
                    });
                },
                onBack: function () {
                    openFilters();
                }
            });
        }

        function openFilterSortMenu() {
            var current = params.sort || readSettings().default_sort;
            var items = [
                { title: selectedTitle(current === 'popularity', 'Популярность'), value: 'popularity' },
                { title: selectedTitle(current === 'rating', 'Рейтинг'), value: 'rating' },
                { title: selectedTitle(current === 'new', 'Новые'), value: 'new' }
            ];

            Lampa.Select.show({
                title: 'Сортировка',
                items: items,
                onSelect: function (item) {
                    openWith({ sort: item.value, page: 1 });
                },
                onBack: function () {
                    openFilters();
                }
            });
        }

        // ─── Settings ────────────────────────────────────────────────────

        function openSettings(btnElement) {
            var settings = readSettings();

            var items = [
                {
                    title: 'Размер карточек: ' + (settings.card_size === 'compact' ? 'компактный' : 'обычный'),
                    value: 'card_size'
                },
                {
                    title: 'Сортировка по умолчанию: ' + sortName(settings.default_sort),
                    value: 'default_sort'
                },
                {
                    title: 'Минимум оценок: ' + (parseInt(settings.min_votes, 10) > 0 ? settings.min_votes : 'любой'),
                    value: 'min_votes'
                }
            ];

            Lampa.Select.show({
                title: 'Настройки Donghua',
                items: items,
                onSelect: function (item) {
                    if (item.value === 'card_size') {
                        openSettingSelect('card_size', 'Размер карточек', [
                            { title: 'Обычный', value: 'normal' },
                            { title: 'Компактный', value: 'compact' }
                        ], btnElement);
                    } else if (item.value === 'default_sort') {
                        openSettingSelect('default_sort', 'Сортировка по умолчанию', [
                            { title: 'Популярность', value: 'popularity' },
                            { title: 'Рейтинг', value: 'rating' },
                            { title: 'Новые', value: 'new' }
                        ], btnElement);
                    } else if (item.value === 'min_votes') {
                        openSettingSelect('min_votes', 'Минимум оценок', [
                            { title: 'Любой', value: '0' },
                            { title: '5', value: '5' },
                            { title: '20', value: '20' },
                            { title: '50', value: '50' }
                        ], btnElement);
                    }
                },
                onBack: function () {
                    Lampa.Controller.toggle('content');

                    if (btnElement) {
                        Lampa.Controller.collectionSet(html);
                        Lampa.Controller.collectionFocus(btnElement, html);
                    }
                }
            });
        }

        function openSettingSelect(key, title, options, btnElement) {
            var settings = readSettings();

            var items = [];

            for (var i = 0; i < options.length; i++) {
                items.push({
                    title: selectedTitle(String(settings[key]) === String(options[i].value), options[i].title),
                    value: options[i].value
                });
            }

            Lampa.Select.show({
                title: title,
                items: items,
                onSelect: function (item) {
                    var next = readSettings();
                    next[key] = item.value;
                    saveSettings(next);

                    notify('Сохранено');

                    openSettings(btnElement);
                },
                onBack: function () {
                    openSettings(btnElement);
                }
            });
        }

        // ─── Load & Pagination ───────────────────────────────────────────

        function load(append) {
            if (loading || (ended && append)) return;

            loading = true;

            body.find('.Donghua-more').remove();

            if (!append) {
                body.empty();
                last = null;
            }

            body.append('<div class="Donghua-loader' + (append ? ' Donghua-loader--more' : '') + '">Загрузка...</div>');

            requestDonghua(params, function (result) {
                loading = false;

                body.find('.Donghua-loader').remove();

                if (!append) body.empty();

                var data = result && result.list ? result.list : [];

                if (!data.length) {
                    ended = true;

                    if (!append) body.append('<div class="Donghua-empty">Ничего не найдено</div>');

                    return;
                }

                autoLoading = false;

                if (result.ended) ended = true;

                for (var i = 0; i < data.length; i++) appendCard(data[i]);

                if (!ended) addMoreButton();

                if (window.Lampa && Lampa.Controller) {
                    Lampa.Controller.collectionSet(html);
                    Lampa.Controller.collectionFocus(last || body.find('.selector').first(), html);
                }
            }, function () {
                autoLoading = false;
                loading = false;

                body.find('.Donghua-loader').remove();

                if (append) addMoreButton();
                else body.append('<div class="Donghua-empty">Ошибка загрузки</div>');
            });
        }

        function appendCard(item) {
            var card = new Card(item);
            var render = card.render();

            render.data('card', card);

            render.on('hover:focus nav_focus', function () {
                last = render[0];
                scroll.update(render, true);
            });

            bindPress(render, function () {
                lastCardId = item.id;
                openCard(item);
            });

            body.append(render);
        }

        function addMoreButton() {
            var more = $('<div class="simple-button selector Donghua-more">Еще</div>');

            more.on('hover:focus nav_focus', function () {
                last = more[0];
                scroll.update(more, true);
            });

            bindPress(more, function () {
                loadNextPage(false);
            });

            body.append(more);
        }

        function loadNextPage(auto) {
            if (loading || ended || autoLoading) return;

            autoLoading = !!auto;
            params.page = (parseInt(params.page, 10) || 1) + 1;

            load(true);
        }
    }

    // ─── Menu & Styles ─────────────────────────────────────────────────

    /** Добавить пункт «Дунхуа» в сайдбар Lampa. */
    function addMenu() {
        var menu = $('.menu .menu__list').eq(0);

        if (!menu.length || $('.menu__item.selector[data-action="donghua"]').length) return;

        var button = $(
            '<li class="menu__item selector" data-action="donghua">' +
                '<div class="menu__ico">' +
                    '<svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#c8963c" stroke-width="2" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg">' +
                        '<line x1="12" y1="2" x2="12" y2="5"/>' +
                        '<line x1="8" y1="3.5" x2="16" y2="3.5"/>' +
                        '<ellipse cx="12" cy="12.5" rx="7.5" ry="7"/>' +
                        '<path d="M6.5 10.5h11"/>' +
                        '<path d="M6.5 14.5h11"/>' +
                        '<path d="M12 5.5v14"/>' +
                        '<line x1="12" y1="19.5" x2="12" y2="22"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="menu__text">Дунхуа</div>' +
            '</li>'
        );

        button.on('hover:enter click tap mouseup', function () {
            Lampa.Activity.push({
                url: '',
                title: 'Дунхуа',
                component: 'donghua',
                page: 1,
                sort: readSettings().default_sort
            });
        });

        menu.append(button);
    }

    /**
     * Внедрить CSS стили плагина в страницу.
     * Защита по id #donghua-style от повторной инъекции.
     */
    function addStyles() {
        if ($('#donghua-style').length) return;

        $('body').append(
            '<style id="donghua-style">' +
                '.Donghua-module{padding:1.2em 1.5em 2.5em;color:#fff;height:100%;display:flex;flex-direction:column;box-sizing:border-box}' +
                '.Donghua-module>.scroll{flex:1;overflow:hidden;position:relative;width:100%}' +
                '.Donghua-module .scroll__body{width:100%}' +
                '.Donghua-head{display:flex;flex-wrap:wrap;margin-bottom:0.8em;gap:0.3em;}' +
                '.Donghua-quick{display:flex;flex-wrap:wrap;margin-bottom:0.8em;gap:0.25em;}' +
                '.Donghua-head__button,.Donghua-chip,.Donghua-more{' +
                    'display:inline-flex!important;align-items:center!important;justify-content:center!important;' +
                    'padding:0.65em 1.2em!important;height:auto!important;line-height:1!important;' +
                    'background:rgba(255,255,255,0.06)!important;border:1px solid rgba(255,255,255,0.04)!important;' +
                    'color:rgba(255,255,255,0.85);font-size:0.95em;font-weight:500;margin:0 0.3em 0.3em 0!important;' +
                    'transition:all 0.2s ease-in-out;border-radius:0.5em!important;outline:none!important;box-shadow:none!important;' +
                '}' +
                '.Donghua-chip{border-radius:1.5em!important;padding:0.5em 1.2em!important;font-size:0.88em;opacity:0.85;}' +
                '.Donghua-head__button svg{width:1.15em;height:1.15em;margin-right:0.45em;opacity:0.85;flex-shrink:0;transition:transform 0.2s;}' +
                '.Donghua-head__button.focus,.Donghua-chip.focus,.Donghua-more.focus{' +
                    'background:#c8963c!important;color:#fff!important;' +
                    'border-color:#e6b25e!important;transform:scale(1.05);' +
                    'box-shadow:0 0.4em 1.2em rgba(200,150,60,0.35)!important;' +
                '}' +
                '.Donghua-head__button.focus svg{transform:scale(1.1);opacity:1;}' +
                '.Donghua-chip--active{background:rgba(200,150,60,0.22)!important;border-color:rgba(200,150,60,0.55)!important;color:#ffd98e!important;opacity:1;}' +
                '.Donghua-active{font-size:1.05em;color:rgba(255,255,255,.62);margin:.15em 0 1em;line-height:1.35}' +
                '.Donghua-active span{color:#e6b25e;font-weight:600}' +
                '.Donghua-body{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-flow:row wrap;flex-flow:row wrap;align-items:flex-start;justify-content:flex-start;padding:1em .5em}' +
                '.Donghua.card{flex:0 0 14.285%;max-width:14.285%;padding:0 .6em;box-sizing:border-box;margin:0 0 1.5em 0;position:relative}' +
                '.Donghua.card.Donghua--compact{flex:0 0 10%;max-width:10%}' +
                '.Donghua.card .card__view{background:#1b1d24;border-radius:.35em;overflow:hidden;position:relative;padding-bottom:145%}' +
                '.Donghua.card .card__img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block;background:#22252d}' +
                '.Donghua.card.focus .card__view{box-shadow:0 0 0 .22em #fff,0 .4em 1.4em rgba(200,150,60,.45)}' +
                '.Donghua-card__rating,.Donghua-card__badge{position:absolute;top:.45em;padding:.25em .45em;border-radius:.25em;background:rgba(10,12,16,.82);font-size:.82em;line-height:1;color:#fff}' +
                '.Donghua-card__rating{left:.45em;color:#ffd166}' +
                '.Donghua-card__badge{right:.45em;color:#fff;background:rgba(200,150,60,.88)}' +
                '.Donghua.card .card__title{font-size:1.06em;line-height:1.22;max-height:2.55em;overflow:hidden;margin-top:.55em}' +
                '.Donghua-card__meta{font-size:.88em;line-height:1.25;color:rgba(255,255,255,.52);height:1.25em;overflow:hidden;margin-top:.25em}' +
                '.Donghua-loader,.Donghua-empty{width:100%;text-align:center;font-size:1.2em;color:rgba(255,255,255,.68);padding:2em 0}' +
                '.Donghua-loader--more{width:100%;font-size:1em;padding:1em 0;color:rgba(255,255,255,.48)}' +
                '.Donghua-more{height:2.8em;line-height:2.8em;min-width:8em;text-align:center;margin-top:2em}' +
            '</style>'
        );
    }

    // ─── Entry Point ───────────────────────────────────────────────────

    /**
     * Точка входа плагина. Регистрирует компонент, меню и стили.
     * Если Lampa/$ ещё не загружены (скрипт подключён раньше приложения),
     * повторяет попытки до ~15 секунд вместо молчаливого выхода.
     */
    function start() {
        if (!window.Lampa || !window.$) {
            var attempts = 0;
            var retryTimer = setInterval(function () {
                attempts++;

                if (window.Lampa && window.$) {
                    clearInterval(retryTimer);
                    start();
                    return;
                }

                if (attempts >= 50) clearInterval(retryTimer);
            }, 300);
            return;
        }

        addStyles();

        Lampa.Component.add('donghua', Catalog);

        if (window.appready) {
            addMenu();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') addMenu();
            });
        }
    }

    start();
})();
