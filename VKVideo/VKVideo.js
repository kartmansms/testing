/**
 * VK Video Plugin for Lampa v4.0.0
 *
 * Просмотр видео из сообществ VK.com.
 * Авторизация — прямо в окне плагина.
 * Навигация: Авторизация → Сообщества → Плейлисты → Видео
 *
 * @author kartmansms
 * @license MIT
 */

(function () {
    'use strict';

    if (window.plugin_vkvideo_ready) return;
    window.plugin_vkvideo_ready = true;

    var VK_API = 'https://api.vk.com/method';
    var VK_OAUTH = 'https://oauth.vk.com/authorize';
    var VK_VERSION = '5.199';
    // var AUTH_KEY = 'vkvideo_auth_v4';
    // var PAGE_SIZE = 40;

    ─── Storage ─────────────────────────────────────────────────────

    // function storageGet(key, fb) {
        // try { var v = Lampa.Storage.get(key); if (v !== undefined && v !== null) return v; } catch (e) {}
        // return fb || null;
    // }
    // function storageSet(key, val) { try { Lampa.Storage.set(key, val); } catch (e) {} }

    ─── Auth ────────────────────────────────────────────────────────

    // function defaultAuth() { return { client_id: '', access_token: '', user_id: 0, user_name: '' }; }
    // function readAuth() {
        // var b = defaultAuth(), s = storageGet(AUTH_KEY, {});
        // if (!s || typeof s !== 'object') s = {};
        // for (var k in s) { if (s.hasOwnProperty(k)) b[k] = s[k]; }
        return b;
    }
    function saveAuth(a) { storageSet(AUTH_KEY, a || defaultAuth()); }
    function isAuthorized() { return !!(readAuth().access_token); }

    function notify(t) { if (Lampa.Noty) Lampa.Noty.show(t); else console.log('[VKVideo] ' + t); }
    function esc(v) { var d = document.createElement('div'); d.appendChild(document.createTextNode(v || '')); return d.innerHTML; }

    // ─── VK API ──────────────────────────────────────────────────────

    function vkApi(method, params, ok, err) {
        var a = readAuth();
        params = params || {}; params.v = VK_VERSION;
        if (a.access_token && !params.access_token) params.access_token = a.access_token;
        var parts = [];
        for (var k in params) {
            if (params.hasOwnProperty(k) && params[k] !== undefined && params[k] !== null)
                parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
        }
        $.ajax({
            url: VK_API + '/' + method, method: 'POST',
            contentType: 'application/x-www-form-urlencoded', dataType: 'json', timeout: 15000,
            data: parts.join('&'),
            success: function (r) {
                if (r && r.error) { console.error('[VKVideo]', r.error.error_msg); if (err) err(r.error.error_msg); }
                else if (r && r.response !== undefined) ok(r.response);
                else if (err) err('Empty');
            },
            error: function (x, s, e) { if (err) err(e || s); }
        });
    }

    // ─── Card rendering ──────────────────────────────────────────────

    function renderCard(item, type) {
        var img = '';
        if (type === 'group') img = item.photo_200 || item.photo_100 || item.photo_50 || '';
        else if (type === 'album') img = (item.image && item.image.length) ? item.image[item.image.length - 1].url : '';
        else img = (item.image && item.image.length) ? item.image[item.image.length - 1].url :
                  (item.first_frame && item.first_frame.length) ? item.first_frame[item.first_frame.length - 1].url : '';

        var title = item.name || item.title || 'Без названия';
        var overview = '';
        if (type === 'group') overview = (item.members_count || 0) + ' участников';
        else if (type === 'album') overview = (item.count || 0) + ' видео';
        else { var dur = item.duration || 0; overview = Math.floor(dur / 60) + ':' + ((dur % 60) < 10 ? '0' : '') + (dur % 60); }

        var el = $(
            '<div class="card selector" data-type="' + type + '">' +
                '<div class="card__view"><img class="card__img" src="' + img + '" onerror="this.style.display=\'none\'"></div>' +
                '<div class="card__title">' + esc(title) + '</div>' +
                (overview ? '<div class="card__subtitle">' + esc(overview) + '</div>' : '') +
            '</div>'
        );
        el.data('item', item);
        return el;
    }

    function makeScroll() {
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        scroll.onWheel = function (step) {
            var en = Lampa.Controller.enabled && Lampa.Controller.enabled();
            if (en && en.name !== 'content') Lampa.Controller.toggle('content');
            if (step > 0) Navigator.move('down'); else Navigator.move('up');
        };
        return scroll;
    }

    // ═══════════════════════════════════════════════════════════════════
    // COMPONENT: Login (показывается если не авторизован)
    // ═══════════════════════════════════════════════════════════════════

    function VKLogin(object) {
        var html = $('<div class="vkvideo-login"></div>');
        var scroll = makeScroll();
        var body = $('<div></div>');
        var clientId = storageGet('vk_client_id', '');
        var step = clientId ? 'token' : 'appid';

        this.render = function () {
            html.empty();
            html.append(scroll.render());
            scroll.append(body);
            scroll.minus();
            if (step === 'appid') renderAppIdStep();
            else renderTokenStep();
            return html;
        };
        this.create = this.render;

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(html);
                    var first = html.find('.selector').first();
                    Lampa.Controller.collectionFocus(first, html);
                },
                left: function () { Lampa.Controller.toggle('menu'); },
                right: function () { Navigator.move('right'); },
                up: function () { if (Navigator.canmove('up')) Navigator.move('up'); },
                down: function () { if (Navigator.canmove('down')) Navigator.move('down'); },
                back: function () { Lampa.Activity.backward(); },
                enter: function () {
                    var f = html.find('.selector.focus');
                    if (f.length) { var act = f.data('action'); if (act) act(); }
                }
            });
            Lampa.Controller.toggle('content');
        };

        this.stop = function () {};
        this.pause = function () {};
        this.destroy = function () { scroll.destroy(); html.remove(); };

        function inputDialog(title, value, callback) {
            if (Lampa.Input && Lampa.Input.edit) {
                Lampa.Input.edit({ title: title, value: value, free: true }, function (result) {
                    callback(String(result || '').trim());
                });
            } else {
                var val = window.prompt(title, value || '');
                if (val !== null) callback(val.trim());
            }
        }

        function restoreFocus() {
            Lampa.Controller.collectionSet(html);
            Lampa.Controller.collectionFocus(html.find('.selector').first(), html);
        }

        function renderAppIdStep() {
            var currentId = storageGet('vk_client_id', '');
            body.html(
                '<div class="vkvideo-login__box">' +
                    '<div class="vkvideo-login__icon"><svg viewBox="0 0 24 24" width="48" height="48" fill="rgba(255,255,255,0.3)"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 6l4 4h-3v4h-2v-4H8l4-4z"/></svg></div>' +
                    '<div class="vkvideo-login__title">VK Video</div>' +
                    '<div class="vkvideo-login__hint">id.vk.ru/about/business/go → Мои приложения<br>Платформа: Web. Тип: Публичное</div>' +
                    (currentId ? '<div class="vkvideo-login__saved">Текущий App ID: ' + esc(currentId) + '</div>' : '') +
                    '<div class="vkvideo-login__btn selector" id="vkvideo-input-appid">Ввести App ID</div>' +
                    (currentId ? '<div class="vkvideo-login__btn selector" id="vkvideo-to-token">Далее →</div>' : '') +
                '</div>'
            );

            html.find('#vkvideo-input-appid').data('action', function () {
                inputDialog('VK App ID', storageGet('vk_client_id', ''), function (val) {
                    if (!val) { notify('Введите App ID'); return; }
                    storageSet('vk_client_id', val);
                    clientId = val;
                    notify('App ID сохранён: ' + val);
                    step = 'token';
                    rebuild();
                });
            });

            html.find('#vkvideo-to-token').data('action', function () {
                step = 'token';
                rebuild();
            });
        }

        function renderTokenStep() {
            var authUrl = VK_OAUTH + '?client_id=' + clientId + '&display=page&redirect_uri=' +
                encodeURIComponent('https://oauth.vk.com/blank.html') +
                '&scope=video,groups,offline&response_type=token&v=' + VK_VERSION;

            body.html(
                '<div class="vkvideo-login__box">' +
                    '<div class="vkvideo-login__icon"><svg viewBox="0 0 24 24" width="48" height="48" fill="rgba(255,255,255,0.3)"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 6l4 4h-3v4h-2v-4H8l4-4z"/></svg></div>' +
                    '<div class="vkvideo-login__title">Авторизация VK</div>' +
                    '<div class="vkvideo-login__desc">1. Откройте ссылку на телефоне</div>' +
                    '<div class="vkvideo-login__link">' + authUrl + '</div>' +
                    '<div class="vkvideo-login__desc">2. Скопируйте токен из URL после #</div>' +
                    '<div class="vkvideo-login__btn selector" id="vkvideo-input-token">Ввести токен</div>' +
                    '<div class="vkvideo-login__btn-secondary selector" id="vkvideo-back-appid">← Назад</div>' +
                '</div>'
            );

            html.find('#vkvideo-input-token').data('action', function () {
                inputDialog('Access Token', '', function (val) {
                    if (!val) { notify('Токен не введён'); return; }
                    var token = '';
                    var m = val.match(/access_token=([a-f0-9]+)/i);
                    if (m) token = m[1];
                    else if (/^[a-f0-9]{20,}$/.test(val)) token = val;
                    if (!token) { notify('Некорректный токен'); return; }

                    var a = readAuth();
                    a.access_token = token;
                    saveAuth(a);

                    notify('Проверка...');
                    vkApi('users.get', { fields: 'photo_50' }, function (d) {
                        if (d && d[0]) {
                            a.user_name = d[0].first_name || '';
                            a.user_id = d[0].id || 0;
                            saveAuth(a);
                        }
                        notify('Авторизован: ' + (readAuth().user_name || ''));
                        Lampa.Activity.push({ title: 'VK Video', component: 'vkvideo_communities', page: 1 });
                    }, function () {
                        notify('Авторизован');
                        Lampa.Activity.push({ title: 'VK Video', component: 'vkvideo_communities', page: 1 });
                    });
                });
            });

            html.find('#vkvideo-back-appid').data('action', function () {
                step = 'appid';
                rebuild();
            });
        }

        function rebuild() {
            html.empty();
            html.append(scroll.render());
            scroll.append(body);
            scroll.minus();
            if (step === 'appid') renderAppIdStep();
            else renderTokenStep();
            restoreFocus();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // COMPONENT: Communities
    // ═══════════════════════════════════════════════════════════════════

    function VKCommunities(object) {
        var html = $('<div class="vkvideo-module"></div>');
        var scroll = makeScroll();
        var body = $('<div></div>');
        var last = null;
        var allGroups = [];
        var loaded = false;
        var pageOffset = 0;

        this.render = function () {
            if (!loaded) {
                loaded = true;
                html.append(scroll.render());
                scroll.append(body);
                scroll.minus();
                scroll.onEnd = function () { if (allGroups.length) renderPage(); };
                loadGroups();
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
                left: function () { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); },
                right: function () { Navigator.move('right'); },
                up: function () { if (Navigator.canmove('up')) Navigator.move('up'); },
                down: function () { Navigator.move('down'); },
                back: function () { Lampa.Activity.backward(); },
                enter: function () {
                    var f = html.find('.selector.focus');
                    if (f.length) { var item = f.data('item'); if (item) openPlaylists(item); }
                }
            });
            Lampa.Controller.toggle('content');
        };

        this.stop = function () {};
        this.pause = function () {};
        this.destroy = function () { scroll.destroy(); html.remove(); };

        function loadGroups() {
            body.html('<div style="padding:2em;text-align:center;color:rgba(255,255,255,.5)">Загрузка...</div>');
            vkApi('groups.get', {
                user_id: readAuth().user_id, count: 500,
                fields: 'members_count,photo_50,photo_100,photo_200'
            }, function (data) {
                allGroups = (data && data.items) || [];
                console.log('[VKVideo] groups:', allGroups.length);
                body.empty();
                if (!allGroups.length) {
                    body.html('<div style="padding:2em;text-align:center;color:rgba(255,255,255,.5)">Нет сообществ</div>');
                    return;
                }
                renderPage();
            }, function (err) {
                console.error('[VKVideo] groups.get error:', err);
                body.html('<div style="padding:2em;text-align:center;color:rgba(255,255,255,.5)">Ошибка: ' + esc(String(err)) + '</div>');
            });
        }

        function renderPage() {
            var chunk = allGroups.slice(pageOffset, pageOffset + PAGE_SIZE);
            pageOffset += chunk.length;
            var row = $('<div style="display:flex;flex-wrap:wrap;padding:0.5em"></div>');
            chunk.forEach(function (g) {
                var card = renderCard(g, 'group');
                card.on('hover:focus', function () { last = card[0]; });
                card.on('hover:enter', function () { openPlaylists(g); });
                row.append(card);
            });
            body.append(row);
        }

        function openPlaylists(group) {
            Lampa.Activity.push({
                title: group.name || 'Сообщество',
                component: 'vkvideo_playlists',
                group_id: group.id, group_name: group.name, page: 1
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // COMPONENT: Playlists
    // ═══════════════════════════════════════════════════════════════════

    function VKPlaylists(object) {
        var html = $('<div class="vkvideo-module"></div>');
        var scroll = makeScroll();
        var body = $('<div></div>');
        var last = null;
        var loaded = false;
        var groupOwnerId = -(object.group_id || 0);

        this.render = function () {
            if (!loaded) {
                loaded = true;
                html.append(scroll.render());
                scroll.append(body);
                scroll.minus();
                loadAlbums();
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
                left: function () { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); },
                right: function () { Navigator.move('right'); },
                up: function () { if (Navigator.canmove('up')) Navigator.move('up'); },
                down: function () { Navigator.move('down'); },
                back: function () { Lampa.Activity.backward(); },
                enter: function () {
                    var f = html.find('.selector.focus');
                    if (f.length) { var item = f.data('item'); if (item) openVideos(item); }
                }
            });
            Lampa.Controller.toggle('content');
        };

        this.stop = function () {};
        this.pause = function () {};
        this.destroy = function () { scroll.destroy(); html.remove(); };

        function loadAlbums() {
            body.html('<div style="padding:2em;text-align:center;color:rgba(255,255,255,.5)">Загрузка...</div>');
            vkApi('video.getAlbums', { owner_id: groupOwnerId, count: 200, need_system: 1 },
                function (data) {
                    var items = (data && data.items) || [];
                    console.log('[VKVideo] albums:', items.length);
                    body.empty();
                    if (!items.length) { body.html('<div style="padding:2em;text-align:center;color:rgba(255,255,255,.5)">Нет плейлистов</div>'); return; }
                    var row = $('<div style="display:flex;flex-wrap:wrap;padding:0.5em"></div>');
                    items.forEach(function (a) {
                        var card = renderCard(a, 'album');
                        card.on('hover:focus', function () { last = card[0]; });
                        card.on('hover:enter', function () { openVideos(a); });
                        row.append(card);
                    });
                    body.append(row);
                }, function (err) {
                    console.error('[VKVideo] albums error:', err);
                    body.html('<div style="padding:2em;text-align:center;color:rgba(255,255,255,.5)">Ошибка</div>');
                });
        }

        function openVideos(album) {
            Lampa.Activity.push({
                title: album.title || 'Плейлист',
                component: 'vkvideo_videos',
                owner_id: groupOwnerId, album_id: album.id, page: 1
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // COMPONENT: Videos
    // ═══════════════════════════════════════════════════════════════════

    function VKVideos(object) {
        var html = $('<div class="vkvideo-module"></div>');
        var scroll = makeScroll();
        var body = $('<div></div>');
        var last = null;
        var loaded = false;
        var page = 1;
        var ended = false;

        this.render = function () {
            if (!loaded) {
                loaded = true;
                html.append(scroll.render());
                scroll.append(body);
                scroll.minus();
                scroll.onEnd = function () { if (!ended) loadVideos(); };
                loadVideos();
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
                left: function () { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); },
                right: function () { Navigator.move('right'); },
                up: function () { if (Navigator.canmove('up')) Navigator.move('up'); },
                down: function () { Navigator.move('down'); },
                back: function () { Lampa.Activity.backward(); },
                enter: function () {
                    var f = html.find('.selector.focus');
                    if (f.length) { var item = f.data('item'); if (item) playVideo(item); }
                }
            });
            Lampa.Controller.toggle('content');
        };

        this.stop = function () {};
        this.pause = function () {};
        this.destroy = function () { scroll.destroy(); html.remove(); };

        function loadVideos() {
            var url = VK_API + '/video.get?owner_id=' + object.owner_id +
                      (object.album_id ? '&album_id=' + object.album_id : '') +
                      '&count=' + PAGE_SIZE + '&offset=' + ((page - 1) * PAGE_SIZE) +
                      '&extended=1&v=' + VK_VERSION + '&access_token=' + readAuth().access_token;

            $.ajax({
                url: VK_API + '/video.get', method: 'POST',
                contentType: 'application/x-www-form-urlencoded', dataType: 'json', timeout: 15000,
                data: 'owner_id=' + object.owner_id +
                      (object.album_id ? '&album_id=' + object.album_id : '') +
                      '&count=' + PAGE_SIZE + '&offset=' + ((page - 1) * PAGE_SIZE) +
                      '&extended=1&v=' + VK_VERSION + '&access_token=' + readAuth().access_token,
                success: function (r) {
                    var items = (r && r.response && r.response.items) || [];
                    console.log('[VKVideo] videos page', page, ':', items.length);
                    if (!items.length && page === 1) { body.html('<div style="padding:2em;text-align:center;color:rgba(255,255,255,.5)">Нет видео</div>'); return; }
                    if (items.length < PAGE_SIZE) ended = true;
                    var row = $('<div style="display:flex;flex-wrap:wrap;padding:0.5em"></div>');
                    items.forEach(function (v) {
                        var card = renderCard(v, 'video');
                        card.on('hover:focus', function () { last = card[0]; });
                        card.on('hover:enter', function () { playVideo(v); });
                        row.append(card);
                    });
                    body.append(row);
                    page++;
                },
                error: function () { if (page === 1) body.html('<div style="padding:2em;text-align:center;color:rgba(255,255,255,.5)">Ошибка загрузки</div>'); }
            });
        }

        function playVideo(video) {
            vkApi('video.get', { videos: (video.owner_id || 0) + '_' + (video.id || 0), extended: 1 },
                function (data) {
                    var v = data && data.items && data.items[0];
                    if (!v) { notify('Видео не найдено'); return; }
                    var url = '';
                    if (v.files) url = v.files.hls || v.files.mp4_1080 || v.files.mp4_720 || v.files.mp4_480 || v.files.mp4_360 || v.files.mp4_240 || '';
                    if (url) Lampa.Player.play({ url: url, title: v.title || video.title || 'VK', subtitles: [] });
                    else if (v.player) window.open(v.player, '_blank');
                    else notify('Не удалось получить ссылку');
                }, function (e) { notify('Ошибка: ' + e); });
        }
    }

    // ─── Menu ────────────────────────────────────────────────────────

    function addMenu() {
        var menu = $('.menu .menu__list').eq(0);
        if (!menu.length || menu.find('[data-sid="vkvideo"]').length) return;
        var icon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 6l4 4h-3v4h-2v-4H8l4-4z"/></svg>';
        var btn = $('<li class="menu__item selector" data-action="vkvideo_action" data-sid="vkvideo"><div class="menu__ico">' + icon + '</div><div class="menu__text">VK Video</div></li>');
        btn.on('hover:enter', function () {
            if (isAuthorized()) Lampa.Activity.push({ title: 'VK Video', component: 'vkvideo_communities', page: 1 });
            else Lampa.Activity.push({ title: 'VK Video', component: 'vkvideo_login', page: 1 });
        });
        var last = menu.find('.menu__item').last();
        if (last.length) btn.insertAfter(last); else menu.append(btn);
    }

    // ─── Styles ──────────────────────────────────────────────────────

    function addStyles() {
        if ($('#vkvideo-style').length) return;
        $('head').append('<style id="vkvideo-style">' +
            /* Login */
            '.vkvideo-login{height:100%;color:#fff;display:flex;align-items:flex-start;justify-content:center;padding-top:8vh}' +
            '.vkvideo-login__box{background:rgba(255,255,255,0.05);border-radius:1em;padding:2em 2.5em;max-width:26em;width:90%;text-align:center}' +
            '.vkvideo-login__icon{margin-bottom:1em;opacity:0.5}' +
            '.vkvideo-login__title{font-size:1.6em;font-weight:700;margin-bottom:0.5em}' +
            '.vkvideo-login__desc{font-size:0.95em;color:rgba(255,255,255,0.6);margin-bottom:0.8em;line-height:1.4}' +
            '.vkvideo-login__hint{font-size:0.8em;color:rgba(255,255,255,0.35);margin-bottom:1.5em}' +
            '.vkvideo-login__link{font-size:0.7em;color:rgba(255,255,255,0.3);word-break:break-all;margin-bottom:1em;padding:0.5em;background:rgba(0,0,0,0.2);border-radius:0.3em}' +
            '.vkvideo-login__field{margin-bottom:1.2em}' +
            '.vkvideo-login__input{width:100%;padding:0.8em 1em;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:0.5em;color:#fff;font-size:1em;outline:none;box-sizing:border-box}' +
            '.vkvideo-login__input:focus{border-color:rgba(255,255,255,0.3)}' +
            '.vkvideo-login__btn{display:inline-block;padding:0.8em 2.5em;background:rgba(76,175,80,0.3);border-radius:0.5em;color:#fff;font-size:1em;cursor:pointer;margin-bottom:0.8em}' +
            '.vkvideo-login__btn.focus{background:rgba(76,175,80,0.5);transform:scale(1.05)}' +
            '.vkvideo-login__saved{font-size:0.85em;color:rgba(255,255,255,0.4);margin-bottom:1em}' +
            '.vkvideo-login__btn-secondary{display:inline-block;padding:0.6em 2em;background:rgba(255,255,255,0.06);border-radius:0.5em;color:rgba(255,255,255,0.5);font-size:0.9em;cursor:pointer}' +
            '.vkvideo-login__btn-secondary.focus{background:rgba(255,255,255,0.15);color:#fff}' +
            /* Module */
            '.vkvideo-module{padding:1em;height:100%}' +
            '.vkvideo-module .card{flex:0 0 14em;padding:0.5em;box-sizing:border-box}' +
            '.vkvideo-module .card .card__view{background:#1b1d24;border-radius:0.35em;overflow:hidden;padding-bottom:56%;position:relative}' +
            '.vkvideo-module .card .card__img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover}' +
            '.vkvideo-module .card .card__title{font-size:1em;margin-top:0.4em;line-height:1.2}' +
            '.vkvideo-module .card .card__subtitle{font-size:0.85em;color:rgba(255,255,255,0.5);margin-top:0.2em}' +
            '.vkvideo-module .card.focus .card__view{box-shadow:0 0 0 0.2em #fff}' +
        '</style>');
    }

    // ─── Start ───────────────────────────────────────────────────────

    function startPlugin() {
        if (!window.Lampa || !window.$) return;
        addStyles();
        Lampa.Component.add('vkvideo_login', VKLogin);
        Lampa.Component.add('vkvideo_communities', VKCommunities);
        Lampa.Component.add('vkvideo_playlists', VKPlaylists);
        Lampa.Component.add('vkvideo_videos', VKVideos);
        addMenu();
        setInterval(function () { if (window.appready && $('.menu .menu__list').eq(0).length) addMenu(); }, 4000);
        console.log('[VKVideo] v4.0 loaded');
    }

    if (window.appready) startPlugin();
    else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
    }
})();

        // for (var k in s) { if (s.hasOwnProperty(k)) b[k] = s[k]; }
