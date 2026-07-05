/**
 * VK Video Plugin for Lampa v2.0.0
 *
 * Просмотр видео из сообществ VK.com в медиа-центре Lampa.
 *
 * Навигация: Авторизация → Сообщества → Плейлисты → Видео
 *
 * @author kartmansms
 * @license MIT
 */

(function () {
    'use strict';

    if (window.plugin_vkvideo_ready) return;
    window.plugin_vkvideo_ready = true;

    // ─── Constants ───────────────────────────────────────────────────

    var VK_API = 'https://api.vk.com/method';
    var VK_OAUTH = 'https://oauth.vk.com/authorize';
    var VK_VERSION = '5.199';
    var AUTH_KEY = 'vkvideo_auth_v2';
    var PAGE_SIZE = 40;

    // ─── Storage ─────────────────────────────────────────────────────

    function storageGet(key, fallback) {
        try {
            var val = Lampa.Storage.get(key);
            if (val !== undefined && val !== null) return val;
        } catch (e) {}
        return fallback || null;
    }

    function storageSet(key, value) {
        try { Lampa.Storage.set(key, value); } catch (e) {}
    }

    // ─── Auth ────────────────────────────────────────────────────────

    function defaultAuth() {
        return { client_id: '', access_token: '', user_id: 0, user_name: '' };
    }

    function readAuth() {
        var base = defaultAuth();
        var saved = storageGet(AUTH_KEY, {});
        if (!saved || typeof saved !== 'object') saved = {};
        for (var k in saved) { if (saved.hasOwnProperty(k)) base[k] = saved[k]; }
        return base;
    }

    function saveAuth(auth) { storageSet(AUTH_KEY, auth || defaultAuth()); }
    function isAuthorized() { return !!(readAuth().access_token); }

    function notify(text) {
        if (Lampa.Noty) Lampa.Noty.show(text);
        else console.log('[VKVideo] ' + text);
    }

    function getAuthUrl() {
        var cid = storageGet('vk_client_id', '');
        if (!cid) return '';
        return VK_OAUTH + '?client_id=' + cid + '&display=page&redirect_uri=' +
            encodeURIComponent('https://oauth.vk.com/blank.html') +
            '&scope=video,offline&response_type=token&v=' + VK_VERSION;
    }

    function loginUser() {
        var url = getAuthUrl();
        if (!url) { notify('Введите VK App ID в настройках'); return; }
        Lampa.Input.show({
            title: 'VK Video — Авторизация',
            value: '',
            placeholder: 'Вставьте access_token из URL',
            onInsert: function (value) {
                var token = '';
                var m = String(value).match(/access_token=([a-f0-9]+)/i);
                if (m) token = m[1];
                else if (/^[a-f0-9]{20,}$/.test(value.trim())) token = value.trim();
                if (!token) { notify('Токен пустой'); return; }
                var auth = readAuth();
                auth.access_token = token;
                saveAuth(auth);
                fetchUserInfo(function () {
                    notify('VK Video: авторизован как ' + (readAuth().user_name || ''));
                    if (Lampa.Controller) Lampa.Controller.toggle('content');
                });
            }
        });
    }

    function logoutUser() {
        saveAuth(defaultAuth());
        notify('VK Video: вышли из аккаунта');
    }

    function fetchUserInfo(cb) {
        var auth = readAuth();
        if (!auth.access_token) { if (cb) cb(); return; }
        vkApi('users.get', { fields: 'photo_50' }, function (data) {
            if (data && data[0]) {
                auth.user_name = data[0].first_name || '';
                auth.user_id = data[0].id || 0;
                saveAuth(auth);
            }
            if (cb) cb();
        }, function () { if (cb) cb(); });
    }

    // ─── VK API ──────────────────────────────────────────────────────

    function vkApi(method, params, callback, error) {
        var auth = readAuth();
        params = params || {};
        params.v = VK_VERSION;
        if (auth.access_token && !params.access_token) params.access_token = auth.access_token;

        var parts = [];
        for (var k in params) {
            if (params.hasOwnProperty(k) && params[k] !== undefined && params[k] !== null) {
                parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
            }
        }

        $.ajax({
            url: VK_API + '/' + method,
            method: 'POST',
            contentType: 'application/x-www-form-urlencoded',
            dataType: 'json',
            timeout: 15000,
            data: parts.join('&'),
            success: function (res) {
                if (res && res.error) {
                    console.error('[VKVideo] API error:', res.error.error_msg);
                    if (error) error(res.error.error_msg);
                } else if (res && res.response !== undefined) {
                    callback(res.response);
                } else {
                    if (error) error('Empty response');
                }
            },
            error: function (xhr, s, e) { if (error) error(e || s); }
        });
    }

    // ─── Card Helpers ────────────────────────────────────────────────

    function groupToCard(group) {
        var img = '';
        if (group.photo_200) img = group.photo_200;
        else if (group.photo_100) img = group.photo_100;
        else if (group.photo_50) img = group.photo_50;
        return {
            id: group.id,
            title: group.name || 'Сообщество',
            overview: (group.members_count || 0) + ' участников',
            img: img,
            poster: img,
            source: 'vkvideo',
            component: 'vkvideo_playlists',
            group_id: group.id,
            group_name: group.name,
            card_type: 'group'
        };
    }

    function albumToCard(album, groupOwnerId) {
        var img = '';
        if (album.image && album.image.length) img = album.image[album.image.length - 1].url || '';
        return {
            id: album.id,
            title: album.title || 'Плейлист',
            overview: (album.count || 0) + ' видео',
            img: img,
            poster: img,
            source: 'vkvideo',
            component: 'vkvideo_videos',
            album_id: album.id,
            owner_id: groupOwnerId,
            card_type: 'album'
        };
    }

    function videoToCard(video) {
        var img = '';
        if (video.image && video.image.length) img = video.image[video.image.length - 1].url || '';
        else if (video.first_frame && video.first_frame.length) img = video.first_frame[video.first_frame.length - 1].url || '';
        var dur = video.duration || 0;
        var m = Math.floor(dur / 60), s = dur % 60;
        return {
            id: video.id,
            title: video.title || 'Без названия',
            overview: video.description || '',
            img: img,
            poster: img,
            source: 'vkvideo',
            component: 'full',
            duration: dur,
            duration_text: m + ':' + (s < 10 ? '0' : '') + s,
            owner_id: video.owner_id,
            views: video.views || 0,
            date: video.date || 0,
            card_type: 'video'
        };
    }

    // ─── Player ──────────────────────────────────────────────────────

    function playVideo(card) {
        if (!isAuthorized()) { notify('Необходима авторизация'); return; }
        var videos = (card.owner_id || 0) + '_' + (card.id || 0);
        vkApi('video.get', { videos: videos, extended: 1 }, function (data) {
            var video = data && data.items && data.items[0];
            if (!video) { notify('Видео не найдено'); return; }

            var url = '';
            if (video.files) {
                url = video.files.hls || video.files.mp4_1080 || video.files.mp4_720 ||
                      video.files.mp4_480 || video.files.mp4_360 || video.files.mp4_240 || '';
            }

            if (url) {
                Lampa.Player.play({ url: url, title: video.title || card.title || 'VK Video', subtitles: [] });
            } else if (video.player) {
                window.open(video.player, '_blank');
                notify('Видео открыто в браузере');
            } else {
                notify('Не удалось получить ссылку');
            }
        }, function (err) { notify('Ошибка: ' + err); });
    }

    // ─── Component: Communities List ─────────────────────────────────

    function VKCommunitiesComponent(object) {
        var comp = new Lampa.InteractionMain(object);
        var network = new Lampa.Reguest();

        comp.create = function () {
            var self = this;
            this.activity.loader(true);

            if (!isAuthorized()) {
                self.activity.loader(false);
                self.empty();
                notify('VK Video: откройте настройки и авторизуйтесь');
                return;
            }

            loadGroups(0, [], function (groups) {
                if (groups.length) {
                    var cards = groups.map(groupToCard);
                    self.build([{ title: 'Мои сообщества', results: cards, service_id: 'vkvideo' }]);
                    self.activity.loader(false);
                } else {
                    self.empty();
                }
            });
        };

        comp.onMore = function () {};

        function loadGroups(offset, all, cb) {
            vkApi('groups.get', {
                user_id: readAuth().user_id,
                count: PAGE_SIZE,
                offset: offset,
                fields: 'members_count,photo_50,photo_100,photo_200'
            }, function (data) {
                var items = (data && data.items) || [];
                var combined = all.concat(items);
                if (items.length === PAGE_SIZE && combined.length < 500) {
                    loadGroups(offset + PAGE_SIZE, combined, cb);
                } else {
                    cb(combined);
                }
            }, function () { cb(all); });
        }

        return comp;
    }

    // ─── Component: Playlists of a Community ─────────────────────────

    function VKPlaylistsComponent(object) {
        var comp = new Lampa.InteractionCategory(object);
        var network = new Lampa.Reguest();
        var groupOwnerId = -(object.group_id || 0);

        comp.create = function () {
            var self = this;
            this.activity.loader(true);

            var url = VK_API + '/video.getAlbums?owner_id=' + groupOwnerId +
                      '&count=' + PAGE_SIZE + '&need_system=1&v=' + VK_VERSION +
                      '&access_token=' + readAuth().access_token;

            network.silent(url, function (json) {
                var items = (json && json.response && json.response.items) || [];
                var cards = items.map(function (a) { return albumToCard(a, groupOwnerId); });
                if (cards.length) {
                    self.build({ results: cards });
                } else {
                    self.empty();
                }
                self.activity.loader(false);
            }, function () {
                self.empty();
                self.activity.loader(false);
            });
        };

        comp.nextPageReuest = function (obj, resolve, reject) {
            var offset = (obj.page - 1) * PAGE_SIZE;
            var url = VK_API + '/video.getAlbums?owner_id=' + groupOwnerId +
                      '&count=' + PAGE_SIZE + '&offset=' + offset + '&need_system=1&v=' + VK_VERSION +
                      '&access_token=' + readAuth().access_token;
            network.silent(url, function (json) {
                var items = (json && json.response && json.response.items) || [];
                resolve({ results: items.map(function (a) { return albumToCard(a, groupOwnerId); }) });
            }, function () { reject(); });
        };

        return comp;
    }

    // ─── Component: Videos in a Playlist ─────────────────────────────

    function VKVideosComponent(object) {
        var comp = new Lampa.InteractionCategory(object);
        var network = new Lampa.Reguest();
        var ownerId = object.owner_id || 0;
        var albumId = object.album_id || 0;

        comp.create = function () {
            var self = this;
            this.activity.loader(true);

            var url = VK_API + '/video.get?owner_id=' + ownerId +
                      (albumId ? '&album_id=' + albumId : '') +
                      '&count=' + PAGE_SIZE + '&extended=1&v=' + VK_VERSION +
                      '&access_token=' + readAuth().access_token;

            network.silent(url, function (json) {
                var items = (json && json.response && json.response.items) || [];
                var cards = items.map(videoToCard);
                if (cards.length) {
                    self.build({ results: cards });
                } else {
                    self.empty();
                }
                self.activity.loader(false);
            }, function () {
                self.empty();
                self.activity.loader(false);
            });
        };

        comp.nextPageReuest = function (obj, resolve, reject) {
            var offset = (obj.page - 1) * PAGE_SIZE;
            var url = VK_API + '/video.get?owner_id=' + ownerId +
                      (albumId ? '&album_id=' + albumId : '') +
                      '&count=' + PAGE_SIZE + '&offset=' + offset + '&extended=1&v=' + VK_VERSION +
                      '&access_token=' + readAuth().access_token;
            network.silent(url, function (json) {
                var items = (json && json.response && json.response.items) || [];
                resolve({ results: items.map(videoToCard) });
            }, function () { reject(); });
        };

        return comp;
    }

    // ─── Menu ────────────────────────────────────────────────────────

    function addMenu() {
        var menu = $('.menu .menu__list').eq(0);
        if (!menu.length) return;
        if (menu.find('[data-sid="vkvideo"]').length) return;

        var icon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 6l4 4h-3v4h-2v-4H8l4-4z"/></svg>';

        var btn = $(
            '<li class="menu__item selector" data-action="vkvideo_action" data-sid="vkvideo">' +
                '<div class="menu__ico">' + icon + '</div>' +
                '<div class="menu__text">VK Video</div>' +
            '</li>'
        );

        btn.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'VK Video', component: 'vkvideo_communities', page: 1 });
        });

        var last = menu.find('.menu__item').last();
        if (last.length) btn.insertAfter(last);
        else menu.append(btn);
    }

    // ─── Settings ────────────────────────────────────────────────────

    function addSettings() {
        if (!Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({ component: 'vkvideo', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 6l4 4h-3v4h-2v-4H8l4-4z"/></svg>', name: 'VK Video' });

        Lampa.SettingsApi.addParam({ component: 'vkvideo', param: { type: 'title' }, field: { name: 'Авторизация VK OAuth' } });

        Lampa.SettingsApi.addParam({
            component: 'vkvideo',
            param: { name: 'vk_client_id', type: 'input', default: '', placeholder: 'VK App ID' },
            field: { name: 'VK App ID (Standalone)' }
        });

        Lampa.SettingsApi.addParam({
            component: 'vkvideo',
            param: { name: 'vk_login', type: 'trigger', default: false },
            field: { name: function () { return isAuthorized() ? 'Выйти из VK' : 'Войти в VK'; } },
            onChange: function () {
                if (isAuthorized()) logoutUser();
                else {
                    if (!storageGet('vk_client_id', '')) { notify('Введите VK App ID'); return; }
                    loginUser();
                }
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'vkvideo',
            param: { type: 'title' },
            field: { name: function () { return isAuthorized() ? 'Статус: ' + (readAuth().user_name || 'ID ' + readAuth().user_id) : 'Статус: не авторизован'; } }
        });

        Lampa.SettingsApi.addParam({
            component: 'vkvideo',
            param: { type: 'title' },
            field: { name: 'vk.com/editapp?act=create → Standalone → вставьте App ID' }
        });
    }

    // ─── Start ───────────────────────────────────────────────────────

    function startPlugin() {
        if (!window.Lampa || !window.$) return;

        addSettings();

        Lampa.Component.add('vkvideo_communities', VKCommunitiesComponent);
        Lampa.Component.add('vkvideo_playlists', VKPlaylistsComponent);
        Lampa.Component.add('vkvideo_videos', VKVideosComponent);

        addMenu();

        setInterval(function () {
            if (window.appready && $('.menu .menu__list').eq(0).length) addMenu();
        }, 4000);

        console.log('[VKVideo] Plugin v2.0 loaded');
    }

    if (window.appready) startPlugin();
    else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
    }
})();
