/*
 * Lampa plugin «VK Видео» (vkvideo.js)
 *
 * Повторяет основной функционал VK Видео внутри Lampa:
 *   - гибридная авторизация: анонимный режим (поиск и просмотр сразу, без аккаунта)
 *     + вход по access_token (подписки, «Мне нравится», «Посмотреть позже», комментарии);
 *   - экраны: Главная (Продолжить просмотр / Тренды / Новое у подписок), Поиск,
 *     Каналы, Мне нравится, Посмотреть позже, локальная История;
 *   - воспроизведение через Lampa.Player (mp4-качества + HLS, субтитры, плейлист);
 *   - локальная история просмотров с продолжением с места остановки
 *     (серверного API истории у VK не существует — прогресс хранится на устройстве).
 *
 * Требования:
 *   - CORS-прокси (Cloudflare Worker из worker/vk-proxy.js) обязателен для
 *     браузерных платформ — адрес указывается в настройках плагина;
 *   - добавляется в Lampa: Настройки → Расширения → Добавить → URL этого файла.
 *
 * Синтаксис ES5 (совместимость со старыми ТВ-платформами). Promises используются —
 * HLS-плеер Lampa и так требует их наличие.
 */
(function () {
    'use strict'

    if (window.lampa_vkvideo_loaded) return
    window.lampa_vkvideo_loaded = true

    /* ======================================================================
       КОНСТАНТЫ
       ====================================================================== */

    var VERSION = '1.0.0'

    var API_HOST = 'api.vk.com'        // методы с user-токеном
    var APIV_HOST = 'api.vkvideo.ru'   // методы VK Видео (анонимные)
    var LOGIN_HOST = 'login.vk.com'    // веб-анонимный токен
    var API_VER = '5.199'              // версия API для api.vk.com
    var APIV_VER = '5.274'             // версия для мобильной анонимной цепочки
    var APIV_WEB_VER = '5.264'         // версия для веб-анонимных вызовов

    // Публичные (вшитые в официальные клиенты VK) идентификаторы приложений
    var IOS_CLIENT = { id: '51552953', secret: 'qgr0yWwXCrsxA1jnRtRX' }  // VK Video iOS
    var WEB_CLIENT = { id: '6287487', secret: 'o557NLIkAErNhakXrQ7A' }   // vkvideo.ru web

    var TOKEN_HELPER = 'https://vkhost.github.io/'

    var SUBS_GROUPS_LIMIT = 20
    var SUBS_VIDEOS_PER_GROUP = 6
    var PAGE_SIZE = 24

    /* ======================================================================
       УТИЛИТЫ
       ====================================================================== */

    function ext(dst) {
        for (var i = 1; i < arguments.length; i++) {
            var src = arguments[i]
            if (!src) continue
            for (var k in src) dst[k] = src[k]
        }
        return dst
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    }

    function pad2(n) { return (n < 10 ? '0' : '') + n }

    function fmtTime(sec) {
        sec = Math.max(0, Math.floor(sec || 0))
        var h = Math.floor(sec / 3600)
        var m = Math.floor((sec % 3600) / 60)
        var s = sec % 60
        return h ? h + ':' + pad2(m) + ':' + pad2(s) : m + ':' + pad2(s)
    }

    function fmtNum(n) {
        n = n || 0
        if (n >= 1000000) return String(Math.round(n / 100000) / 10).replace('.', ',') + ' млн'
        if (n >= 1000) return String(Math.round(n / 100) / 10).replace('.', ',') + ' тыс.'
        return String(n)
    }

    function fmtDate(ts) {
        if (!ts) return ''
        var d = new Date(ts * 1000)
        return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear()
    }

    function uuid(len) {
        var s = '', chars = 'abcdef0123456789'
        len = len || 32
        for (var i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length))
        return s
    }

    function noop() { }

    // Подписка с защитой: Lampa.Subscribe().follow может вернуть функцию отписки
    function subscribe(bus, type, fn) {
        var un = bus.follow(type, fn)
        if (typeof un === 'function') return un
        return function () { try { bus.remove(type, fn) } catch (e) { } }
    }

    // Пространственная навигация: Lampa грузит vender/navigator.js обычным скриптом,
    // его `var Navigator = new SpatialNavigator()` становится глобальной переменной
    // (тем же способом пользуется, например, online_mod.js).
    function navMove(dir) {
        try { if (typeof Navigator !== 'undefined' && Navigator.move) Navigator.move(dir) } catch (e) { }
    }

    function navCan(dir) {
        try { if (typeof Navigator !== 'undefined' && Navigator.canmove) return Navigator.canmove(dir) } catch (e) { }
        return false
    }

    function lang(key) {
        return Lampa.Lang.translate(key)
    }

    /* ======================================================================
       ЯЗЫК
       ====================================================================== */

    Lampa.Lang.add({
        vkv_title: { ru: 'VK Видео', en: 'VK Video' },
        vkv_home: { ru: 'Главная', en: 'Home' },
        vkv_subs: { ru: 'Подписки', en: 'Subscriptions' },
        vkv_like: { ru: 'Нравится', en: 'Liked' },
        vkv_later: { ru: 'Посмотреть позже', en: 'Watch later' },
        vkv_history: { ru: 'История', en: 'History' },
        vkv_search: { ru: 'Поиск', en: 'Search' },
        vkv_search_ph: { ru: 'Что искать?', en: 'Search query' },
        vkv_login: { ru: 'Войти', en: 'Sign in' },
        vkv_logout: { ru: 'Выйти', en: 'Sign out' },
        vkv_logged_as: { ru: 'Вы вошли как', en: 'Signed in as' },
        vkv_guest: { ru: 'Гость (анонимный режим)', en: 'Guest (anonymous mode)' },
        vkv_watch: { ru: 'Смотреть', en: 'Watch' },
        vkv_continue: { ru: 'Продолжить просмотр', en: 'Continue watching' },
        vkv_popular: { ru: 'Популярное', en: 'Popular' },
        vkv_new_subs: { ru: 'Новое у подписок', en: 'New from subscriptions' },
        vkv_channels: { ru: 'Каналы', en: 'Channels' },
        vkv_my_channels: { ru: 'Мои каналы', en: 'My channels' },
        vkv_comments: { ru: 'Комментарии', en: 'Comments' },
        vkv_write_comment: { ru: 'Написать комментарий', en: 'Write a comment' },
        vkv_empty: { ru: 'Пока ничего нет', en: 'Nothing here yet' },
        vkv_copy_link: { ru: 'Копировать ссылку', en: 'Copy link' },
        vkv_copied: { ru: 'Ссылка скопирована', en: 'Link copied' },
        vkv_clear_history: { ru: 'Очистить историю', en: 'Clear history' },
        vkv_clear_q: { ru: 'Удалить всю локальную историю просмотров?', en: 'Delete all local watch history?' },
        vkv_cleared: { ru: 'Готово', en: 'Done' },
        vkv_yes: { ru: 'Да', en: 'Yes' },
        vkv_no: { ru: 'Отмена', en: 'Cancel' },
        vkv_resume: { ru: 'Продолжаем с', en: 'Resuming from' },
        vkv_like_add: { ru: 'Нравится', en: 'Like' },
        vkv_like_on: { ru: 'Добавлено в «Нравится»', en: 'Added to liked' },
        vkv_like_off: { ru: 'Убрано из «Нравится»', en: 'Removed from liked' },
        vkv_fave_add: { ru: 'В закладки', en: 'Bookmark' },
        vkv_fave_on: { ru: 'Добавлено в закладки', en: 'Bookmarked' },
        vkv_fave_off: { ru: 'Убрано из закладок', en: 'Removed from bookmarks' },
        vkv_find: { ru: 'Найти в VK Видео', en: 'Find on VK Video' },
        vkv_token_input: { ru: 'Вставить access_token', en: 'Paste access_token' },
        vkv_token_ok: { ru: 'Вход выполнен', en: 'Signed in' },
        vkv_token_bad: { ru: 'Токен недействителен или истёк', en: 'Token is invalid or expired' },
        vkv_token_hint: {
            ru: 'Как войти:' +
                '\n1. Откройте на любом устройстве страницу vkhost.github.io' +
                '\n2. Нажмите «Получить access token», затем «Разрешить»' +
                '\n3. Скопируйте access_token из адресной строки браузера' +
                '\n4. Вернитесь сюда и вставьте токен кнопкой ниже.' +
                '\n\nТокен хранится только на этом устройстве и открывает подписки, «Нравится», «Посмотреть позже» и комментарии.',
            en: 'How to sign in:' +
                '\n1. Open vkhost.github.io on any device' +
                '\n2. Press «Получить access token», then «Разрешить»' +
                '\n3. Copy the access_token from the browser address bar' +
                '\n4. Come back here and paste the token.' +
                '\n\nThe token is stored on this device only and enables subscriptions, likes, watch later and comments.'
        },
        vkv_need_login: { ru: 'Раздел доступен после входа в аккаунт VK', en: 'Sign in to your VK account to use this section' },
        vkv_guest_home: {
            ru: 'Вы в анонимном режиме: поиск и просмотр доступны без входа. Войдите, чтобы открыть подписки, «Нравится», «Посмотреть позже» и тренды.',
            en: 'Anonymous mode: search and playback work without sign in. Sign in to enable subscriptions, likes, watch later and trends.'
        },
        vkv_settings: { ru: 'VK Видео', en: 'VK Video' },
        vkv_proxy: { ru: 'Прокси (Worker)', en: 'Proxy (Worker)' },
        vkv_proxy_d: {
            ru: 'Адрес Cloudflare Worker из файла worker/vk-proxy.js. Обязателен для браузера/WebView: VK не отдаёт CORS, а подписи ссылок привязаны к IP.',
            en: 'Cloudflare Worker URL from worker/vk-proxy.js. Required for browser/WebView: VK sends no CORS headers and signs links to the proxy IP.'
        },
        vkv_max_quality: { ru: 'Максимальное качество', en: 'Max quality' },
        vkv_history_on: { ru: 'История просмотров', en: 'Watch history' },
        vkv_history_d: { ru: 'Локальный прогресс и «Продолжить просмотр». Серверного API истории у VK нет.', en: 'Local progress and "Continue watching". VK has no history API.' },
        vkv_quality_auto: { ru: 'Авто (HLS)', en: 'Auto (HLS)' },
        vkv_err_net: { ru: 'Сеть недоступна. Проверьте адрес прокси в настройках плагина VK Видео.', en: 'Network unavailable. Check the VK Video plugin proxy URL in settings.' },
        vkv_err_play: { ru: 'Не удалось получить ссылку на видео', en: 'Failed to resolve the video' },
        vkv_subs_members: { ru: 'подписчиков', en: 'subscribers' },
        vkv_views_word: { ru: 'просмотров', en: 'views' },
        vkv_login_title: { ru: 'Аккаунт VK', en: 'VK account' },
        vkv_open_helper: { ru: 'Скопировать ссылку на vkhost.github.io', en: 'Copy vkhost.github.io link' }
    })

    /* ======================================================================
       СТИЛИ
       ====================================================================== */

    Lampa.Template.add('vkv_css', '<style>' +
        '.vkv-tabs{display:flex;flex-wrap:wrap;align-items:center;padding:.8em 1em .2em}' +
        '.vkv-tab{padding:.55em 1.2em;margin:.2em .35em .5em;background:rgba(255,255,255,.07);border-radius:1.5em;font-size:1.05em;white-space:nowrap}' +
        '.vkv-tab.active{background:rgba(255,255,255,.22)}' +
        '.vkv-tab.focus{background:#fff;color:#000}' +
        '.vkv-tab--search{margin-left:auto}' +
        '.vkv-section{margin:0 0 1.2em}' +
        '.vkv-section__title{font-size:1.3em;font-weight:700;padding:.2em 1em .45em}' +
        '.vkv-grid{display:flex;flex-wrap:wrap;padding:0 1em;align-items:flex-start}' +
        '.vkv-card{width:13.5em;margin:0 .5em .9em 0;background:rgba(255,255,255,.045);border-radius:.7em;overflow:hidden;position:relative}' +
        '.vkv-card.focus{background:rgba(255,255,255,.14)}' +
        '.vkv-card__img{position:relative;width:100%;height:7.6em;background-size:cover;background-position:center;background-color:rgba(255,255,255,.06)}' +
        '.vkv-card__time{position:absolute;right:.45em;bottom:.45em;padding:.1em .45em;background:rgba(0,0,0,.75);border-radius:.35em;font-size:.9em}' +
        '.vkv-card__title{padding:.5em .7em 0;font-size:1.02em;line-height:1.25;max-height:2.6em;overflow:hidden}' +
        '.vkv-card__sub{padding:.25em .7em .6em;font-size:.88em;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
        '.vkv-progress{height:.28em;background:rgba(255,255,255,.2)}' +
        '.vkv-progress > div{height:100%;background:#3aa0ff}' +
        '.vkv-chan{width:10.5em;margin:0 .5em .9em 0;background:rgba(255,255,255,.045);border-radius:.7em;padding:.9em .6em;text-align:center}' +
        '.vkv-chan.focus{background:rgba(255,255,255,.14)}' +
        '.vkv-chan__img{width:4.5em;height:4.5em;margin:0 auto .5em;border-radius:50%;background-size:cover;background-position:center;background-color:rgba(255,255,255,.08)}' +
        '.vkv-chan__name{font-size:1em;line-height:1.25;max-height:2.5em;overflow:hidden}' +
        '.vkv-chan__sub{font-size:.85em;opacity:.6;margin-top:.2em}' +
        '.vkv-note{margin:0 1em 1em;padding:1em 1.1em;background:rgba(255,255,255,.05);border-radius:.8em;line-height:1.45}' +
        '.vkv-note__btns{display:flex;flex-wrap:wrap;margin-top:.8em}' +
        '.vkv-empty{padding:2em 1em;text-align:center;opacity:.6;font-size:1.1em}' +
        '.vkv-btn{display:inline-block;padding:.7em 1.5em;margin:0 .5em .7em 0;background:rgba(255,255,255,.08);border-radius:1.6em;font-size:1.05em}' +
        '.vkv-btn.focus{background:#fff;color:#000}' +
        '.vkv-btn--main{background:#3aa0ff;color:#fff}' +
        '.vkv-btn--main.focus{background:#fff;color:#0a58c7}' +
        '.vkv-detail__hero{display:flex;padding:1em}' +
        '.vkv-detail__img{width:14em;min-width:10em;height:8em;border-radius:.6em;background-size:cover;background-position:center;background-color:rgba(255,255,255,.06)}' +
        '.vkv-detail__info{padding:0 0 0 1.1em;min-width:0}' +
        '.vkv-detail__title{font-size:1.45em;font-weight:700;line-height:1.25}' +
        '.vkv-detail__meta{opacity:.6;padding:.4em 0}' +
        '.vkv-detail__desc{opacity:.85;line-height:1.4;max-height:7.5em;overflow:hidden;padding-right:1em}' +
        '.vkv-detail__btns{padding:.4em 1em .8em}' +
        '.vkv-comment{display:flex;padding:.6em 1em}' +
        '.vkv-comment__ava{width:2.6em;height:2.6em;min-width:2.6em;border-radius:50%;background-size:cover;background-position:center;background-color:rgba(255,255,255,.08);margin-right:.7em}' +
        '.vkv-comment__name{font-weight:700;font-size:.95em}' +
        '.vkv-comment__date{opacity:.5;font-size:.85em;margin-left:.6em}' +
        '.vkv-comment__text{line-height:1.35;padding-top:.15em;word-wrap:break-word}' +
        '.vkv-chan-head{display:flex;align-items:center;padding:1em}' +
        '.vkv-chan-head__img{width:5em;height:5em;min-width:5em;border-radius:50%;background-size:cover;background-position:center;background-color:rgba(255,255,255,.08);margin-right:1em}' +
        '.vkv-chan-head__name{font-size:1.4em;font-weight:700}' +
        '.vkv-chan-head__sub{opacity:.6;padding-top:.3em}' +
        '.vkv-row{display:flex;flex-wrap:wrap;padding:0 1em}' +
        '</style>')

    /* ======================================================================
       ПРОКСИ / ПОСТРОЕНИЕ URL
       Все запросы к VK и медиа-CDN в режиме прокси идут по маршруту
       <worker>/vk/<host>/<path>?<query>. Это же гарантирует совпадение IP
       для подписанных ссылок CDN (иначе CDN ответит 403).
       ====================================================================== */

    function getProxy() {
        var p = (Lampa.Storage.get('vkv_proxy') || '').trim()
        while (p.charAt(p.length - 1) === '/') p = p.slice(0, -1)
        return p
    }

    function qs(query) {
        var out = []
        for (var k in query) {
            if (query[k] === undefined || query[k] === null) continue
            out.push(encodeURIComponent(k) + '=' + encodeURIComponent(query[k]))
        }
        return out.length ? '?' + out.join('&') : ''
    }

    // pathAndQuery: 'api.vk.com/method/video.get?a=1' либо 'vkvd685.okcdn.ru/video.m3u8?...'
    function wrapUrl(pathAndQuery) {
        var proxy = getProxy()
        if (!proxy) return 'https://' + pathAndQuery
        var qi = proxy.indexOf('?')
        if (qi < 0) return proxy + '/vk/' + pathAndQuery
        var base = proxy.slice(0, qi)
        var extra = proxy.slice(qi + 1)
        if (!extra) return base + '/vk/' + pathAndQuery
        return base + '/vk/' + pathAndQuery + (pathAndQuery.indexOf('?') >= 0 ? '&' : '?') + extra
    }

    function apiUrl(host, path, query) {
        return wrapUrl(host + '/' + path + qs(query || {}))
    }

    function mediaUrl(rawUrl) {
        return wrapUrl(rawUrl.replace(/^https?:\/\//i, ''))
    }

    /* ======================================================================
       СЕТЬ (Lampa.Reguest в Promise)
       ====================================================================== */

    function req(url, postData) {
        return new Promise(function (resolve, reject) {
            var net = new Lampa.Reguest()
            net.timeout(25000)
            net.silent(url, resolve, reject, postData, { timeout: 25000 })
        })
    }

    function vkError(jqXHR) {
        var data = null
        if (jqXHR && jqXHR.responseJSON) data = jqXHR.responseJSON
        else if (jqXHR && typeof jqXHR.responseText === 'string') {
            try { data = JSON.parse(jqXHR.responseText) } catch (e) { }
        }
        var e = data && data.error
        if (e) return { code: e.error_code, msg: e.error_msg || '', descr: e.descr || '' }
        if (jqXHR && jqXHR.status === 0) return { code: -1, msg: lang('vkv_err_net') }
        return { code: -2, msg: 'HTTP ' + ((jqXHR && jqXHR.status) || '?') }
    }

    function handleVkResponse(r) {
        if (r && r.error) throw { code: r.error.error_code, msg: r.error.error_msg || '', descr: r.error.descr || '' }
        return r && r.response
    }

    /* ======================================================================
       ТОКЕНЫ
       ====================================================================== */

    var Tokens = {
        _web: null,
        _ios: null,

        deviceId: function () {
            var d = Lampa.Storage.get('vkv_device_id', '')
            if (!d) {
                d = 'vkv-' + uuid(16)
                Lampa.Storage.set('vkv_device_id', d)
            }
            return d
        },

        // Веб-анонимный токен VK Видео (как у vkvideo.ru) — поиск, video.get
        web: function (force) {
            if (this._web && !force) return this._web
            var self = this
            this._web = new Promise(function (resolve, reject) {
                var c = Lampa.Storage.get('vkv_anon_web') || {}
                if (!force && c.token && c.expired_at && c.expired_at - Date.now() / 1000 > 300) {
                    return resolve(c.token)
                }
                // act обязателен в query — без него login.vk.com отвечает invalid_client
                req(apiUrl(LOGIN_HOST, '', { act: 'get_anonym_token' }), {
                    act: 'get_anonym_token',
                    client_id: WEB_CLIENT.id,
                    client_secret: WEB_CLIENT.secret,
                    scopes: 'audio_anonymous,video_anonymous,photos_anonymous,profile_anonymous',
                    isApiOauthAnonymEnabled: 'false',
                    version: '1',
                    app_id: WEB_CLIENT.id
                }).then(function (r) {
                    var d = r && r.data
                    if (d && d.access_token) {
                        Lampa.Storage.set('vkv_anon_web', {
                            token: d.access_token,
                            expired_at: d.expired_at || (Math.floor(Date.now() / 1000) + 86000)
                        })
                        resolve(d.access_token)
                    } else {
                        reject({ code: -3, msg: 'VK: anonymous token unavailable' })
                    }
                }).catch(function (e) {
                    self._web = null
                    reject(e)
                })
            })
            return this._web
        },

        // Мобильный анонимный токен (клиент VK Video iOS) — резервный путь video.get
        ios: function (force) {
            if (this._ios && !force) return this._ios
            var self = this
            this._ios = new Promise(function (resolve, reject) {
                var c = Lampa.Storage.get('vkv_anon_ios') || {}
                if (!force && c.token && c.expired_at && c.expired_at - Date.now() / 1000 > 300) {
                    return resolve(c.token)
                }
                req(apiUrl(API_HOST, 'method/auth.getAnonymToken', {
                    client_id: IOS_CLIENT.id,
                    client_secret: IOS_CLIENT.secret,
                    device_id: self.deviceId(),
                    v: APIV_VER
                })).then(function (r) {
                    var d = r && r.response
                    if (d && d.token) {
                        Lampa.Storage.set('vkv_anon_ios', {
                            token: d.token,
                            expired_at: d.expired_at || (Math.floor(Date.now() / 1000) + 86000)
                        })
                        resolve(d.token)
                    } else {
                        reject({ code: -3, msg: 'VK: anonymous token unavailable' })
                    }
                }).catch(function (e) {
                    self._ios = null
                    reject(e)
                })
            })
            return this._ios
        }
    }

    /* ======================================================================
       API
       ====================================================================== */

    var SUBS_EXECUTE =
        'var g=API.groups.get({"count":' + SUBS_GROUPS_LIMIT + ',"extended":1,"fields":"photo_200,members_count","offset":0});' +
        'var out=[];var i=0;' +
        'while(i<g.items.length){' +
        'var v=API.video.get({"owner_id":-g.items[i].id,"count":' + SUBS_VIDEOS_PER_GROUP + '});' +
        'var j=0;' +
        'while(j<v.items.length){' +
        'var it=v.items[j];it.gid=g.items[i].id;it.gname=g.items[i].name;it.gphoto=g.items[i].photo_200;out.push(it);j=j+1;}' +
        'i=i+1;}' +
        'return {"count":g.count,"groups":g.items,"items":out};'

    var Api = {
        // Анонимный вызов VK Видео (веб-токен); параметры в теле POST
        webCall: function (method, params, opts) {
            opts = opts || {}
            return Tokens.web(opts.forceToken).then(function (tok) {
                var p = ext({}, params || {})
                p.access_token = tok
                p.v = APIV_WEB_VER
                return req(apiUrl(APIV_HOST, 'method/' + method, { client_id: WEB_CLIENT.id, v: APIV_WEB_VER }), p)
                    .then(handleVkResponse)
                    .catch(function (e) {
                        if (e && (e.code === 1116 || e.code === 28) && !opts.retried) {
                            opts.retried = true
                            Tokens.web(true)
                            return Api.webCall(method, params, opts)
                        }
                        throw e
                    })
            })
        },

        // Анонимный вызов VK Видео (мобильный токен, резерв)
        iosCall: function (method, params) {
            return Tokens.ios().then(function (tok) {
                var p = ext({ anonymous_token: tok, device_id: Tokens.deviceId(), lang: 'ru' }, params || {})
                return req(apiUrl(APIV_HOST, 'method/' + method, { v: APIV_VER }), p).then(handleVkResponse)
            })
        },

        // Вызов с user-токеном (api.vk.com, GET)
        userCall: function (method, params) {
            var token = Lampa.Storage.get('vkv_token') || ''
            if (!token) return Promise.reject({ code: 'auth', msg: lang('vkv_need_login') })
            var p = ext({ access_token: token, v: API_VER, lang: 'ru' }, params || {})
            return req(apiUrl(API_HOST, 'method/' + method, p)).then(handleVkResponse)
        },

        // --- Поиск (всегда анонимно; возвращает видео с готовыми files) ---
        search: function (q) {
            return Api.webCall('catalog.getVideoSearchWeb2', {
                screen_ref: 'search_video_service',
                input_method: 'keyboard_search_button',
                q: q
            }).then(parseSearch)
        },

        // --- Канал (анонимно доступен) ---
        channelVideos: function (oid, offset) {
            return Api.webCall('video.get', {
                owner_id: String(oid),
                count: String(PAGE_SIZE),
                offset: String(offset || 0)
            }).then(function (r) {
                return { count: (r && r.count) || 0, items: parseVideoList(r && r.items) }
            })
        },

        // --- Разрешение ссылки на файлы конкретного видео ---
        resolve: function (v) {
            var vids = v.oid + '_' + v.id + (v.access_key ? '_' + v.access_key : '')
            return Api.webCall('video.get', { videos: vids }).then(function (r) {
                var it = r && r.items && r.items[0]
                if (it) return it
                throw { code: -5, msg: lang('vkv_err_play') }
            }).catch(function (e) {
                if (e && e.code === 'auth') throw e
                // резерв: мобильная анонимная цепочка
                return Api.iosCall('video.get', { videos: vids }).then(function (r2) {
                    var it2 = r2 && r2.items && r2.items[0]
                    if (it2) return it2
                    throw { code: -5, msg: lang('vkv_err_play') }
                })
            })
        },

        // --- Тренды (user-токен, best-effort: метод закрыт для анонимных токенов) ---
        trends: function () {
            return Api.userCall('video.getPublicSectionFeed', { section_name: 'trends', limit: '20' }).then(function (r) {
                var url = r && (r.url || r.feed_url || r.file_url)
                if (!url) return extractVideos(r, 0)
                return req(mediaUrl(url)).then(function (feed) {
                    return extractVideos(feed, 0)
                })
            })
        },

        // --- Подписки: каналы + новые видео одним execute-вызовом ---
        subsFeed: function () {
            return Api.userCall('execute', { code: SUBS_EXECUTE }).then(function (r) {
                var items = parseVideoList(r && r.items)
                items.sort(function (a, b) { return (b.date || 0) - (a.date || 0) })
                var groups = []
                for (var i = 0; i < ((r && r.groups) || []).length; i++) {
                    var g = normGroup(r.groups[i])
                    if (g) groups.push(g)
                }
                return { items: items.slice(0, 60), groups: groups }
            })
        },

        // --- Мне нравится (закладки fave) ---
        faveVideos: function (offset) {
            return Api.userCall('fave.getVideos', {
                count: String(PAGE_SIZE),
                offset: String(offset || 0)
            }).then(function (r) {
                var raw = (r && r.items) ? r.items : (Array.isArray(r) ? r : [])
                var list = []
                for (var i = 0; i < raw.length; i++) {
                    var it = raw[i]
                    var v = it && it.video ? it.video : it
                    var n = normVideo(v)
                    if (n) list.push(n)
                }
                return { count: (r && r.count) || list.length, items: list }
            })
        },

        // --- Посмотреть позже (системный альбом) ---
        laterVideos: function () {
            return Api.userCall('video.getAlbums', {
                need_system: '1',
                extended: '1',
                count: '100'
            }).then(function (r) {
                var items = (r && r.items) || []
                var album = null
                for (var i = 0; i < items.length; i++) {
                    var a = items[i]
                    if (typeof a.id === 'number' && a.id < 0) {
                        var t = (a.title || '').toLowerCase()
                        if (t.indexOf('позже') >= 0 || t.indexOf('later') >= 0) { album = a; break }
                        if (!album) album = a
                    }
                }
                if (!album) throw { code: -7, msg: lang('vkv_empty') }
                return Api.userCall('video.get', {
                    owner_id: String(album.owner_id || (Auth.user() && Auth.user().id) || 0),
                    album_id: String(album.id),
                    count: String(PAGE_SIZE),
                    extended: '1'
                }).then(function (r2) {
                    return { count: (r2 && r2.count) || 0, items: parseVideoList(r2 && r2.items) }
                })
            })
        },

        // --- Комментарии ---
        comments: function (v, offset) {
            return Api.userCall('video.getComments', {
                owner_id: String(v.oid),
                video_id: String(v.id),
                count: '30',
                offset: String(offset || 0),
                need_likes: '1',
                extended: '1',
                sort: 'desc'
            }).then(function (r) {
                var profiles = {}
                var pl = (r && r.profiles) || []
                for (var i = 0; i < pl.length; i++) {
                    profiles[pl[i].id] = { name: ((pl[i].first_name || '') + ' ' + (pl[i].last_name || '')).trim(), photo: pl[i].photo_100 || '' }
                }
                var groups = {}
                var gl = (r && r.groups) || []
                for (var j = 0; j < gl.length; j++) {
                    groups[-gl[j].id] = { name: gl[j].name || '', photo: gl[j].photo_100 || gl[j].photo_50 || '' }
                }
                var out = []
                var il = (r && r.items) || []
                for (var k = 0; k < il.length; k++) {
                    var c = il[k]
                    var who = profiles[c.from_id] || groups[c.from_id] || { name: 'VK', photo: '' }
                    out.push({ name: who.name, photo: who.photo, text: c.text || '', date: c.date || 0 })
                }
                return { count: (r && r.count) || out.length, items: out }
            })
        },

        addComment: function (v, message) {
            return Api.userCall('video.createComment', {
                owner_id: String(v.oid),
                video_id: String(v.id),
                message: message
            })
        },

        // --- Лайки ---
        likeState: function (v) {
            return Api.userCall('likes.isLiked', {
                type: 'video',
                owner_id: String(v.oid),
                item_id: String(v.id)
            }).then(function (r) { return !!(r && r.liked) })
        },

        likeAdd: function (v) {
            return Api.userCall('likes.add', { type: 'video', owner_id: String(v.oid), item_id: String(v.id) })
        },

        likeRemove: function (v) {
            return Api.userCall('likes.delete', { type: 'video', owner_id: String(v.oid), item_id: String(v.id) })
        },

        // --- Закладки ---
        faveAdd: function (v) {
            return Api.userCall('fave.addVideo', { owner_id: String(v.oid), video_id: String(v.id) })
        },

        faveRemove: function (v) {
            return Api.userCall('fave.removeVideo', { owner_id: String(v.oid), video_id: String(v.id) })
        }
    }

    /* ======================================================================
       НОРМАЛИЗАЦИЯ ДАННЫХ
       ====================================================================== */

    function pickImage(imgs) {
        if (!imgs || !imgs.length) return ''
        var best = null, bestD = 1e9
        for (var i = 0; i < imgs.length; i++) {
            var w = (imgs[i] && imgs[i].width) || 0
            var d = Math.abs(w - 640)
            if (d < bestD) { bestD = d; best = imgs[i] }
        }
        return (best && best.url) || ''
    }

    function normVideo(v, channel) {
        if (!v || typeof v.id === 'undefined' || typeof v.owner_id === 'undefined') return null
        if (v.response_type && v.response_type !== 'video' && v.response_type !== 'full') return null
        return {
            oid: v.owner_id,
            id: v.id,
            key: v.owner_id + '_' + v.id,
            access_key: v.access_key || '',
            title: v.title || 'VK Video',
            duration: v.duration || 0,
            views: v.views || 0,
            date: v.date || 0,
            description: v.description || '',
            comments: v.comments || 0,
            likes: (v.likes && v.likes.count) || 0,
            user_likes: (v.likes && v.likes.user_likes) || 0,
            img: pickImage(v.image) || pickImage(v.first_frame),
            channel_name: v.gname || (channel && channel.name) || '',
            channel_photo: v.gphoto || (channel && channel.photo) || '',
            files: v.files || null,
            restriction: (v.restriction && v.restriction.title) || ''
        }
    }

    function parseVideoList(list, channel) {
        var out = []
        for (var i = 0; i < (list || []).length; i++) {
            var n = normVideo(list[i], channel)
            if (n) out.push(n)
        }
        return out
    }

    function normGroup(g) {
        if (!g || typeof g.id === 'undefined') return null
        return {
            id: g.id,
            oid: -(g.id),
            name: g.name || g.screen_name || 'VK',
            photo: g.photo_200 || g.photo_100 || g.photo_50 || '',
            members: g.members_count || 0
        }
    }

    function parseSearch(r) {
        var out = { videos: [], groups: [] }
        var seen = {}, gseen = {}
        var cv = (r && r.catalog_videos) || []
        for (var i = 0; i < cv.length; i++) {
            var v = normVideo(cv[i] && cv[i].video)
            if (v && !seen[v.key]) { seen[v.key] = 1; out.videos.push(v) }
        }
        var fl = (r && r.videos) || []
        for (var j = 0; j < fl.length; j++) {
            var it = fl[j] && fl[j].video ? fl[j].video : fl[j]
            var n = normVideo(it)
            if (n && !seen[n.key]) { seen[n.key] = 1; out.videos.push(n) }
        }
        var gr = (r && r.groups) || []
        for (var k = 0; k < gr.length; k++) {
            var g = normGroup(gr[k])
            if (g && !gseen[g.id]) { gseen[g.id] = 1; out.groups.push(g) }
        }
        return out
    }

    // Достаёт видео-подобные объекты из неизвестной структуры фида трендов
    function extractVideos(obj, depth) {
        var out = [], seen = {}
        function walk(o, d) {
            if (!o || d > 3 || out.length > 40) return
            if (typeof o === 'string' || typeof o === 'number') return
            if (typeof o.length === 'number') {
                for (var i = 0; i < o.length; i++) walk(o[i], d + 1)
                return
            }
            if (typeof o === 'object') {
                if (typeof o.id !== 'undefined' && typeof o.owner_id !== 'undefined' && (o.title || o.duration)) {
                    var n = normVideo(o)
                    if (n && !seen[n.key]) { seen[n.key] = 1; out.push(n) }
                    return
                }
                for (var k in o) {
                    if (Object.prototype.hasOwnProperty.call(o, k)) walk(o[k], d + 1)
                }
            }
        }
        walk(obj, depth)
        return out
    }

    /* ======================================================================
       АВТОРИЗАЦИЯ (гибрид: аноним + user-токен)
       ====================================================================== */

    var Auth = {
        token: function () {
            return Lampa.Storage.get('vkv_token') || ''
        },

        user: function () {
            return Lampa.Storage.get('vkv_user') || null
        },

        loginWithToken: function (raw) {
            return new Promise(function (resolve, reject) {
                var token = (raw || '').trim()
                var m = token.match(/access_token=([A-Za-z0-9_\-.]+)/)
                if (m) token = m[1]
                if (!token) return reject({ code: -4, msg: lang('vkv_token_bad') })
                req(apiUrl(API_HOST, 'method/users.get', {
                    access_token: token,
                    v: API_VER,
                    fields: 'photo_200'
                })).then(function (r) {
                    var u = r && r[0]
                    if (!u || !u.id) return reject({ code: -4, msg: lang('vkv_token_bad') })
                    Lampa.Storage.set('vkv_token', token)
                    Lampa.Storage.set('vkv_user', {
                        id: u.id,
                        name: ((u.first_name || '') + ' ' + (u.last_name || '')).trim(),
                        photo: u.photo_200 || u.photo_100 || ''
                    })
                    resolve(u)
                }).catch(function (e) {
                    reject(e && e.msg ? e : { code: -4, msg: lang('vkv_token_bad') })
                })
            })
        },

        logout: function () {
            Lampa.Storage.set('vkv_token', '')
            Lampa.Storage.set('vkv_user', null)
        }
    }

    /* ======================================================================
       ЛОКАЛЬНАЯ ИСТОРИЯ ПРОСМОТРОВ
       У VK нет API истории — прогресс хранится в Lampa Storage (LRU 300).
       ====================================================================== */

    var History = {
        enabled: function () {
            try {
                var f = Lampa.Storage.field ? Lampa.Storage.field('vkv_history') : undefined
                if (f === undefined || f === null) return true
                return !!f
            } catch (e) { return true }
        },

        all: function () {
            return Lampa.Storage.cache('vkv_history', 300, {})
        },

        get: function (key) {
            return this.all()[key]
        },

        save: function (v, position) {
            if (!this.enabled() || !v || !v.key) return
            var a = this.all()
            var rec = a[v.key] || {}
            rec.oid = v.oid
            rec.id = v.id
            rec.access_key = v.access_key || ''
            rec.title = v.title || rec.title || ''
            rec.img = v.img || rec.img || ''
            rec.channel = v.channel_name || rec.channel || ''
            rec.duration = v.duration || rec.duration || 0
            rec.position = position || 0
            rec.updated = Math.floor(Date.now() / 1000)
            a[v.key] = rec
            Lampa.Storage.set('vkv_history', a)
        },

        list: function () {
            var a = this.all(), out = []
            for (var k in a) {
                if (!Object.prototype.hasOwnProperty.call(a, k)) continue
                var r = a[k]
                out.push({
                    oid: r.oid, id: r.id, key: k, access_key: r.access_key || '',
                    title: r.title || 'VK Video', duration: r.duration || 0,
                    img: r.img || '', channel_name: r.channel || '',
                    position: r.position || 0, views: 0, date: r.updated || 0
                })
            }
            out.sort(function (x, y) { return y.date - x.date })
            return out
        },

        continueList: function () {
            return this.list().filter(function (r) {
                return r.duration > 60 && r.position > 20 && r.position < r.duration * 0.95
            })
        },

        clear: function () {
            Lampa.Storage.set('vkv_history', {})
        }
    }

    /* ======================================================================
       ПЛЕЕР
       ====================================================================== */

    function maxQuality() {
        var q = parseInt(Lampa.Storage.get('vkv_max_quality') || '1080', 10)
        return isNaN(q) ? 1080 : q
    }

    function qualityMap(files) {
        var useProxy = !!getProxy()
        var q = {}
        if (useProxy && files.hls) q[lang('vkv_quality_auto')] = mediaUrl(files.hls)
        var defs = [
            ['mp4_2160', '2160p 4K'], ['mp4_1440', '1440p QHD'],
            ['mp4_1080', '1080p FullHD'], ['mp4_720', '720p HD'],
            ['mp4_480', '480p'], ['mp4_360', '360p'],
            ['mp4_240', '240p'], ['mp4_144', '144p']
        ]
        for (var i = 0; i < defs.length; i++) {
            var h = parseInt(defs[i][0].slice(4), 10)
            if (files[defs[i][0]] && h <= maxQuality()) q[defs[i][1]] = mediaUrl(files[defs[i][0]])
        }
        return q
    }

    function subtitleList(item) {
        if (!getProxy()) return [] // vtt читается через XHR — без прокси упрётся в CORS
        var out = []
        var subs = (item && item.subtitles) || []
        for (var i = 0; i < subs.length; i++) {
            var s = subs[i]
            if (s && s.url) out.push({
                label: s.manifest_name || s.title || s.lang || 'SUB',
                url: mediaUrl(s.url)
            })
        }
        return out
    }

    function buildPlaylist(v, list) {
        if (!getProxy()) return []
        var out = []
        for (var i = 0; i < (list || []).length && out.length < 50; i++) {
            var x = list[i]
            if (x.key === v.key || !x.files) continue
            var url = x.files.hls || x.files.mp4_720
            if (url) out.push({ title: x.title, url: mediaUrl(url) })
        }
        return out
    }

    function openDetail(v, list) {
        Lampa.Activity.push({
            component: 'vkv_detail',
            title: v.title,
            video: v,
            list: list || null,
            page: 1
        })
    }

    function playVideo(v, list) {
        var start = function (item) {
            var files = (item && item.files) || v.files
            if ((!files || (!files.hls && !files.mp4_240 && !files.mp4_720))) {
                var msg = (item && item.restriction && item.restriction.title) || v.restriction || lang('vkv_err_play')
                throw { code: -6, msg: msg }
            }
            var q = qualityMap(files)
            var empty = true
            for (var k in q) { empty = false; break }
            if (empty) throw { code: -6, msg: lang('vkv_err_play') }

            var data = {
                title: (item && item.title) || v.title,
                quality: q,
                subtitles: subtitleList(item)
            }
            var pl = buildPlaylist(v, list)
            if (pl.length) data.playlist = pl

            Lampa.Player.play(data)

            Tracker.start({
                key: v.key, oid: v.oid, id: v.id, access_key: v.access_key || '',
                title: data.title, img: v.img || '', channel_name: v.channel_name || '',
                duration: (item && item.duration) || v.duration || 0
            })
        }

        var useKnown = v.files && (v.files.hls || v.files.mp4_720)
        var p = useKnown ? Promise.resolve(null) : Api.resolve(v)
        p.then(function (item) {
            start(item)
        }).catch(function (e) {
            Lampa.Noty.show((e && e.msg) || lang('vkv_err_play'))
        })
    }

    // Запись прогресса в историю + возобновление
    var Tracker = {
        video: null, last: 0, resumed: false, lastPos: 0, lastDur: 0, removes: [],

        start: function (v) {
            this.stop()
            this.video = v
            this.resumed = false
            this.lastPos = 0
            this.lastDur = 0
            this.last = 0
            var self = this

            this.removes.push(subscribe(Lampa.PlayerVideo.listener, 'timeupdate', function (e) {
                if (!self.video) return
                if (e && e.duration > 0) {
                    self.lastDur = e.duration
                    self.lastPos = e.current || 0
                }
                if (self.lastDur > 0) {
                    var now = Date.now()
                    if (now - self.last > 10000) {
                        self.last = now
                        History.save(self.video, self.lastPos)
                    }
                }
                if (!self.resumed && self.lastDur > 0) {
                    self.resumed = true
                    var rec = History.get(self.video.key)
                    if (rec && rec.position > 30 && self.lastDur - rec.position > 30) {
                        try {
                            var el = Lampa.PlayerVideo.video()
                            if (el && el.currentTime !== undefined) {
                                el.currentTime = rec.position
                                Lampa.Noty.show(lang('vkv_resume') + ' ' + fmtTime(rec.position))
                            }
                        } catch (err) { }
                    }
                }
            }))

            this.removes.push(subscribe(Lampa.Player.listener, 'destroy', function () {
                if (self.video && self.lastDur > 0) History.save(self.video, self.lastPos)
                self.stop()
            }))
        },

        stop: function () {
            this.removes.forEach(function (f) { f() })
            this.removes = []
            this.video = null
        }
    }

    /* ======================================================================
       UI-ХЕЛПЕРЫ
       ====================================================================== */

    function videoSub(v) {
        var parts = []
        if (v.channel_name) parts.push(v.channel_name)
        if (v.views) parts.push(fmtNum(v.views) + ' ' + lang('vkv_views_word'))
        else if (v.date) parts.push(fmtDate(v.date))
        return parts.join(' · ')
    }

    function progressHtml(v) {
        if (!v.duration || !v.position || v.position < 5) return ''
        var pct = Math.round(v.position / v.duration * 100)
        if (pct <= 0 || pct >= 100) return ''
        return '<div class="vkv-progress"><div style="width:' + Math.min(99, pct) + '%"></div></div>'
    }

    function bgStyle(url) {
        return 'background-image:url(\'' + esc(url || '') + '\')'
    }

    // opts: {list, isChannels, onFocus(card), onNeedMore()}
    function mediaCard(v, opts) {
        opts = opts || {}
        var card
        if (opts.isChannels) {
            card = $('<div class="vkv-chan selector">' +
                '<div class="vkv-chan__img" style="' + bgStyle(g_photo(v)) + '"></div>' +
                '<div class="vkv-chan__name">' + esc(v.name) + '</div>' +
                (v.members ? '<div class="vkv-chan__sub">' + fmtNum(v.members) + ' ' + lang('vkv_subs_members') + '</div>' : '') +
                '</div>')
            card.on('hover:enter', function () {
                Lampa.Activity.push({ component: 'vkv_channel', title: v.name, group: v, page: 1 })
            })
        } else {
            card = $('<div class="vkv-card selector">' +
                '<div class="vkv-card__img" style="' + bgStyle(v.img) + '">' +
                (v.duration ? '<div class="vkv-card__time">' + fmtTime(v.duration) + '</div>' : '') +
                '</div>' +
                '<div class="vkv-card__title">' + esc(v.title) + '</div>' +
                '<div class="vkv-card__sub">' + esc(videoSub(v)) + '</div>' +
                progressHtml(v) +
                '</div>')
            card.on('hover:enter', function () {
                openDetail(v, opts.list)
            })
        }
        card.on('hover:focus', function () {
            opts.onFocus && opts.onFocus(card)
            opts.onNeedMore && opts.onNeedMore()
        })
        return card
    }

    function g_photo(g) { return g && g.photo ? g.photo : '' }

    function sectionRow(title) {
        return $('<div class="vkv-section">' +
            '<div class="vkv-section__title">' + esc(title) + '</div>' +
            '<div class="vkv-grid"></div></div>')
    }

    function emptyNote(text) {
        return $('<div class="vkv-empty">' + esc(text || lang('vkv_empty')) + '</div>')
    }

    function btn(label, main) {
        return $('<div class="vkv-btn selector ' + (main ? 'vkv-btn--main' : '') + '">' + esc(label) + '</div>')
    }

    // Карточка-приглашение для гостя
    function loginPrompt(text) {
        var n = $('<div class="vkv-note">' + esc(text) + '<div class="vkv-note__btns"></div></div>')
        var b = btn(lang('vkv_login'), true)
        b.on('hover:enter', function () {
            Lampa.Activity.push({ component: 'vkv_login', title: lang('vkv_login_title'), page: 1 })
        })
        n.find('.vkv-note__btns').append(b)
        return n
    }

    // Заполнение сетки; пагинация — догрузка при фокусе на последних карточках
    function fillGrid(grid, items, opts) {
        opts = opts || {}
        items.forEach(function (v, i) {
            var more = opts.onNeedMore && i >= items.length - 4
            var c = mediaCard(v, {
                list: opts.list,
                isChannels: opts.isChannels,
                onFocus: opts.onFocus,
                onNeedMore: more ? opts.onNeedMore : null
            })
            grid.append(c)
        })
        if (opts.active && items.length) {
            try {
                var added = grid.children('.selector').toArray().slice(-items.length)
                Lampa.Controller.collectionAppend(added)
            } catch (e) { }
        }
    }

    /* ======================================================================
       ОБЩИЕ ЧАСТИ ЭКРАНОВ
       ====================================================================== */

    function makeScreen(bodyBuilder) {
        // Возвращает объект с общими полями экрана: scroll/content/refresh/контроллер
        var scroll = new Lampa.Scroll({ mask: true, over: true })
        var content = $('<div class="vkv-content"></div>')
        var screen = {
            scroll: scroll,
            content: content,
            last: false,
            started: false,
            render: function () { return scroll.render() },
            destroy: function () {
                this.started = false
                scroll.destroy()
            },
            refresh: function () {
                if (!this.started) return
                try {
                    Lampa.Controller.collectionSet(scroll.render())
                    Lampa.Controller.collectionFocus(this.last || false, scroll.render())
                } catch (e) { }
            },
            controller: function () {
                var s = this
                Lampa.Controller.add('content', {
                    toggle: function () {
                        Lampa.Controller.collectionSet(scroll.render())
                        Lampa.Controller.collectionFocus(s.last || false, scroll.render())
                    },
                    up: function () { if (navCan('up')) navMove('up') },
                    down: function () { if (navCan('down')) navMove('down') },
                    left: function () { if (navCan('left')) navMove('left'); else Lampa.Controller.toggle('menu') },
                    right: function () { if (navCan('right')) navMove('right') },
                    back: function () { Lampa.Activity.backward() }
                })
                Lampa.Controller.toggle('content')
            }
        }
        return screen
    }

    /* ======================================================================
       ЭКРАН: ГЛАВНАЯ (табы)
       ====================================================================== */

    function MainScreen(object) {
        var self = this
        var screen = makeScreen()
        var scroll = screen.scroll
        var content = screen.content
        var inited = false
        var current = object.tab || 'home'

        var TABS = [
            ['home', 'vkv_home'],
            ['subs', 'vkv_subs'],
            ['like', 'vkv_like'],
            ['later', 'vkv_later'],
            ['history', 'vkv_history']
        ]

        function addSection(title, items, opts) {
            opts = opts || {}
            var s = sectionRow(title)
            fillGrid(s.find('.vkv-grid').eq(0), items, {
                list: opts.list || items,
                isChannels: opts.isChannels,
                active: screen.started,
                onFocus: function (c) { screen.last = c }
            })
            content.append(s)
            return s
        }

        function renderHome() {
            var my = current
            var cont = History.continueList()
            if (cont.length) addSection(lang('vkv_continue'), cont, { list: cont })

            if (!Auth.token()) {
                content.append(loginPrompt(lang('vkv_guest_home')))
                self.activity.loader(false)
                return
            }

            var trendsP = Api.trends().catch(function () { return [] })
            var subsP = Api.subsFeed().catch(function () { return null })

            Promise.all([trendsP, subsP]).then(function (rs) {
                if (!inited || my !== current) return
                if (rs[0] && rs[0].length) addSection(lang('vkv_popular'), rs[0])
                if (rs[1]) {
                    if (rs[1].items.length) addSection(lang('vkv_new_subs'), rs[1].items)
                    if (rs[1].groups.length) addSection(lang('vkv_my_channels'), rs[1].groups, { isChannels: true })
                }
                self.activity.loader(false)
                screen.refresh()
            })
        }

        function renderSubs() {
            var my = current
            if (!Auth.token()) {
                content.append(loginPrompt(lang('vkv_need_login')))
                self.activity.loader(false)
                return
            }
            Api.subsFeed().then(function (r) {
                if (!inited || my !== current) return
                if (r.items.length) addSection(lang('vkv_new_subs'), r.items)
                if (r.groups.length) addSection(lang('vkv_my_channels'), r.groups, { isChannels: true })
                if (!r.items.length && !r.groups.length) content.append(emptyNote())
                self.activity.loader(false)
                screen.refresh()
            }).catch(tabError)
        }

        function renderFave() {
            var my = current
            if (!Auth.token()) {
                content.append(loginPrompt(lang('vkv_need_login')))
                self.activity.loader(false)
                return
            }
            Api.faveVideos(0).then(function (r) {
                if (!inited || my !== current) return
                if (r.items.length) addSection(lang('vkv_like'), r.items)
                else content.append(emptyNote())
                self.activity.loader(false)
                screen.refresh()
            }).catch(tabError)
        }

        function renderLater() {
            var my = current
            if (!Auth.token()) {
                content.append(loginPrompt(lang('vkv_need_login')))
                self.activity.loader(false)
                return
            }
            Api.laterVideos().then(function (r) {
                if (!inited || my !== current) return
                if (r.items.length) addSection(lang('vkv_later'), r.items)
                else content.append(emptyNote())
                self.activity.loader(false)
                screen.refresh()
            }).catch(tabError)
        }

        function renderHistory() {
            var my = current
            var list = History.list()
            if (list.length) addSection(lang('vkv_history'), list, { list: list })
            else content.append(emptyNote())

            var row = $('<div class="vkv-row"></div>')
            var clearB = btn(lang('vkv_clear_history'))
            clearB.on('hover:enter', function () {
                Lampa.Modal.open({
                    title: lang('vkv_clear_history'),
                    html: $('<div style="padding:1em">' + esc(lang('vkv_clear_q')) + '</div>'),
                    buttons: [{
                        name: lang('vkv_yes'),
                        onSelect: function () {
                            Lampa.Modal.close()
                            History.clear()
                            if (inited && my === current) {
                                content.empty()
                                scroll.reset()
                                renderHistory()
                                screen.refresh()
                            }
                            Lampa.Noty.show(lang('vkv_cleared'))
                        }
                    }, {
                        name: lang('vkv_no'),
                        onSelect: function () { Lampa.Modal.close() }
                    }],
                    onBack: function () { Lampa.Modal.close() }
                })
            })
            clearB.on('hover:focus', function () { screen.last = clearB })
            row.append(clearB)
            content.append(row)
            self.activity.loader(false)
        }

        function tabError(e) {
            if (!inited) return
            if (e && e.code === 'auth') content.append(loginPrompt(lang('vkv_need_login')))
            else content.append(emptyNote((e && e.msg) || lang('vkv_err_net')))
            self.activity.loader(false)
            screen.refresh()
        }

        function switchTab(t) {
            screen.last = false
            content.empty()
            scroll.reset()
            self.activity.loader(true)
            if (t === 'home') renderHome()
            else if (t === 'subs') renderSubs()
            else if (t === 'like') renderFave()
            else if (t === 'later') renderLater()
            else renderHistory()
            screen.refresh()
        }

        this.create = function () {
            inited = true
            self.activity.loader(true)

            var bar = $('<div class="vkv-tabs"></div>')
            TABS.forEach(function (t) {
                var b = $('<div class="vkv-tab selector ' + (t[0] === current ? 'active' : '') + '" data-tab="' + t[0] + '">' + esc(lang(t[1])) + '</div>')
                b.on('hover:enter', function () {
                    if (current === t[0]) return
                    current = t[0]
                    bar.find('.vkv-tab').removeClass('active')
                    b.addClass('active')
                    switchTab(t[0])
                })
                b.on('hover:focus', function () { screen.last = b })
                bar.append(b)
            })
            var s = $('<div class="vkv-tab vkv-tab--search selector">' + esc(lang('vkv_search')) + '</div>')
            s.on('hover:enter', function () {
                Lampa.Activity.push({ component: 'vkv_search', title: lang('vkv_search'), page: 1 })
            })
            s.on('hover:focus', function () { screen.last = s })
            bar.append(s)

            scroll.append(bar)
            scroll.append(content)

            switchTab(current)
            return this.render()
        }

        this.start = function () {
            screen.started = true
            screen.controller()
        }

        this.stop = function () {
            screen.started = false
        }

        this.render = function () {
            return scroll.render()
        }

        this.destroy = function () {
            inited = false
            screen.destroy()
        }
    }

    /* ======================================================================
       ЭКРАН: ПОИСК
       ====================================================================== */

    function SearchScreen(object) {
        var self = this
        var screen = makeScreen()
        var scroll = screen.scroll
        var content = screen.content
        var inited = false
        var asked = false
        var query = (object && object.query) || ''

        function ask() {
            Lampa.Input.edit({
                title: lang('vkv_search_ph'),
                free: true,
                nosave: true,
                nomic: true
            }, function (val) {
                val = (val || '').trim()
                if (val) {
                    query = val
                    doSearch(val)
                }
            })
        }

        function doSearch(q) {
            if (!inited) return
            var my = q
            content.empty()
            scroll.reset()
            self.activity.loader(true)
            Api.search(q).then(function (r) {
                if (!inited || my !== q) return
                if (r.videos.length) {
                    var s = sectionRow(lang('vkv_title'))
                    fillGrid(s.find('.vkv-grid').eq(0), r.videos, {
                        list: r.videos,
                        active: screen.started,
                        onFocus: function (c) { screen.last = c }
                    })
                    content.append(s)
                }
                if (r.groups.length) {
                    var s2 = sectionRow(lang('vkv_channels'))
                    fillGrid(s2.find('.vkv-grid').eq(0), r.groups, {
                        isChannels: true,
                        active: screen.started,
                        onFocus: function (c) { screen.last = c }
                    })
                    content.append(s2)
                }
                if (!r.videos.length && !r.groups.length) content.append(emptyNote())
                self.activity.loader(false)
                screen.refresh()
            }).catch(function (e) {
                if (!inited || my !== q) return
                content.append(emptyNote((e && e.msg) || lang('vkv_err_net')))
                self.activity.loader(false)
                screen.refresh()
            })
        }

        this.create = function () {
            inited = true
            self.activity.loader(false)

            var row = $('<div class="vkv-row" style="padding-top:1em"></div>')
            var b = btn(lang('vkv_search') + (query ? ': ' + query : ''), true)
            b.on('hover:enter', function () { ask() })
            b.on('hover:focus', function () { screen.last = b })
            row.append(b)

            scroll.append(row)
            scroll.append(content)

            if (query) doSearch(query)
            return this.render()
        }

        this.start = function () {
            screen.started = true
            screen.controller()
            if (!query && !asked) {
                asked = true
                ask()
            }
        }

        this.stop = function () {
            screen.started = false
        }

        this.render = function () {
            return scroll.render()
        }

        this.destroy = function () {
            inited = false
            screen.destroy()
        }
    }

    /* ======================================================================
       ЭКРАН: КАНАЛ
       ====================================================================== */

    function ChannelScreen(object) {
        var self = this
        var screen = makeScreen()
        var scroll = screen.scroll
        var content = screen.content
        var inited = false
        var group = object.group || null
        var oid = group ? -(group.id) : (object.oid || 0)
        var offset = 0
        var loading = false
        var list = []
        var grid = null

        function loadMore() {
            if (!inited || loading) return
            loading = true
            var first = !grid
            Api.channelVideos(oid, offset).then(function (r) {
                loading = false
                if (!inited) return
                if (first) {
                    self.activity.loader(false)
                    if (!r.items.length) {
                        content.append(emptyNote())
                        screen.refresh()
                        return
                    }
                    var s = sectionRow(lang('vkv_title'))
                    grid = s.find('.vkv-grid').eq(0)
                    content.append(s)
                }
                offset += r.items.length
                list = list.concat(r.items)
                fillGrid(grid, r.items, {
                    list: list,
                    active: screen.started,
                    onFocus: function (c) { screen.last = c },
                    onNeedMore: r.items.length >= PAGE_SIZE ? loadMore : null
                })
                screen.refresh()
            }).catch(function (e) {
                loading = false
                if (!inited || !first) return
                self.activity.loader(false)
                content.append(emptyNote((e && e.msg) || lang('vkv_err_net')))
                screen.refresh()
            })
        }

        this.create = function () {
            inited = true
            self.activity.loader(true)
            if (group) {
                content.append('<div class="vkv-chan-head">' +
                    '<div class="vkv-chan-head__img" style="' + bgStyle(group.photo) + '"></div>' +
                    '<div><div class="vkv-chan-head__name">' + esc(group.name) + '</div>' +
                    (group.members ? '<div class="vkv-chan-head__sub">' + fmtNum(group.members) + ' ' + lang('vkv_subs_members') + '</div>' : '') +
                    '</div></div>')
            }
            scroll.append(content)
            loadMore()
            return this.render()
        }

        this.start = function () {
            screen.started = true
            screen.controller()
        }

        this.stop = function () {
            screen.started = false
        }

        this.render = function () {
            return scroll.render()
        }

        this.destroy = function () {
            inited = false
            screen.destroy()
        }
    }

    /* ======================================================================
       ЭКРАН: ВИДЕО (детально + комментарии)
       ====================================================================== */

    function DetailScreen(object) {
        var self = this
        var screen = makeScreen()
        var scroll = screen.scroll
        var inited = false
        var v = object.video || {}
        var list = object.list || null
        var commentsLoaded = false

        function meta() {
            var parts = []
            if (v.duration) parts.push(fmtTime(v.duration))
            if (v.views) parts.push(fmtNum(v.views) + ' ' + lang('vkv_views_word'))
            if (v.date) parts.push(fmtDate(v.date))
            if (v.channel_name) parts.push(v.channel_name)
            return parts.join(' · ')
        }

        function needLogin() {
            Lampa.Activity.push({ component: 'vkv_login', title: lang('vkv_login_title'), page: 1 })
        }

        function likeButton() {
            var b = btn(lang('vkv_like_add') + (v.likes ? ' · ' + fmtNum(v.likes) : ''))
            b.on('hover:enter', function () {
                if (!Auth.token()) return needLogin()
                Api.likeState(v).then(function (liked) {
                    return (liked ? Api.likeRemove(v) : Api.likeAdd(v)).then(function () {
                        Lampa.Noty.show(lang(liked ? 'vkv_like_off' : 'vkv_like_on'))
                    })
                }).catch(function (e) {
                    Lampa.Noty.show((e && e.msg) || lang('vkv_err_net'))
                })
            })
            b.on('hover:focus', function () { screen.last = b })
            return b
        }

        function faveButton() {
            var b = btn(lang('vkv_fave_add'))
            b.on('hover:enter', function () {
                if (!Auth.token()) return needLogin()
                Api.faveAdd(v).then(function () {
                    Lampa.Noty.show(lang('vkv_fave_on'))
                }).catch(function (e) {
                    // вероятно, уже в закладках — пробуем убрать
                    Api.faveRemove(v).then(function () {
                        Lampa.Noty.show(lang('vkv_fave_off'))
                    }).catch(function (e2) {
                        Lampa.Noty.show((e2 && e2.msg) || (e && e.msg) || lang('vkv_err_net'))
                    })
                })
            })
            b.on('hover:focus', function () { screen.last = b })
            return b
        }

        function commentsButton() {
            var b = btn(lang('vkv_comments') + (v.comments ? ' · ' + fmtNum(v.comments) : ''))
            b.on('hover:enter', function () {
                if (!Auth.token()) return needLogin()
                loadComments()
            })
            b.on('hover:focus', function () { screen.last = b })
            return b
        }

        function copyButton() {
            var b = btn(lang('vkv_copy_link'))
            b.on('hover:enter', function () {
                var url = 'https://vkvideo.ru/video' + v.oid + '_' + v.id
                try {
                    Lampa.Utils.copyTextToClipboard(url)
                    Lampa.Noty.show(lang('vkv_copied'))
                } catch (e) {
                    Lampa.Noty.show(url)
                }
            })
            b.on('hover:focus', function () { screen.last = b })
            return b
        }

        function loadComments() {
            if (!Auth.token() || commentsLoaded || !inited) return
            commentsLoaded = true
            var box = scroll.render().find('.vkv-comments-box').eq(0)
            var emptyB = scroll.render().find('.vkv-comments-empty').eq(0)
            if (emptyB.length) emptyB.remove()
            Api.comments(v, 0).then(function (r) {
                if (!inited) return
                box.empty()
                if (!r.items.length) {
                    box.append(emptyNote(lang('vkv_empty')))
                    return
                }
                r.items.forEach(function (c) {
                    box.append('<div class="vkv-comment">' +
                        '<div class="vkv-comment__ava" style="' + bgStyle(c.photo) + '"></div>' +
                        '<div><div><span class="vkv-comment__name">' + esc(c.name) + '</span>' +
                        '<span class="vkv-comment__date">' + fmtDate(c.date) + '</span></div>' +
                        '<div class="vkv-comment__text">' + esc(c.text) + '</div></div>' +
                        '</div>')
                })
                screen.refresh()
            }).catch(function (e) {
                if (!inited) return
                box.empty()
                box.append(emptyNote((e && e.msg) || lang('vkv_err_net')))
            })
        }

        function commentButton() {
            var b = btn(lang('vkv_write_comment'))
            b.on('hover:enter', function () {
                if (!Auth.token()) return needLogin()
                Lampa.Input.edit({ title: lang('vkv_write_comment'), free: true, nosave: true, nomic: true }, function (val) {
                    val = (val || '').trim()
                    if (!val) return
                    Api.addComment(v, val).then(function () {
                        Lampa.Noty.show(lang('vkv_token_ok'))
                        commentsLoaded = false
                        loadComments()
                    }).catch(function (e) {
                        Lampa.Noty.show((e && e.msg) || lang('vkv_err_net'))
                    })
                })
            })
            b.on('hover:focus', function () { screen.last = b })
            return b
        }

        this.create = function () {
            inited = true
            self.activity.loader(false)

            var body = scroll.render().find('.scroll__body').eq(0)

            body.append('<div class="vkv-detail__hero">' +
                '<div class="vkv-detail__img" style="' + bgStyle(v.img) + '"></div>' +
                '<div class="vkv-detail__info">' +
                '<div class="vkv-detail__title">' + esc(v.title) + '</div>' +
                '<div class="vkv-detail__meta">' + esc(meta()) + '</div>' +
                (v.description ? '<div class="vkv-detail__desc">' + esc(v.description) + '</div>' : '') +
                '</div></div>')

            var playB = btn(lang('vkv_watch'), true)
            playB.on('hover:enter', function () { playVideo(v, list) })
            playB.on('hover:focus', function () { screen.last = playB })

            var row = $('<div class="vkv-detail__btns"></div>')
            row.append(playB, likeButton(), faveButton(), commentsButton(), commentButton(), copyButton())
            body.append(row)

            if (Auth.token()) {
                var csec = $('<div class="vkv-section">' +
                    '<div class="vkv-section__title">' + esc(lang('vkv_comments')) + '</div>' +
                    '<div class="vkv-comments-empty vkv-empty" style="padding:.5em 1em 1em"></div>' +
                    '<div class="vkv-comments-box"></div></div>')
                body.append(csec)
                loadComments()
            }

            return this.render()
        }

        this.start = function () {
            screen.started = true
            screen.controller()
        }

        this.stop = function () {
            screen.started = false
        }

        this.render = function () {
            return scroll.render()
        }

        this.destroy = function () {
            inited = false
            screen.destroy()
        }
    }

    /* ======================================================================
       ЭКРАН: ВХОД
       ====================================================================== */

    function LoginScreen(object) {
        var self = this
        var screen = makeScreen()
        var scroll = screen.scroll
        var inited = false

        function statusRow() {
            var u = Auth.user()
            if (u && Auth.token()) {
                return '<div class="vkv-note"><b>' + esc(lang('vkv_logged_as')) + ':</b> ' + esc(u.name || u.id) + '</div>'
            }
            return '<div class="vkv-note"><b>' + esc(lang('vkv_guest')) + '</b></div>'
        }

        function hintBlock() {
            var lines = lang('vkv_token_hint').split('\n')
            var out = '<div class="vkv-note">'
            for (var i = 0; i < lines.length; i++) out += '<div>' + esc(lines[i]) + '</div>'
            return out + '</div>'
        }

        this.create = function () {
            inited = true
            self.activity.loader(false)

            var body = scroll.render().find('.scroll__body').eq(0)
            body.append('<div class="vkv-section__title" style="padding:1em 1em .4em">' + esc(lang('vkv_login_title')) + '</div>')
            body.append(statusRow())
            body.append(hintBlock())

            var row = $('<div class="vkv-row"></div>')

            var tokenB = btn(lang('vkv_token_input'), true)
            tokenB.on('hover:enter', function () {
                Lampa.Input.edit({ title: lang('vkv_token_input'), free: true, nosave: true, nomic: true }, function (val) {
                    if (!val) return
                    Auth.loginWithToken(val).then(function () {
                        Lampa.Noty.show(lang('vkv_token_ok'))
                        Lampa.Activity.backward()
                    }).catch(function (e) {
                        Lampa.Noty.show((e && e.msg) || lang('vkv_token_bad'))
                    })
                })
            })
            tokenB.on('hover:focus', function () { screen.last = tokenB })

            var helperB = btn(lang('vkv_open_helper'))
            helperB.on('hover:enter', function () {
                try {
                    Lampa.Utils.copyTextToClipboard(TOKEN_HELPER)
                    Lampa.Noty.show(lang('vkv_copied') + ': ' + TOKEN_HELPER)
                } catch (e) {
                    Lampa.Noty.show(TOKEN_HELPER)
                }
            })
            helperB.on('hover:focus', function () { screen.last = helperB })

            row.append(tokenB, helperB)

            if (Auth.token()) {
                var outB = btn(lang('vkv_logout'))
                outB.on('hover:enter', function () {
                    Auth.logout()
                    Lampa.Noty.show(lang('vkv_cleared'))
                    Lampa.Activity.backward()
                })
                outB.on('hover:focus', function () { screen.last = outB })
                row.append(outB)
            }

            body.append(row)
            return this.render()
        }

        this.start = function () {
            screen.started = true
            screen.controller()
        }

        this.stop = function () {
            screen.started = false
        }

        this.render = function () {
            return scroll.render()
        }

        this.destroy = function () {
            inited = false
            screen.destroy()
        }
    }

    /* ======================================================================
       НАСТРОЙКИ / МЕНЮ / МАНИФЕСТ
       ====================================================================== */

    var ICON = '<svg width="44" height="44" viewBox="0 0 44 44">' +
        '<rect x="2" y="2" width="40" height="40" rx="10" fill="#07f"/>' +
        '<path d="M17 13.5 L31 22 L17 30.5 Z" fill="#fff"/></svg>'

    function addSettings() {
        if (!Lampa.SettingsApi) return
        try {
            Lampa.SettingsApi.addComponent({
                component: 'vkv',
                name: lang('vkv_settings'),
                icon: ICON
            })
            Lampa.SettingsApi.addParam({
                component: 'vkv',
                // values обязателен и для input (строка): иначе Params.select кладёт в реестр
                // undefined и отрисовка настроек падает на values[name][key]
                param: { name: 'vkv_proxy', type: 'input', values: '', placeholder: 'https://vk-proxy.example.workers.dev', default: '' },
                field: { name: lang('vkv_proxy'), description: lang('vkv_proxy_d') }
            })
            Lampa.SettingsApi.addParam({
                component: 'vkv',
                param: { name: 'vkv_max_quality', type: 'select', values: { '2160': '2160p', '1440': '1440p', '1080': '1080p', '720': '720p', '480': '480p' }, default: '1080' },
                field: { name: lang('vkv_max_quality') }
            })
            Lampa.SettingsApi.addParam({
                component: 'vkv',
                param: { name: 'vkv_history', type: 'trigger', default: true },
                field: { name: lang('vkv_history_on'), description: lang('vkv_history_d') }
            })
        } catch (e) { }
    }

    function addMenu() {
        try {
            var btnMenu = $('<li class="menu__item selector">' +
                '<div class="menu__ico">' + ICON + '</div>' +
                '<div class="menu__text">' + esc(lang('vkv_title')) + '</div></li>')
            btnMenu.on('hover:enter', function () {
                Lampa.Activity.push({ component: 'vkv_main', title: lang('vkv_title'), tab: 'home', page: 1 })
            })
            $('.menu .menu__list').eq(0).append(btnMenu)
        } catch (e) { }
    }

    function addManifest() {
        try {
            Lampa.Manifest.plugins = {
                type: 'video',
                version: VERSION,
                name: 'VK Video',
                description: 'VK Видео: поиск, подписки, история, избранное',
                onContextMenu: function (card) {
                    return { name: lang('vkv_find'), description: '' }
                },
                onContextLauch: function (card) {
                    Lampa.Activity.push({
                        component: 'vkv_search',
                        title: lang('vkv_search'),
                        query: (card && (card.title || card.name)) || '',
                        page: 1
                    })
                }
            }
        } catch (e) { }
    }

    /* ======================================================================
       СТАРТ
       ====================================================================== */

    function init() {
        addSettings()

        Lampa.Component.add('vkv_main', MainScreen)
        Lampa.Component.add('vkv_search', SearchScreen)
        Lampa.Component.add('vkv_channel', ChannelScreen)
        Lampa.Component.add('vkv_detail', DetailScreen)
        Lampa.Component.add('vkv_login', LoginScreen)

        addMenu()
        addManifest()

        // прогреваем анонимный токен в фоне
        Tokens.web().catch(noop)
    }

    $('body').append(Lampa.Template.get('vkv_css', {}, true))

    if (window.appready) init()
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init()
    })
})()
