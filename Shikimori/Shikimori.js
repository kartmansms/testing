/**
 * Shikimori Plugin for Lampa (Fixed for Russia)
 *
 * Плагин интеграции с базой аниме Shikimori для медиацентра Lampa.
 * Исправлено: карточки открываются без TMDB, постеры грузятся через
 * Shikimori CDN + Jikan (MAL) как fallback.
 *
 * @version 3.1.0
 * @license MIT
 */
(function () {
    'use strict';

    if (window.plugin_shikimori_ready) return;
    window.plugin_shikimori_ready = true;

    var SETTINGS_KEY = 'shikimori_settings_v2';
    var GENRES_CACHE_KEY = 'shikimori_genres_cache_v1';
    var POSTER_CACHE_KEY = 'shikimori_poster_cache_v1';
    var AUTH_KEY = 'shikimori_auth_v1';
    var PAGE_LIMIT = 48;
    var adultGenres = { hentai: true, erotica: true, yaoi: true, yuri: true };
    var posterRequests = {};
    var fullResolveCache = {};

    // ==================== Storage ====================

    function storageGet(key, fallback) {
        try {
            var value = Lampa.Storage.get(key, fallback);
            return value === undefined || value === null ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function storageSet(key, value) {
        try {
            Lampa.Storage.set(key, value);
        } catch (e) {}
    }

    // ==================== Settings ====================

    function defaults() {
        return {
            title_language: 'original',
            hide_adult: true,
            default_sort: 'popularity',
            card_size: 'normal',
            shiki_host: 'https://shikimori.one'
        };
    }

    function readSettings() {
        var base = defaults();
        var saved = storageGet(SETTINGS_KEY, {});
        for (var key in saved) {
            if (saved.hasOwnProperty(key)) base[key] = saved[key];
        }
        return base;
    }

    function saveSettings(settings) {
        storageSet(SETTINGS_KEY, settings || defaults());
    }

    function getShikiHost() {
        var settings = readSettings();
        return (settings.shiki_host || 'https://shikimori.one').replace(/\/$/, '');
    }

    // ==================== Auth ====================

    function defaultAuth() {
        return {
            id: 0, client_id: '', client_secret: '',
            redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
            access_token: '', refresh_token: '', expires_at: 0, nickname: ''
        };
    }

    function readAuth() {
        var base = defaultAuth();
        var saved = storageGet(AUTH_KEY, {});
        for (var key in saved) {
            if (saved.hasOwnProperty(key)) base[key] = saved[key];
        }
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

    // ==================== Utilities ====================

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

    function seasonName(code) {
        var map = { winter: 'зима', spring: 'весна', summer: 'лето', fall: 'осень' };
        if (!code) return '';
        var parts = String(code).split('_');
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts[0] + '-' + parts[1];
        if (parts.length === 1 && !isNaN(parts[0])) return parts[0] + ' год';
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

    function originalTitleOf(data) {
        var settings = readSettings();
        if (settings.title_language === 'original') return data.russian || data.english || '';
        if (settings.title_language === 'en') return data.name || data.russian || '';
        return data.name || data.english || '';
    }

    // ==================== Poster Handling ====================

    function normalizePosterUrl(url) {
        url = url === undefined || url === null ? '' : String(url).trim();
        if (!url) return '';
        if (/^\/\//.test(url)) return 'https:' + url;

        var shikiHost = getShikiHost();
        var cleanHost = shikiHost.replace(/^https?:\/\//, '');

        if (/^https?:\/\//.test(url)) {
            return url.replace('shikimori.one', cleanHost).replace('shikimori.io', cleanHost);
        }
        return shikiHost + (url.indexOf('/') === 0 ? url : '/' + url);
    }

    function isBadPosterUrl(url) {
        url = String(url || '').toLowerCase();
        return !url ||
            url.indexOf('missing_original') !== -1 ||
            url.indexOf('missing_preview') !== -1 ||
            url.indexOf('missing_main') !== -1 ||
            url.indexOf('/assets/globals/missing') !== -1 ||
            url.indexOf('/images/missing') !== -1;
    }

    function pushPosterUrl(list, value) {
        var url = normalizePosterUrl(value);
        if (!url || isBadPosterUrl(url)) return;
        if (list.indexOf(url) === -1) list.push(url);
    }

    function posterUrls(data) {
        var list = [];
        var poster = data && data.poster ? data.poster : {};
        var image = data && data.image ? data.image : {};

        pushPosterUrl(list, poster.originalUrl || poster.original_url);
        pushPosterUrl(list, image.original);
        pushPosterUrl(list, poster.mainUrl || poster.main_url);
        pushPosterUrl(list, poster.previewUrl || poster.preview_url);
        pushPosterUrl(list, image.preview);
        pushPosterUrl(list, poster.x96Url || poster.x96_url || image.x96);
        pushPosterUrl(list, poster.x48Url || poster.x48_url || image.x48);

        return list;
    }

    function posterOf(data) {
        var list = posterUrls(data);
        return list.length ? list[0] : '';
    }

    function installPosterFallback(img, urls, fallback, data) {
        img = $(img);
        urls = urls || [];

        img.data('poster-index', 0);
        img.data('poster-external-tried', false);
        img.data('poster-fallback-done', false);

        function setFallback() {
            if (img.data('poster-fallback-done')) return;
            img.data('poster-fallback-done', true);
            img.attr('src', fallback);
        }

        function tryExternalPoster() {
            if (img.data('poster-external-tried')) { setFallback(); return; }
            img.data('poster-external-tried', true);

            resolveExternalPoster(data, function (url) {
                if (url) img.attr('src', url);
                else setFallback();
            });
        }

        img.on('error', function () {
            if (img.data('poster-fallback-done')) return;
            var index = parseInt(img.data('poster-index'), 10) || 0;
            index += 1;
            img.data('poster-index', index);
            if (urls[index]) img.attr('src', urls[index]);
            else tryExternalPoster();
        });

        if (!urls.length) tryExternalPoster();
    }

    function saveResolvedPoster(animeId, posterUrl) {
        var cache = storageGet(POSTER_CACHE_KEY, {});
        var normalizedUrl = posterUrl ? String(posterUrl).trim() : '';
        if (normalizedUrl) cache[animeId] = normalizedUrl;
        else delete cache[animeId];
        storageSet(POSTER_CACHE_KEY, cache);
    }

    function finishPosterRequest(animeId, posterUrl) {
        var callbacks = posterRequests[animeId] || [];
        var normalizedUrl = posterUrl ? String(posterUrl).trim() : '';
        delete posterRequests[animeId];
        saveResolvedPoster(animeId, normalizedUrl);
        for (var i = 0; i < callbacks.length; i++) callbacks[i](normalizedUrl || '');
    }

    function fetchMalPoster(malId, callback) {
        if (!malId) { callback(''); return; }

        var url = 'https://api.jikan.moe/v4/anime/' + encodeURIComponent(malId);
        apiGetJson(url, function (res) {
            var entry = res && res.data ? res.data : null;
            if (!entry) { callback(''); return; }
            var images = entry.images || {};
            var jpg = images.jpg || {};
            callback(jpg.large_image_url || jpg.image_url || '');
        }, function () { callback(''); });
    }

    function finishPosterByTmdbSearch(data) {
        if (!window.Lampa || !Lampa.TMDB || typeof Lampa.TMDB.api !== 'function') {
            finishPosterRequest(data.id, '');
            return;
        }
        var title = data.english || data.name || data.russian || '';
        if (!title) { finishPosterRequest(data.id, ''); return; }

        var searchType = data.kind === 'movie' ? 'movie' : 'tv';
        Lampa.TMDB.api('search/' + searchType + '?query=' + encodeURIComponent(title), function (res) {
            var results = res && res.results ? res.results : [];
            for (var i = 0; i < results.length; i++) {
                var item = results[i];
                if ((item.media_type === 'tv' || item.media_type === 'movie') && item.poster_path) {
                    finishPosterRequest(data.id, Lampa.TMDB.image(item.poster_path));
                    return;
                }
            }
            finishPosterRequest(data.id, '');
        }, function () { finishPosterRequest(data.id, ''); });
    }

    function resolvePosterByShikiDetails(data, callback) {
        if (!data || !data.id) { callback('', 0); return; }
        fetchShikiAnimeById(data.id, function (anime) {
            var poster = anime ? posterOf(anime) : '';
            var malId = anime ? (anime.mal_id || anime.myanimelist_id || 0) : 0;
            if (isBadPosterUrl(poster)) callback('', malId);
            else callback(poster || '', malId);
        });
    }

    function resolveExternalPoster(data, callback) {
        if (!data || !data.id) { callback(''); return; }

        var posterCache = storageGet(POSTER_CACHE_KEY, {});
        var cachedPoster = posterCache[data.id] || '';
        if (cachedPoster) { callback(cachedPoster); return; }

        if (posterRequests[data.id]) { posterRequests[data.id].push(callback); return; }
        posterRequests[data.id] = [callback];

        resolvePosterByShikiDetails(data, function (shikiPoster, shikiMalId) {
            if (shikiPoster) { finishPosterRequest(data.id, shikiPoster); return; }

            var malId = shikiMalId || data.mal_id || data.myanimelist_id || data.myanimelist || 0;
            if (malId) {
                fetchMalPoster(malId, function (malPoster) {
                    if (malPoster) finishPosterRequest(data.id, malPoster);
                    else finishPosterByTmdbSearch(data);
                });
            } else {
                finishPosterByTmdbSearch(data);
            }
        });
    }

    // ==================== Genre Handling ====================

    function isAdultGenre(genre) {
        var name = String((genre && (genre.name || genre.russian)) || '').toLowerCase();
        return !!adultGenres[name];
    }

    function filterGenres(genres) {
        var settings = readSettings();
        var result = [];
        for (var i = 0; i < genres.length; i++) {
            if (genres[i] && genres[i].entry_type && genres[i].entry_type !== 'Anime') continue;
            if (!settings.hide_adult || !isAdultGenre(genres[i])) result.push(genres[i]);
        }
        return result;
    }

    function loadGenres(callback) {
        var cache = storageGet(GENRES_CACHE_KEY, []);
        if (cache && cache.length) { callback(filterGenres(cache)); return; }

        apiGetJson(getShikiHost() + '/api/genres', function (genres) {
            if (!genres || !genres.length) { callback([]); return; }
            storageSet(GENRES_CACHE_KEY, genres);
            callback(filterGenres(genres));
        }, function () { callback([]); });
    }

    // ==================== API Calls ====================

    function apiCall(options, success, error) {
        var network = new Lampa.Reguest();
        network.timeout(15000);
        network.silent(
            options.url,
            success || function () {},
            error || function () {},
            options.data || null,
            { headers: options.headers || {}, method: options.method || 'GET' }
        );
    }

    function apiGetJson(url, success, error) {
        apiCall({ url: url }, success, error);
    }

    function buildSmartQueries(value, queriesArray) {
        if (!value) return;
        var str = String(value);
        var cleaned = str
            .replace(/\b(Season|Part|Cour)\s*\d*\.?\d*\b/gi, '')
            .replace(/\b(\d+(st|nd|rd|th)? Season)\b/gi, '')
            .replace(/\b(Сезон|Часть|Кур)\s*\d*\.?\d*\b/gi, '')
            .replace(/\b(\d+(-й|-я|-ое|-е)? Сезон)\b/gi, '')
            .replace(/[\(\[\{].*?[\)\]\}]/g, '')
            .replace(/[^\wа-яёА-ЯЁ\s:\-]/gi, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();

        if (cleaned && queriesArray.indexOf(cleaned) === -1) queriesArray.push(cleaned);

        var splitPos = cleaned.search(/[:\-]/);
        var shortCleaned = '';
        if (splitPos > 0) {
            shortCleaned = cleaned.substring(0, splitPos).trim();
            if (shortCleaned && shortCleaned.length > 1 && queriesArray.indexOf(shortCleaned) === -1) {
                queriesArray.push(shortCleaned);
            }
        }

        var stripRegex = /\s+(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|II|III|IV|V|VI|VII|VIII|IX|X)$/i;
        var noDigitFull = cleaned.replace(stripRegex, '').trim();
        if (noDigitFull && noDigitFull !== cleaned && noDigitFull.length > 1 && queriesArray.indexOf(noDigitFull) === -1) {
            queriesArray.push(noDigitFull);
        }
        if (shortCleaned) {
            var noDigitShort = shortCleaned.replace(stripRegex, '').trim();
            if (noDigitShort && noDigitShort !== shortCleaned && noDigitShort.length > 1 && queriesArray.indexOf(noDigitShort) === -1) {
                queriesArray.push(noDigitShort);
            }
        }
    }

    function getAnimeYear(data) {
        return data && data.airedOn && data.airedOn.year ? parseInt(data.airedOn.year, 10) : 0;
    }

    // ==================== Shikimori Integration ====================

    function requestAnime(params, oncomplete, onerror_cb) {
        var page = parseInt(params.page, 10) || 1;
        var sort = params.sort || readSettings().default_sort;

        var doREST = function (token) {
            var url = getShikiHost() + '/api/animes?limit=' + PAGE_LIMIT + '&page=' + page + '&order=' + encodeURIComponent(sort);
            if (params.search) url += '&search=' + encodeURIComponent(params.search);
            if (params.kind) url += '&kind=' + encodeURIComponent(params.kind);
            if (params.status) url += '&status=' + encodeURIComponent(params.status);
            if (params.season) url += '&season=' + encodeURIComponent(params.season);
            if (params.genre) url += '&genre=' + encodeURIComponent(params.genre);
            if (params.mylist) url += '&mylist=' + encodeURIComponent(params.mylist);

            var headers = {};
            if (token) headers.Authorization = 'Bearer ' + token;

            var onSuccess = function (data) {
                if (!Array.isArray(data)) {
                    if (data && data.errors) notify('Shikimori: Ошибка запроса к API');
                    oncomplete([]);
                    return;
                }
                var mapped = [];
                for (var i = 0; i < data.length; i++) {
                    var item = data[i];
                    mapped.push({
                        id: item.id, name: item.name, russian: item.russian,
                        english: item.english || '', japanese: item.japanese || '',
                        kind: item.kind, score: item.score, status: item.status,
                        season: item.season || '',
                        airedOn: { year: item.aired_on ? String(item.aired_on).substring(0, 4) : '' },
                        mal_id: item.mal_id || item.myanimelist_id || item.myanimelist || item.mal || 0,
                        poster: {
                            originalUrl: (item.poster && (item.poster.originalUrl || item.poster.original_url)) || (item.image && item.image.original) || '',
                            mainUrl: (item.poster && (item.poster.mainUrl || item.poster.main_url)) || '',
                            previewUrl: (item.poster && (item.poster.previewUrl || item.poster.preview_url)) || (item.image && item.image.preview) || '',
                            x96Url: (item.poster && (item.poster.x96Url || item.poster.x96_url)) || (item.image && item.image.x96) || '',
                            x48Url: (item.poster && (item.poster.x48Url || item.poster.x48_url)) || (item.image && item.image.x48) || ''
                        },
                        image: item.image || null
                    });
                }
                oncomplete(mapped);
            };

            var onError = function (xhr) {
                notify('Shikimori: не удалось загрузить каталог');
                if (onerror_cb) onerror_cb(xhr);
            };

            if (token) apiCall({ url: url, method: 'GET', headers: headers }, onSuccess, onError);
            else apiGetJson(url, onSuccess, onError);
        };

        if (params.mylist) withAccessToken(doREST);
        else doREST(null);
    }

    function fetchShikiAnimeById(id, callback) {
        if (!id) { callback(null); return; }
        apiGetJson(getShikiHost() + '/api/animes/' + encodeURIComponent(id), function (anime) {
            callback(anime && anime.id ? mapShikiAnime(anime) : null);
        }, function () { callback(null); });
    }

    function mapShikiAnime(item) {
        if (!item) return null;
        return {
            id: item.id, name: item.name, russian: item.russian,
            english: item.english || '', japanese: item.japanese || '',
            kind: item.kind, score: item.score, status: item.status,
            season: item.season || '',
            airedOn: { year: item.aired_on ? String(item.aired_on).substring(0, 4) : '' },
            mal_id: item.mal_id || item.myanimelist_id || item.myanimelist || item.mal || 0,
            poster: {
                originalUrl: (item.poster && (item.poster.originalUrl || item.poster.original_url)) || (item.image && item.image.original) || '',
                mainUrl: (item.poster && (item.poster.mainUrl || item.poster.main_url)) || '',
                previewUrl: (item.poster && (item.poster.previewUrl || item.poster.preview_url)) || (item.image && item.image.preview) || '',
                x96Url: (item.poster && (item.poster.x96Url || item.poster.x96_url)) || (item.image && item.image.x96) || '',
                x48Url: (item.poster && (item.poster.x48Url || item.poster.x48_url)) || (item.image && item.image.x48) || ''
            },
            image: item.image || null,
            description: item.description || '',
            episodes: item.episodes || 0,
            episodes_aired: item.episodes_aired || 0,
            url: item.url || ''
        };
    }

    function searchShikiAnimeByTitle(activity, callback) {
        var card = getFullCard(activity);
        var year = getCardYear(card);
        var queries = [];

        buildSmartQueries(card.title, queries);
        buildSmartQueries(card.name, queries);
        buildSmartQueries(card.original_title, queries);
        buildSmartQueries(card.original_name, queries);
        buildSmartQueries(activity && activity.title, queries);

        if (!queries.length) { callback(null); return; }

        var index = 0;

        function next() {
            if (index >= queries.length) { callback(null); return; }
            var query = queries[index++];
            var url = getShikiHost() + '/api/animes?limit=10&search=' + encodeURIComponent(query);

            apiGetJson(url, function (list) {
                var best = null;
                if (Array.isArray(list) && list.length) {
                    for (var i = 0; i < list.length; i++) {
                        var item = list[i];
                        if (!best) best = item;
                        if (year && item.aired_on) {
                            var itemYear = parseInt(String(item.aired_on).substring(0, 4), 10);
                            var isValidYear = item.kind === 'tv'
                                ? (itemYear >= year - 2 && itemYear <= year + 20)
                                : (Math.abs(itemYear - year) <= 2);
                            if (isValidYear) { best = item; break; }
                        } else if (!year) { break; }
                    }
                }
                if (best && best.id) callback(mapShikiAnime(best));
                else next();
            }, next);
        }

        next();
    }

    function resolveShikiAnimeForFull(activity, callback) {
        activity = normalizeActivity(activity || getActiveActivity());
        var card = getFullCard(activity);
        var shiki = card.shikimori || activity.shikimori || null;

        if (shiki && shiki.id) { callback(shiki); return; }

        var cacheKey = 'title:' + getCardTitle(card, activity);
        if (fullResolveCache[cacheKey]) { callback(fullResolveCache[cacheKey]); return; }

        function done(anime) {
            if (anime && anime.id) fullResolveCache[cacheKey] = anime;
            callback(anime || null);
        }

        searchShikiAnimeByTitle(activity, done);
    }

    // ==================== Card Opening (FIXED — no TMDB required) ====================

    /**
     * Открывает страницу аниме.
     * Сначала пытается открыть через TMDB (если доступен),
     * затем открывает кастомную страницу Shikimori.
     */
    function openAnime(data) {
        var shikiFull = shikimoriFullData(data);

        if (window.Lampa && Lampa.TMDB && typeof Lampa.TMDB.api === 'function') {
            var title = data.english || data.name || data.russian || '';
            if (title) {
                var searchType = data.kind === 'movie' ? 'movie' : 'tv';
                var shikiYear = data.airedOn && data.airedOn.year ? parseInt(data.airedOn.year, 10) : 0;

                Lampa.TMDB.api('search/' + searchType + '?query=' + encodeURIComponent(title), function (res) {
                    var results = res && res.results ? res.results : [];
                    var best = null;
                    for (var i = 0; i < results.length; i++) {
                        var item = results[i];
                        var itemYear = 0;
                        if (item.first_air_date) itemYear = parseInt(item.first_air_date.substring(0, 4), 10);
                        else if (item.release_date) itemYear = parseInt(item.release_date.substring(0, 4), 10);
                        if (!best) best = item;
                        if (shikiYear && itemYear && Math.abs(itemYear - shikiYear) <= 2) { best = item; break; }
                    }
                    if (best && best.id) {
                        openTmdbItem(best, searchType, data);
                    } else {
                        openShikimoriFull(shikiFull);
                    }
                }, function () {
                    openShikimoriFull(shikiFull);
                });
                return;
            }
        }

        openShikimoriFull(shikiFull);
    }

    /**
     * Открывает кастомную полную страницу аниме на основе данных Shikimori.
     * Не зависит от TMDB.
     */
    function openShikimoriFull(data) {
        if (!data) return;

        Lampa.Activity.push({
            url: '',
            title: data.title || 'Anime',
            component: 'shikimori-full',
            shikimori: data
        });
    }

    /**
     * Подготавливает данные для кастомной полной страницы.
     */
    function shikimoriFullData(data) {
        if (!data) return null;

        var posterList = posterUrls(data);
        var poster = posterList.length ? posterList[0] : '';
        var genres = [];
        if (data.genres) {
            for (var i = 0; i < data.genres.length; i++) {
                var g = data.genres[i];
                genres.push(g.russian || g.name || '');
            }
        }

        return {
            id: data.id,
            title: titleOf(data),
            original_title: originalTitleOf(data),
            poster: poster,
            posterList: posterList,
            score: data.score || '—',
            status: data.status || '',
            statusName: statusName(data.status),
            kind: data.kind || '',
            kindName: kindName(data.kind),
            year: data.airedOn ? data.airedOn.year : '',
            season: seasonName(data.season),
            description: data.description || '',
            episodes: data.episodes || 0,
            episodesAired: data.episodes_aired || 0,
            genres: genres,
            url: data.url || (getShikiHost() + '/animes/' + data.id),
            mal_id: data.mal_id || 0,
            name: data.name || '',
            english: data.english || '',
            russian: data.russian || ''
        };
    }

    function fallbackSearch(data) {
        if (window.Lampa && Lampa.TMDB && typeof Lampa.TMDB.api === 'function') {
            var queries = [];
            buildSmartQueries(data.english, queries);
            buildSmartQueries(data.name, queries);
            buildSmartQueries(data.russian, queries);

            if (queries.length) {
                var index = 0;
                var shikiYear = data.airedOn && data.airedOn.year ? parseInt(data.airedOn.year, 10) : 0;
                var searchType = data.kind === 'movie' ? 'movie' : 'tv';

                function tryNext() {
                    if (index >= queries.length) {
                        openShikimoriFull(shikimoriFullData(data));
                        return;
                    }
                    var query = queries[index++];
                    Lampa.TMDB.api('search/' + searchType + '?query=' + encodeURIComponent(query), function (res) {
                        var results = res && res.results ? res.results : [];
                        var best = null;
                        for (var i = 0; i < results.length; i++) {
                            var item = results[i];
                            var itemYear = 0;
                            if (item.first_air_date) itemYear = parseInt(item.first_air_date.substring(0, 4), 10);
                            else if (item.release_date) itemYear = parseInt(item.release_date.substring(0, 4), 10);
                            if (!best) best = item;
                            if (shikiYear && itemYear && Math.abs(itemYear - shikiYear) <= 2) { best = item; break; }
                        }
                        if (best && best.id) openTmdbItem(best, searchType, data);
                        else tryNext();
                    }, tryNext);
                }
                tryNext();
                return;
            }
        }

        openShikimoriFull(shikimoriFullData(data));
    }

    function openTmdbItem(item, type, shiki) {
        var poster = '';
        var posterCache = storageGet(POSTER_CACHE_KEY, {});
        if (shiki && shiki.id && posterCache[shiki.id]) poster = posterCache[shiki.id];
        if (!poster || isBadPosterUrl(poster)) {
            poster = item.poster_path ? Lampa.TMDB.image(item.poster_path) : '';
        }

        var movie = {
            id: item.id,
            title: titleOf(shiki),
            original_title: originalTitleOf(shiki),
            name: titleOf(shiki),
            original_name: originalTitleOf(shiki),
            poster_path: poster || item.poster_path || '',
            img: poster || '',
            backdrop_path: item.backdrop_path || '',
            vote_average: item.vote_average || 0,
            shikimori: shiki
        };

        Lampa.Activity.push({
            url: '', title: movie.title, component: 'full',
            id: movie.id, method: type, card: movie, source: 'tmdb'
        });
    }

    function openLampaSearch(shiki) {
        var query = titleOf(shiki);
        if (window.Lampa && Lampa.Activity) {
            Lampa.Activity.push({ url: '', title: 'Поиск: ' + query, component: 'search', query: query });
        }
    }

    // ==================== ShikimoriFull Component ====================

    function ShikimoriFull(object) {
        var data = object.shikimori || {};
        var html = $('<div class="shikimori-full"></div>');
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });

        this.render = function () {
            var posterSrc = data.poster || '';
            var genres = (data.genres || []).join(', ') || '—';
            var episodes = data.episodes ? data.episodes + ' эп.' : '—';
            var aired = data.year || '—';
            var description = data.description || 'Описание отсутствует';
            var score = data.score || '—';
            var shikiUrl = data.url || '';

            var infoRows = '';
            infoRows += '<div class="shiki-full-info__row"><span class="shiki-full-info__label">Тип</span><span>' + esc(data.kindName || '—') + '</span></div>';
            infoRows += '<div class="shiki-full-info__row"><span class="shiki-full-info__label">Статус</span><span>' + esc(data.statusName || '—') + '</span></div>';
            infoRows += '<div class="shiki-full-info__row"><span class="shiki-full-info__label">Эпизоды</span><span>' + esc(episodes) + '</span></div>';
            infoRows += '<div class="shiki-full-info__row"><span class="shiki-full-info__label">Выход</span><span>' + esc(aired) + '</span></div>';
            infoRows += '<div class="shiki-full-info__row"><span class="shiki-full-info__label">Жанры</span><span>' + esc(genres) + '</span></div>';
            infoRows += '<div class="shiki-full-info__row"><span class="shiki-full-info__label">Рейтинг</span><span>★ ' + esc(score) + '</span></div>';

            var body = $(
                '<div class="shiki-full__body">' +
                    '<div class="shiki-full__poster">' +
                        '<img class="shiki-full__poster-img" src="' + esc(posterSrc) + '" />' +
                    '</div>' +
                    '<div class="shiki-full__details">' +
                        '<div class="shiki-full__title">' + esc(data.title || '—') + '</div>' +
                        '<div class="shiki-full__original">' + esc(data.original_title || '') + '</div>' +
                        '<div class="shiki-full-info">' + infoRows + '</div>' +
                        '<div class="shiki-full__description">' + esc(description) + '</div>' +
                    '</div>' +
                '</div>'
            );

            if (posterSrc) {
                installPosterFallback(body.find('.shiki-full__poster-img'), data.posterList || [], '', data);
            }

            html.append(body);

            scroll.render().find('.scroll__body').append(html);
            scroll.minus();

            return scroll.render();
        };

        this.create = this.render;

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(html);
                    Lampa.Controller.collectionFocus(html.find('.selector').first(), html);
                },
                left: function () { Lampa.Controller.toggle('menu'); },
                right: function () {},
                up: function () { Lampa.Controller.toggle('head'); },
                down: function () {},
                back: function () {
                    if (Lampa.Activity && Lampa.Activity.backward) Lampa.Activity.backward();
                    else Lampa.Controller.toggle('menu');
                }
            });
            Lampa.Controller.toggle('content');
        };

        this.back = function () {
            if (Lampa.Activity && Lampa.Activity.backward) Lampa.Activity.backward();
        };

        this.destroy = function () {
            scroll.destroy();
            html.remove();
        };
    }

    // ==================== OAuth ====================

    function authUrl() {
        var auth = readAuth();
        if (!auth.client_id || !auth.redirect_uri) return '';
        return getShikiHost() +
            '/oauth/authorize?client_id=' + encodeURIComponent(auth.client_id) +
            '&redirect_uri=' + encodeURIComponent(auth.redirect_uri) +
            '&response_type=code&scope=user_rates';
    }

    function requestTokenByCode(code, callback) {
        var auth = readAuth();
        if (!auth.client_id || !auth.client_secret || !auth.redirect_uri) {
            notify('Введите Client ID, Client Secret и Redirect URI');
            return;
        }
        apiCall({
            url: getShikiHost() + '/oauth/token',
            method: 'POST',
            data: { grant_type: 'authorization_code', client_id: auth.client_id, client_secret: auth.client_secret, code: code, redirect_uri: auth.redirect_uri }
        }, function (answer) { saveTokenAnswer(answer); if (callback) callback(); }, function () {
            notify('Shikimori: не удалось получить токен');
        });
    }

    function refreshToken(callback) {
        var auth = readAuth();
        if (!auth.client_id || !auth.client_secret || !auth.refresh_token) {
            notify('Shikimori: нет данных для обновления токена');
            return;
        }
        apiCall({
            url: getShikiHost() + '/oauth/token',
            method: 'POST',
            data: { grant_type: 'refresh_token', client_id: auth.client_id, client_secret: auth.client_secret, refresh_token: auth.refresh_token }
        }, function (answer) { saveTokenAnswer(answer); if (callback) callback(); }, function () {
            notify('Shikimori: не удалось обновить токен');
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
        if (isAuthorized()) { callback(auth.access_token); return; }
        if (auth.refresh_token) { refreshToken(function () { callback(readAuth().access_token); }); return; }
        notify('Shikimori: требуется авторизация');
    }

    function loadWhoami() {
        withAccessToken(function (token) {
            apiCall({
                url: getShikiHost() + '/api/users/whoami', method: 'GET',
                headers: { Authorization: 'Bearer ' + token }
            }, function (user) {
                var auth = readAuth();
                auth.id = user && user.id ? user.id : 0;
                auth.nickname = user && user.nickname ? user.nickname : '';
                saveAuth(auth);
                notify(auth.nickname ? 'Shikimori: ' + auth.nickname : 'Shikimori: профиль получен');
            }, function () { notify('Shikimori: не удалось проверить профиль'); });
        });
    }

    function fetchUserRate(animeId, callback) {
        var auth = readAuth();
        if (!auth.id) { callback(null); return; }
        withAccessToken(function (token) {
            apiCall({
                url: getShikiHost() + '/api/v2/user_rates?user_id=' + auth.id + '&target_id=' + animeId + '&target_type=Anime',
                method: 'GET', headers: { Authorization: 'Bearer ' + token }
            }, function (res) { callback(res && res.length ? res[0] : null); }, function () { callback(null); });
        });
    }

    function saveUserRate(animeId, rateId, data, callback) {
        var auth = readAuth();
        withAccessToken(function (token) {
            var payload = { user_rate: { target_id: animeId, target_type: 'Anime', user_id: auth.id } };
            for (var k in data) payload.user_rate[k] = data[k];
            apiCall({
                url: getShikiHost() + '/api/v2/user_rates' + (rateId ? '/' + rateId : ''),
                method: rateId ? 'PATCH' : 'POST',
                headers: { Authorization: 'Bearer ' + token },
                data: payload
            }, function (res) { callback(res); }, function (xhr) {
                if (xhr && (xhr.status === 403 || xhr.status === 401)) {
                    notify('Ошибка прав! Выйдите из профиля и авторизуйтесь заново.');
                } else {
                    notify('Ошибка сохранения в список Shikimori');
                }
            });
        });
    }

    function deleteUserRate(rateId, callback) {
        withAccessToken(function (token) {
            apiCall({
                url: getShikiHost() + '/api/v2/user_rates/' + rateId,
                method: 'DELETE', headers: { Authorization: 'Bearer ' + token }
            }, function () { callback(); }, function () { notify('Ошибка удаления из списка'); });
        });
    }

    // ==================== Activity Helpers ====================

    function fullPage() {
        var page = $('.full-start-new, .full-start, .full').last();
        return page && page.length ? page : $();
    }

    function normalizeActivity(activity) {
        if (!activity) return {};
        if (activity.activity) return activity.activity;
        if (activity.object && activity.object.activity) return activity.object.activity;
        return activity;
    }

    function getActiveActivity() {
        var activity = null;
        try {
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function') {
                activity = Lampa.Activity.active();
            }
        } catch (e) {}
        activity = normalizeActivity(activity);
        if (activity && (activity.card || activity.id || activity.movie)) return activity;
        try {
            if (window.Lampa && Lampa.Activity && Lampa.Activity.activity) {
                activity = normalizeActivity(Lampa.Activity.activity);
            }
        } catch (e2) {}
        if (activity && (activity.card || activity.id || activity.movie)) return activity;
        return {};
    }

    function getFullCard(activity) {
        activity = normalizeActivity(activity || getActiveActivity());
        var card = activity.card || activity.movie || activity.object || activity;
        if (!card || typeof card !== 'object') card = {};
        return card;
    }

    function getCardTitle(card, activity) {
        activity = activity || {};
        return card.title || card.name || card.original_title || card.original_name || activity.title || activity.name || '';
    }

    function getCardYear(card) {
        var date = card.first_air_date || card.release_date || card.air_date || '';
        var year = 0;
        if (date) year = parseInt(String(date).substring(0, 4), 10);
        if (!year && card.release_year) year = parseInt(card.release_year, 10);
        if (!year && card.year) year = parseInt(card.year, 10);
        return year || 0;
    }

    function scheduleAppendFull(activity) {
        var delays = [300, 1500];
        var apiCalled = false;
        delays.forEach(function (delay) {
            setTimeout(function () {
                var page = fullPage();
                if (!page.length) return;
                if (page.find('.shikimori-full-list-button').length) return;
                if (!apiCalled) {
                    apiCalled = true;
                    resolveShikiAnimeForFull(activity || getActiveActivity(), function (anime) {
                        if (anime && anime.id) appendFull(getActiveActivity(), anime);
                    });
                }
            }, delay);
        });
    }

    function extendFull() {
        if (!window.Lampa || !Lampa.Listener || !Lampa.Listener.follow) return;
        Lampa.Listener.follow('full', function (event) {
            fullResolveCache = {};
            var activity = event && event.object && event.object.activity ? event.object.activity : getActiveActivity();
            scheduleAppendFull(activity);
        });
        Lampa.Listener.follow('activity', function () {
            scheduleAppendFull(getActiveActivity());
        });
        setInterval(function () {
            var page = fullPage();
            if (!page.length) return;
            if (page.find('.shikimori-full-list-button').length) return;
            scheduleAppendFull(getActiveActivity());
        }, 1800);
    }

    function createShikimoriFullListButton() {
        return $(
            '<div class="full-start__button full-start-new__button selector shikimori-full-list-button" title="Список Shikimori" aria-label="Список Shikimori">' +
                '<svg viewBox="0 0 64 64" width="1.75em" height="1.75em" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M18 14h24c3.3 0 6 2.7 6 6v28c0 1.9-2.1 3-3.7 2L32 42.5 19.7 50c-1.6 1-3.7-.1-3.7-2V20c0-3.3 2.7-6 6-6Z" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>' +
                    '<path d="M25 25h14M25 33h14" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>' +
                '</svg>' +
                '<span class="shikimori-full-list-button__text">Список Shikimori</span>' +
            '</div>'
        );
    }

    function initShikimoriListButton(btn, anime) {
        fetchUserRate(anime.id, function (rate) {
            var currentStatus = rate && rate.status ? rate.status : '';

            function updateButton() {
                var r = rate;
                btn.removeClass('shikimori-list-loading');
                btn.toggleClass('shikimori-list-active', !!(r && r.status));
            }

            btn.on('hover:enter click tap', function () {
                if (!isAuthorized()) {
                    notify('Shikimori: авторизуйтесь для использования списков');
                    return;
                }

                var items = [
                    { title: selectedTitle(currentStatus === 'watching', 'Смотрю'), value: 'watching' },
                    { title: selectedTitle(currentStatus === 'planned', 'Запланировано'), value: 'planned' },
                    { title: selectedTitle(currentStatus === 'completed', 'Просмотрено'), value: 'completed' },
                    { title: selectedTitle(currentStatus === 'on_hold', 'Приостановлено'), value: 'on_hold' },
                    { title: selectedTitle(currentStatus === 'dropped', 'Брошено'), value: 'dropped' }
                ];

                if (rate) items.push({ title: 'Удалить из списка', value: 'delete' });

                Lampa.Select.show({
                    title: 'Shikimori — список',
                    items: items,
                    onSelect: function (item) {
                        if (item.value === 'delete') {
                            btn.addClass('shikimori-list-loading');
                            deleteUserRate(rate.id, function () {
                                rate = null;
                                currentStatus = '';
                                updateButton();
                                notify('Удалено из списка Shikimori');
                            });
                        } else {
                            btn.addClass('shikimori-list-loading');
                            currentStatus = item.value;
                            saveUserRate(anime.id, rate ? rate.id : null, { status: item.value }, function (newRate) {
                                rate = newRate;
                                updateButton();
                                notify('Shikimori: ' + item.title);
                            });
                        }
                    }
                });
            });

            updateButton();
        });
    }

    function appendFull(activity, anime) {
        var page = fullPage();
        if (!anime || !anime.id || !page.length) return;

        var score = anime.score && anime.score !== '0.0' ? anime.score : '—';

        if (!page.find('.rate--shikimori').length) {
            page.find('.full-start__rate-line, .full-start-new__rate-line').first().append(
                '<div class="rate rate--shikimori"><div>★ ' + esc(score) + '</div><span>Shikimori</span></div>'
            );
        }

        if (!page.find('.shikimori-full-list-button').length) {
            var buttons = page.find(
                '.full-start__buttons, .full-start-new__buttons, .full-start__buttons-line, .full-start-new__buttons-line, .full__buttons'
            ).first();

            var listBtn = createShikimoriFullListButton();

            if (buttons.length) {
                var children = buttons.children('.selector');
                if (children.length) children.last().before(listBtn);
                else buttons.append(listBtn);
            } else {
                var fallbackPlace = page.find('.full-start__body, .full-start-new__body, .full').first();
                if (fallbackPlace.length) fallbackPlace.append(listBtn);
                else page.append(listBtn);
            }

            initShikimoriListButton(listBtn, anime);
            setTimeout(function () {
                try { if (window.Lampa && Lampa.Controller) Lampa.Controller.collectionSet(page); } catch (e) {}
            }, 100);
        }
    }

    // ==================== Card & Catalog UI ====================

    function Card(data) {
        var settings = readSettings();
        var year = data && data.airedOn ? data.airedOn.year : '';
        var season = seasonName(data.season);
        var compact = settings.card_size === 'compact' ? ' Shikimori--compact' : '';
        var score = data.score && data.score !== '0.0' ? data.score : '—';
        var meta = [];

        var loadingSVG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="440">' +
            '<rect width="100%" height="100%" fill="#22252d"/>' +
            '<text x="50%" y="50%" fill="#777" font-family="Arial" font-size="22" text-anchor="middle">Загрузка...</text>' +
            '</svg>'
        );

        var noPosterSVG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="440">' +
            '<rect width="100%" height="100%" fill="#22252d"/>' +
            '<text x="50%" y="50%" fill="#777" font-family="Arial" font-size="22" text-anchor="middle">Нет постера</text>' +
            '</svg>'
        );

        var posterList = posterUrls(data);
        var imgSrc = posterList.length ? esc(posterList[0]) : loadingSVG;

        if (season) meta.push(season);
        else if (year) meta.push(year);
        if (data.status) meta.push(statusName(data.status));

        this.data = data;

        this.render = function () {
            var element = $(
                '<div class="card Shikimori selector' + compact + '" data-id="' + esc(data.id) + '">' +
                    '<div class="card__view">' +
                        '<img class="card__img" src="' + imgSrc + '" />' +
                        '<div class="Shikimori-card__rating">★ ' + esc(score) + '</div>' +
                        '<div class="Shikimori-card__badge">' + esc(kindName(data.kind)) + '</div>' +
                    '</div>' +
                    '<div class="card__title">' + esc(titleOf(data)) + '</div>' +
                    '<div class="Shikimori-card__meta">' + esc(meta.join(' • ')) + '</div>' +
                '</div>'
            );

            installPosterFallback(element.find('.card__img'), posterList, noPosterSVG, data);
            return element;
        };
    }

    function Catalog(object) {
        var params = object || {};
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
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
                scroll.minus();

                scroll.onWheel = function (step) {
                    var enabledController = Lampa.Controller.enabled && Lampa.Controller.enabled();
                    if (enabledController && enabledController.name !== 'content') Lampa.Controller.toggle('content');
                    if (step > 0) Navigator.move('down');
                    else Navigator.move('up');
                };
                scroll.onEnd = function () { loadNextPage(true); };

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
                    Lampa.Controller.collectionFocus(last || html.find('.selector').first(), html);
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
                    else Lampa.Controller.toggle('menu');
                }
            });
            Lampa.Controller.toggle('content');
        };

        this.back = this.start;

        this.destroy = function () {
            scroll.destroy();
            html.remove();
        };

        function selectedTitle(condition, title) {
            return (condition ? '● ' : '') + title;
        }

        function applyFilter(newParams) {
            for (var k in newParams) params[k] = newParams[k];
            ended = false;
            autoLoading = false;
            body.empty();
            buildHeader();
            load(false);
        }

        function openFilters(genres) {
            var items = [
                { title: 'Сортировка: ' + sortName(params.sort || readSettings().default_sort), value: 'sort' },
                { title: 'Тип: ' + (params.kind ? kindName(params.kind) : 'Любой'), value: 'kind' },
                { title: 'Статус: ' + (params.status ? statusName(params.status) : 'Любой'), value: 'status' },
                { title: 'Жанр: ' + (params.genre_title || 'Любой'), value: 'genre' }
            ];

            Lampa.Select.show({
                title: 'Фильтры',
                items: items,
                onSelect: function (item) {
                    if (item.value === 'sort') openFilterSortMenu(genres);
                    else if (item.value === 'kind') openFilterKindMenu(genres);
                    else if (item.value === 'status') openFilterStatusMenu(genres);
                    else if (item.value === 'genre') openFilterGenreMenu(genres);
                },
                onBack: function () { Lampa.Controller.toggle('content'); }
            });
        }

        function openFilterSortMenu(genres) {
            var current = params.sort || readSettings().default_sort;
            var items = [
                { title: selectedTitle(current === 'popularity', 'Популярность'), value: 'popularity' },
                { title: selectedTitle(current === 'ranked', 'Рейтинг'), value: 'ranked' },
                { title: selectedTitle(current === 'aired_on', 'Дата выхода'), value: 'aired_on' },
                { title: selectedTitle(current === 'name', 'Название'), value: 'name' }
            ];
            Lampa.Select.show({
                title: 'Сортировка', items: items,
                onSelect: function (item) { applyFilter({ sort: item.value, page: 1 }); },
                onBack: function () { openFilters(genres); }
            });
        }

        function openFilterKindMenu(genres) {
            var current = params.kind || '';
            var items = [
                { title: selectedTitle(!current, 'Любой'), value: '' },
                { title: selectedTitle(current === 'tv', 'TV'), value: 'tv' },
                { title: selectedTitle(current === 'movie', 'Movie'), value: 'movie' },
                { title: selectedTitle(current === 'ova', 'OVA'), value: 'ova' },
                { title: selectedTitle(current === 'ona', 'ONA'), value: 'ona' },
                { title: selectedTitle(current === 'special', 'Special'), value: 'special' }
            ];
            Lampa.Select.show({
                title: 'Тип', items: items,
                onSelect: function (item) { applyFilter({ kind: item.value, page: 1 }); },
                onBack: function () { openFilters(genres); }
            });
        }

        function openFilterStatusMenu(genres) {
            var current = params.status || '';
            var items = [
                { title: selectedTitle(!current, 'Любой'), value: '' },
                { title: selectedTitle(current === 'ongoing', 'Онгоинг'), value: 'ongoing' },
                { title: selectedTitle(current === 'anons', 'Анонс'), value: 'anons' },
                { title: selectedTitle(current === 'released', 'Вышло'), value: 'released' }
            ];
            Lampa.Select.show({
                title: 'Статус', items: items,
                onSelect: function (item) { applyFilter({ status: item.value, page: 1 }); },
                onBack: function () { openFilters(genres); }
            });
        }

        function openFilterGenreMenu(genres) {
            var items = [{ title: selectedTitle(!params.genre, 'Любой'), value: '' }];
            for (var i = 0; i < genres.length; i++) {
                if (genres[i] && genres[i].id) {
                    var genreTitle = genres[i].russian || genres[i].name || genres[i].id;
                    items.push({
                        title: selectedTitle(String(params.genre || '') === String(genres[i].id), genreTitle),
                        value: String(genres[i].id),
                        genre_title: genreTitle
                    });
                }
            }
            if (items.length === 1) items.push({ title: 'Жанры недоступны', value: 'noop' });
            Lampa.Select.show({
                title: 'Жанры', items: items,
                onSelect: function (item) {
                    if (item.value === 'noop') return;
                    applyFilter({ genre: item.value, genre_title: item.genre_title || '', page: 1 });
                },
                onBack: function () { openFilters(genres); }
            });
        }

        function openSettings() {
            var settings = readSettings();
            var items = [
                { title: 'Язык названий: ' + titleLanguageName(settings.title_language), value: 'title_language' },
                { title: 'Скрывать 18+: ' + (settings.hide_adult ? 'да' : 'нет'), value: 'hide_adult' },
                { title: 'Сортировка по умолчанию: ' + sortName(settings.default_sort), value: 'default_sort' },
                { title: 'Размер карточек: ' + cardSizeName(settings.card_size), value: 'card_size' },
                { title: 'Домен Shikimori: ' + (settings.shiki_host || 'https://shikimori.one'), value: 'shiki_host' },
                { title: 'Очистить кэш поиска', value: 'clear_tmdb_cache' },
                { title: 'Авторизация: ' + authStatusTitle(), value: 'auth' }
            ];
            Lampa.Select.show({
                title: 'Настройки Shikimori', items: items,
                onSelect: function (item) {
                    if (item.value === 'title_language') { openTitleLanguageSettings(); return; }
                    if (item.value === 'hide_adult') { openAdultSettings(); return; }
                    if (item.value === 'default_sort') { openDefaultSortSettings(); return; }
                    if (item.value === 'card_size') { openCardSizeSettings(); return; }
                    if (item.value === 'shiki_host') { openShikiHostSettings(); return; }
                    if (item.value === 'clear_tmdb_cache') { storageSet(POSTER_CACHE_KEY, {}); notify('Кэш поиска очищен'); return; }
                    if (item.value === 'auth') { openAuthSettings(); return; }
                },
                onBack: function () { Lampa.Controller.toggle('content'); }
            });
        }

        function openTitleLanguageSettings() {
            var settings = readSettings();
            var items = [
                { title: selectedTitle(settings.title_language === 'original', 'Оригинал'), value: 'original' },
                { title: selectedTitle(settings.title_language === 'en', 'Английский'), value: 'en' },
                { title: selectedTitle(settings.title_language === 'ru', 'Русский'), value: 'ru' }
            ];
            Lampa.Select.show({
                title: 'Язык названий', items: items,
                onSelect: function (item) { saveVisualSetting('title_language', item.value); },
                onBack: function () { openSettings(); }
            });
        }

        function openAdultSettings() {
            var settings = readSettings();
            var items = [
                { title: selectedTitle(settings.hide_adult, 'Да'), value: 'true' },
                { title: selectedTitle(!settings.hide_adult, 'Нет'), value: 'false' }
            ];
            Lampa.Select.show({
                title: 'Скрывать 18+', items: items,
                onSelect: function (item) { saveVisualSetting('hide_adult', item.value === 'true'); },
                onBack: function () { openSettings(); }
            });
        }

        function openDefaultSortSettings() {
            var settings = readSettings();
            var items = [
                { title: selectedTitle(settings.default_sort === 'popularity', 'Популярность'), value: 'popularity' },
                { title: selectedTitle(settings.default_sort === 'ranked', 'Рейтинг'), value: 'ranked' },
                { title: selectedTitle(settings.default_sort === 'aired_on', 'Дата выхода'), value: 'aired_on' }
            ];
            Lampa.Select.show({
                title: 'Сортировка по умолчанию', items: items,
                onSelect: function (item) { saveVisualSetting('default_sort', item.value); },
                onBack: function () { openSettings(); }
            });
        }

        function openCardSizeSettings() {
            var settings = readSettings();
            var items = [
                { title: selectedTitle(settings.card_size === 'normal', 'Обычный'), value: 'normal' },
                { title: selectedTitle(settings.card_size === 'compact', 'Компактный'), value: 'compact' }
            ];
            Lampa.Select.show({
                title: 'Размер карточек', items: items,
                onSelect: function (item) { saveVisualSetting('card_size', item.value); },
                onBack: function () { openSettings(); }
            });
        }

        function openShikiHostSettings() {
            var settings = readSettings();
            var items = [
                { title: 'shikimori.one', value: 'https://shikimori.one' },
                { title: 'shikimori.io', value: 'https://shikimori.io' },
                { title: 'Ввести вручную', value: 'custom' }
            ];
            Lampa.Select.show({
                title: 'Домен Shikimori', items: items,
                onSelect: function (item) {
                    if (item.value === 'custom') {
                        askText('Домен Shikimori (с https://)', settings.shiki_host, function (value) {
                            if (value) { settings.shiki_host = value; saveSettings(settings); }
                            openSettings();
                        });
                    } else {
                        settings.shiki_host = item.value;
                        saveSettings(settings);
                        openSettings();
                    }
                },
                onBack: function () { openSettings(); }
            });
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
            Lampa.Select.show({
                title: 'Авторизация Shikimori', items: items,
                onSelect: function (item) {
                    if (item.value === 'client_id') {
                        askText('Client ID Shikimori', auth.client_id, function (v) { auth.client_id = v; saveAuth(auth); notify('Client ID сохранён'); });
                    } else if (item.value === 'client_secret') {
                        askText('Client Secret Shikimori', auth.client_secret, function (v) { auth.client_secret = v; saveAuth(auth); notify('Client Secret сохранён'); });
                    } else if (item.value === 'redirect_uri') {
                        askText('Redirect URI', auth.redirect_uri, function (v) { if (v) { auth.redirect_uri = v; saveAuth(auth); notify('Redirect URI сохранён'); } });
                    } else if (item.value === 'copy_url') {
                        var url = authUrl();
                        if (url) {
                            if (navigator.clipboard) navigator.clipboard.writeText(url);
                            notify('Ссылка скопирована');
                        } else {
                            notify('Введите Client ID и Redirect URI');
                        }
                    } else if (item.value === 'code') {
                        askText('Код авторизации', '', function (code) {
                            if (code) requestTokenByCode(code, function () { openAuthSettings(); });
                        });
                    } else if (item.value === 'refresh') {
                        refreshToken(function () { openAuthSettings(); });
                    } else if (item.value === 'whoami') {
                        if (isAuthorized()) {
                            loadWhoami();
                        } else {
                            notify('Сначала авторизуйтесь');
                        }
                    } else if (item.value === 'logout') {
                        auth.access_token = '';
                        auth.refresh_token = '';
                        auth.expires_at = 0;
                        auth.nickname = '';
                        auth.id = 0;
                        saveAuth(auth);
                        notify('Вы вышли из Shikimori');
                    }
                    setTimeout(function () { openAuthSettings(); }, 300);
                },
                onBack: function () { openSettings(); }
            });
        }

        function saveVisualSetting(key, value) {
            var settings = readSettings();
            settings[key] = value;
            saveSettings(settings);
            notify('Настройка сохранена');
            setTimeout(function () { openSettings(); }, 200);
        }

        function askText(title, current, callback) {
            if (Lampa.Input) {
                Lampa.Input.show({
                    title: title,
                    value: current || '',
                    onSelect: function (value) { callback(value); },
                    onBack: function () { openSettings(); }
                });
            } else {
                var value = prompt(title, current || '');
                if (value !== null) callback(value);
            }
        }

        function titleLanguageName(lang) {
            var map = { original: 'Оригинал', en: 'Английский', ru: 'Русский' };
            return map[lang] || lang;
        }

        function cardSizeName(size) {
            var map = { normal: 'Обычный', compact: 'Компактный' };
            return map[size] || size;
        }

        function buildHeader() {
            head.empty();
            quick.empty();
            active.empty();

            var filterBtn = $('<div class="Shikimori-head__button selector">Фильтры</div>');
            filterBtn.on('hover:enter click tap', function () {
                loadGenres(function (genres) { openFilters(genres); });
            });
            head.append(filterBtn);

            var settingsBtn = $('<div class="Shikimori-head__button selector">Настройки</div>');
            settingsBtn.on('hover:enter click tap', function () { openSettings(); });
            head.append(settingsBtn);

            if (params.search) {
                active.html('Поиск: <span>' + esc(params.search) + '</span>');
            } else {
                var parts = [];
                if (params.kind) parts.push(kindName(params.kind));
                if (params.status) parts.push(statusName(params.status));
                if (params.genre_title) parts.push(params.genre_title);
                if (parts.length) active.html(parts.join(' • '));
            }
        }

        function load(append) {
            if (loading) return;
            loading = true;

            body.append('<div class="Shikimori-loader' + (append ? ' Shikimori-loader--more' : '') + '">Загрузка...</div>');

            requestAnime(params, function (data) {
                loading = false;
                body.find('.Shikimori-loader').remove();
                if (!append) body.empty();

                if (!data.length) {
                    ended = true;
                    if (!append) body.append('<div class="Shikimori-empty">Ничего не найдено</div>');
                    return;
                }

                autoLoading = false;
                if (data.length < PAGE_LIMIT) ended = true;
                for (var i = 0; i < data.length; i++) appendCard(data[i]);
                if (!ended) addMoreButton();

                if (window.Lampa && Lampa.Controller) {
                    Lampa.Controller.collectionSet(html);
                    Lampa.Controller.collectionFocus(last || body.find('.selector').first(), html);
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

            render.on('hover:focus nav_focus', function () {
                last = render[0];
                scroll.update(render, true);
            });

            bindPress(render, function () { openAnime(item); });
            body.append(render);
        }

        function addMoreButton() {
            var more = $('<div class="simple-button selector Shikimori-more">Еще</div>');
            more.on('hover:focus nav_focus', function () {
                last = more[0];
                scroll.update(more, true);
            });
            bindPress(more, function () { loadNextPage(false); });
            body.append(more);
        }

        function loadNextPage(auto) {
            if (loading || ended || autoLoading) return;
            autoLoading = !!auto;
            params.page = (parseInt(params.page, 10) || 1) + 1;
            load(true);
        }

        function bindPress(el, callback) {
            el.on('hover:enter click tap mouseup', function (e) {
                if (e.type === 'mouseup' || e.type === 'tap') {
                    if (!el.hasClass('focus') && !el.hasClass('hover')) return;
                }
                callback();
            });
        }
    }

    // ==================== Menu & Initialization ====================

    function addMenu() {
        var menu = $('.menu .menu__list').eq(0);
        if (!menu.length || $('.menu__item.selector[data-action="shikimori"]').length) return;

        var button = $(
            '<li class="menu__item selector" data-action="shikimori">' +
                '<div class="menu__ico">' +
                    '<svg viewBox="0 0 44 44" width="44" height="44">' +
                        '<circle cx="22" cy="22" r="19" fill="#c83a4b"/>' +
                        '<path d="M13 29c2 3 5 5 9 5 6 0 10-3 10-8 0-4-2-6-8-8l-3-1c-3-1-4-2-4-4s2-3 5-3c3 0 5 1 7 3l3-4c-2-3-6-4-10-4-6 0-10 3-10 8 0 4 3 7 8 8l3 1c3 1 4 2-4 4s-2 3-5 3c-3 0-6-2-8-4l-1 4z" fill="#fff"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="menu__text">Shikimori</div>' +
            '</li>'
        );

        button.on('hover:enter click tap mouseup', function () {
            Lampa.Activity.push({
                url: '', title: 'Shikimori', component: 'shikimori',
                page: 1, sort: readSettings().default_sort
            });
        });

        menu.append(button);
    }

    function addStyles() {
        if ($('#shikimori-style').length) return;

        $('body').append(
            '<style id="shikimori-style">' +
                '.Shikimori-module{padding:1.2em 1.5em 2.5em;color:#fff;height:100%;display:flex;flex-direction:column;box-sizing:border-box}' +
                '.Shikimori-module>.scroll{flex:1;overflow:hidden;position:relative;width:100%}' +
                '.Shikimori-module .scroll__body{width:100%}' +
                '.Shikimori-head{display:flex;flex-wrap:wrap;margin-bottom:0.8em;gap:0.3em;}' +
                '.Shikimori-quick{display:flex;flex-wrap:wrap;margin-bottom:0.8em;gap:0.25em;}' +
                '.Shikimori-head__button,.Shikimori-chip,.Shikimori-more{' +
                    'display:inline-flex!important;align-items:center!important;justify-content:center!important;' +
                    'padding:0.65em 1.2em!important;height:auto!important;line-height:1!important;' +
                    'background:rgba(255,255,255,0.06)!important;border:1px solid rgba(255,255,255,0.04)!important;' +
                    'color:rgba(255,255,255,0.85);font-size:0.95em;font-weight:500;margin:0 0.3em 0.3em 0!important;' +
                    'transition:all 0.2s ease-in-out;border-radius:0.5em!important;outline:none!important;box-shadow:none!important;' +
                '}' +
                '.Shikimori-chip{border-radius:1.5em!important;padding:0.5em 1.2em!important;font-size:0.88em;opacity:0.85;}' +
                '.Shikimori-head__button svg{width:1.15em;height:1.15em;margin-right:0.45em;opacity:0.85;flex-shrink:0;transition:transform 0.2s;}' +
                '.Shikimori-head__button.focus,.Shikimori-chip.focus,.Shikimori-more.focus{' +
                    'background:#c83a4b!important;color:#fff!important;' +
                    'border-color:#e95a68!important;transform:scale(1.05);' +
                    'box-shadow:0 0.4em 1.2em rgba(200,58,75,0.35)!important;' +
                '}' +
                '.Shikimori-head__button.focus svg{transform:scale(1.1);opacity:1;}' +
                '.Shikimori-chip--active{background:rgba(200,58,75,0.22)!important;border-color:rgba(200,58,75,0.55)!important;color:#ff8e9b!important;opacity:1;}' +
                '.Shikimori-active{font-size:1.05em;color:rgba(255,255,255,.62);margin:.15em 0 1em;line-height:1.35}' +
                '.Shikimori-active span{color:#e95a68;font-weight:600}' +
                '.Shikimori-body{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-flow:row wrap;flex-flow:row wrap;align-items:flex-start;justify-content:flex-start;padding:1em .5em}' +
                '.Shikimori.card{flex:0 0 14.285%;max-width:14.285%;padding:0 .6em;box-sizing:border-box;margin:0 0 1.5em 0;position:relative}' +
                '.Shikimori.card.Shikimori--compact{flex:0 0 10%;max-width:10%}' +
                '.Shikimori.card .card__view{background:#1b1d24;border-radius:.35em;overflow:hidden;position:relative;padding-bottom:145%}' +
                '.Shikimori.card .card__img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block;background:#22252d}' +
                '.Shikimori.card.focus .card__view{box-shadow:0 0 0 .22em #fff,0 .4em 1.4em rgba(200,58,75,.45)}' +
                '.Shikimori-card__rating,.Shikimori-card__badge{position:absolute;top:.45em;padding:.25em .45em;border-radius:.25em;background:rgba(10,12,16,.82);font-size:.9em;line-height:1;color:#fff}' +
                '.Shikimori-card__rating{left:.45em;color:#ffd166}' +
                '.Shikimori-card__badge{right:.45em;color:#fff;background:rgba(200,58,75,.88)}' +
                '.Shikimori-card__user-rate{position:absolute;top:2.35em;left:.45em;padding:.25em .45em;border-radius:.25em;background:rgba(10,12,16,.82);font-size:.82em;line-height:1;color:#2ecc71;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:85%}' +
                '.Shikimori.card .card__title{font-size:1.06em;line-height:1.22;max-height:2.55em;overflow:hidden;margin-top:.55em}' +
                '.Shikimori-card__meta{font-size:.88em;line-height:1.25;color:rgba(255,255,255,.52);height:2.35em;overflow:hidden;margin-top:.25em}' +
                '.Shikimori-loader,.Shikimori-empty{width:100%;text-align:center;font-size:1.2em;color:rgba(255,255,255,.68);padding:2em 0}' +
                '.Shikimori-loader--more{width:100%;font-size:1em;padding:1em 0;color:rgba(255,255,255,.48)}' +
                '.Shikimori-more{height:2.8em;line-height:2.8em;min-width:8em;text-align:center;margin-top:2em}' +
                '.shikimori-list-active{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.18);color:#fff}' +
                '.full-start__button.shikimori-full-list-button,.full-start-new__button.shikimori-full-list-button,.shikimori-full-list-button{position:relative;color:#fff;background:rgba(0,0,0,.32)!important;border-color:transparent!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;vertical-align:middle!important;white-space:nowrap!important;overflow:visible!important}' +
                '.shikimori-full-list-button svg{display:block;pointer-events:none;flex:0 0 auto}' +
                '.shikimori-full-list-button__text{display:none;margin-left:.55em;font-size:.95em;font-weight:500;line-height:1;white-space:nowrap}' +
                '.full-start__button.shikimori-full-list-button.focus,.full-start-new__button.shikimori-full-list-button.focus,.shikimori-full-list-button.focus{background:#fff!important;color:#222!important;border-color:#fff!important;width:auto!important;min-width:0!important;padding-left:1.05em!important;padding-right:1.05em!important}' +
                '.shikimori-full-list-button.focus .shikimori-full-list-button__text{display:inline-block}' +
                '.shikimori-full-list-button.shikimori-list-active:not(.focus){background:rgba(255,255,255,.16)!important;color:#fff!important}' +
                '.shikimori-full-list-button.shikimori-list-loading{opacity:.75}' +
                /* ShikimoriFull component styles */
                '.shikimori-full{padding:2em;color:#fff;width:100%;box-sizing:border-box}' +
                '.shiki-full__body{display:flex;gap:2em;flex-wrap:wrap}' +
                '.shiki-full__poster{flex:0 0 22em;max-width:22em}' +
                '.shiki-full__poster-img{width:100%;border-radius:.5em;background:#22252d;display:block}' +
                '.shiki-full__details{flex:1;min-width:20em}' +
                '.shiki-full__title{font-size:2.2em;font-weight:600;line-height:1.2;margin-bottom:.3em}' +
                '.shiki-full__original{font-size:1.1em;color:rgba(255,255,255,.5);margin-bottom:1.2em}' +
                '.shiki-full-info{margin-bottom:1.2em}' +
                '.shiki-full-info__row{display:flex;padding:.5em 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:1.1em}' +
                '.shiki-full-info__label{color:rgba(255,255,255,.5);min-width:8em;flex-shrink:0}' +
                '.shiki-full__description{font-size:1.05em;line-height:1.6;color:rgba(255,255,255,.75);max-height:15em;overflow-y:auto}' +
                '@media screen and (max-width:767px){.shiki-full__body{flex-direction:column}.shiki-full__poster{flex:0 0 auto;max-width:16em;margin:0 auto}}' +
            '</style>'
        );
    }

    function start() {
        if (!window.Lampa || !window.$) return;

        addStyles();

        Lampa.Component.add('shikimori', Catalog);
        Lampa.Component.add('shikimori-full', ShikimoriFull);

        extendFull();

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
