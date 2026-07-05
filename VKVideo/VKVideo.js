/**
 * VK Video Plugin for Lampa v1.0.0
 *
 * Просмотр видео с VK.com в медиа-центре Lampa.
 *
 * Возможности:
 * - OAuth авторизация для доступа к личным видео
 * - Каталог: мои видео, плейлисты, рекомендации
 * - Поиск по VK видео (интеграция в глобальный поиск)
 * - Воспроизведение: HLS / MP4 через Lampa.Player
 * - Управление плейлистами: добавление/удаление видео
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
    var AUTH_KEY = 'vkvideo_auth_v1';
    var SETTINGS_KEY = 'vkvideo_settings';
    var PAGE_SIZE = 30;

    var initialized = false;

    // ─── Storage ─────────────────────────────────────────────────────

    function storageGet(key, fallback) {
        try {
            var val = Lampa.Storage.get(key);
            return val !== undefined && val !== null ? val : (fallback || null);
        } catch (e) {
            return fallback || null;
        }
    }

    function storageSet(key, value) {
        try {
            Lampa.Storage.set(key, value);
        } catch (e) {}
    }

    // ─── Auth ────────────────────────────────────────────────────────

    function defaultAuth() {
        return {
            client_id: '',
            access_token: '',
            user_id: 0,
            expires_at: 0,
            user_name: ''
        };
    }

    function readAuth() {
        var base = defaultAuth();
        var saved = storageGet(AUTH_KEY, {});
        if (!saved || typeof saved !== 'object') saved = {};
        var key;
        for (key in saved) {
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

    function readSettings() {
        var defaults = { client_id: '' };
        var saved = storageGet(SETTINGS_KEY, {});
        if (!saved || typeof saved !== 'object') saved = {};
        var key;
        for (key in defaults) {
            if (saved.hasOwnProperty(key)) defaults[key] = saved[key];
        }
        return defaults;
    }

    function saveSettings(settings) {
        storageSet(SETTINGS_KEY, settings);
    }

    function getAuthUrl() {
        var settings = readSettings();
        if (!settings.client_id) return '';
        return VK_OAUTH +
            '?client_id=' + encodeURIComponent(settings.client_id) +
            '&display=page' +
            '&redirect_uri=' + encodeURIComponent('https://oauth.vk.com/blank.html') +
            '&scope=video,offline' +
            '&response_type=token' +
            '&v=' + VK_VERSION;
    }

    function notify(text) {
        if (Lampa.Noty) Lampa.Noty.show(text);
        else console.log('[VKVideo] ' + text);
    }

    function loginUser() {
        var authUrl = getAuthUrl();
        if (!authUrl) {
            notify('Введите VK App ID в настройках');
            return;
        }

        Lampa.Input.show({
            title: 'VK Video — Авторизация',
            value: '',
            placeholder: 'Вставьте access_token из URL',
            onInsert: function (value) {
                var token = extractTokenFromUrl(value) || value.trim();
                if (!token) {
                    notify('Токен пустой');
                    return;
                }

                var auth = readAuth();
                auth.access_token = token;
                auth.expires_at = Date.now() + (365 * 24 * 60 * 60 * 1000);
                saveAuth(auth);

                fetchUserInfo(function () {
                    notify('VK Video: авторизован');
                    if (typeof Lampa.Controller !== 'undefined') {
                        Lampa.Controller.toggle('content');
                    }
                });
            }
        });
    }

    function extractTokenFromUrl(input) {
        var str = String(input || '').trim();
        var match = str.match(/access_token=([a-f0-9]+)/i);
        if (match) return match[1];
        if (/^[a-f0-9]{20,}$/.test(str)) return str;
        return '';
    }

    function logoutUser() {
        saveAuth(defaultAuth());
        notify('VK Video: вышли из аккаунта');
    }

    function fetchUserInfo(callback) {
        var auth = readAuth();
        if (!auth.access_token) { if (callback) callback(); return; }

        vkApi('users.get', { access_token: auth.access_token, fields: 'photo_50' }, function (data) {
            if (data && data.response && data.response[0]) {
                auth.user_name = data.response[0].first_name || '';
                auth.user_id = data.response[0].id || 0;
                saveAuth(auth);
            }
            if (callback) callback();
        }, function () {
            if (callback) callback();
        });
    }

    function ensureAuth(callback) {
        if (isAuthorized()) {
            callback();
        } else {
            notify('VK Video: необходима авторизация. Откройте настройки плагина.');
        }
    }

    // ─── VK API ──────────────────────────────────────────────────────

    function vkApi(method, params, callback, error) {
        var parts = [];
        var key;
        params = params || {};
        params.v = VK_VERSION;

        for (key in params) {
            if (params.hasOwnProperty(key) && params[key] !== undefined && params[key] !== null) {
                parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
            }
        }

        var url = VK_API + '/' + method;
        var body = parts.join('&');

        $.ajax({
            url: url,
            method: 'POST',
            contentType: 'application/x-www-form-urlencoded',
            dataType: 'json',
            timeout: 15000,
            data: body,
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
            error: function (xhr, status, err) {
                console.error('[VKVideo] Request failed:', status, err);
                if (error) error(err || status);
            }
        });
    }

    function vkApiAuth(method, params, callback, error) {
        var auth = readAuth();
        if (!auth.access_token) {
            if (error) error('Not authorized');
            return;
        }
        params = params || {};
        params.access_token = auth.access_token;
        vkApi(method, params, callback, error);
    }

    // ─── Card Conversion ─────────────────────────────────────────────

    function vkVideoToCard(video) {
        var img = '';
        if (video.image && video.image.length) {
            img = video.image[video.image.length - 1].url || '';
        } else if (video.first_frame && video.first_frame.length) {
            img = video.first_frame[video.first_frame.length - 1].url || '';
        }

        var duration = video.duration || 0;
        var min = Math.floor(duration / 60);
        var sec = duration % 60;

        return {
            id: video.id,
            title: video.title || 'Без названия',
            overview: video.description || '',
            poster_path: null,
            img: img,
            poster: img,
            source: 'vkvideo',
            component: 'full',
            duration: duration,
            duration_text: min + ':' + (sec < 10 ? '0' : '') + sec,
            owner_id: video.owner_id,
            views: video.views || 0,
            date: video.date || 0,
            type: 'video',
            card_type: 'video'
        };
    }

    function vkAlbumToCard(album) {
        return {
            id: album.id,
            title: album.title || 'Плейлист',
            overview: (album.count || 0) + ' видео',
            poster_path: null,
            img: album.image && album.image.length ? album.image[album.image.length - 1].url : '',
            source: 'vkvideo',
            component: 'vkvideo_album',
            album_id: album.id,
            owner_id: album.owner_id,
            count: album.count || 0,
            type: 'playlist',
            card_type: 'playlist'
        };
    }

    // ─── VKPlayer ────────────────────────────────────────────────────

    function playVideo(card) {
        ensureAuth(function () {
            var videos = (card.owner_id || 0) + '_' + (card.id || 0);

            vkApiAuth('video.get', { videos: videos, extended: 1 }, function (data) {
                var items = data && data.items;
                var video = items && items[0];

                if (!video) {
                    notify('Видео не найдено');
                    return;
                }

                var url = resolveVideoUrl(video);

                if (url) {
                    Lampa.Player.play({
                        url: url,
                        title: video.title || card.title || 'VK Video',
                        subtitles: []
                    });
                } else {
                    if (video.player) {
                        notify('Откройте видео в браузере: ' + video.player);
                        window.open(video.player, '_blank');
                    } else {
                        notify('Не удалось получить ссылку на видео');
                    }
                }
            }, function (err) {
                notify('Ошибка загрузки видео: ' + err);
            });
        });
    }

    function resolveVideoUrl(video) {
        if (video.files) {
            return video.files.hls ||
                   video.files.mp4_1080 ||
                   video.files.mp4_720 ||
                   video.files.mp4_480 ||
                   video.files.mp4_360 ||
                   video.files.mp4_240 ||
                   '';
        }
        return '';
    }

    // ─── Catalog ─────────────────────────────────────────────────────

    function VKMainComponent(object) {
        var comp = Lampa.InteractionMain.extend({
            comp_id: 'vkvideo_main',
            url: '',
            onMore: function () {},
            onEnd: function () {}
        });

        var scroll = null;
        var allItems = [];
        var loaded = false;
        var currentCategory = 0;

        comp.create = function () {
            this.html(Lampa.Template.get('category_full', {}));
            scroll = this.activity.scroll;
        };

        comp.start = function () {
            var self = this;

            loadMainContent(function (categories) {
                self.allCategories = categories;
                renderCategories(self);
                loaded = true;
            });
        };

        comp.render = function () {};

        function loadMainContent(callback) {
            var categories = [];

            categories.push({
                title: 'Мои видео',
                load: function (offset, count, cb) {
                    loadMyVideos(offset, count, cb);
                }
            });

            categories.push({
                title: 'Мои плейлисты',
                load: function (offset, count, cb) {
                    loadMyAlbums(offset, count, cb);
                }
            });

            categories.push({
                title: 'Поиск',
                load: function (offset, count, cb) {
                    cb([]);
                }
            });

            callback(categories);
        }

        function renderCategories(self) {
            var container = self.activity.render().find('.category-full__body').eq(0);
            if (!container.length) container = self.activity.render().find('.scroll__body').eq(0);
            if (!container.length) return;

            container.empty();

            self.allCategories.forEach(function (cat, idx) {
                var block = $(
                    '<div class="category-full__block">' +
                        '<div class="category-full__title">' + cat.title + '</div>' +
                        '<div class="category-full__items" id="vkvideo-cat-' + idx + '"></div>' +
                        '<div class="category-full__more selector" data-cat="' + idx + '" style="text-align:center;padding:1em;color:rgba(255,255,255,.5)">Показать ещё</div>' +
                    '</div>'
                );

                container.append(block);

                cat.load(0, PAGE_SIZE, function (items) {
                    var row = container.find('#vkvideo-cat-' + idx);
                    renderItems(row, items, cat);
                });

                block.find('.category-full__more').on('hover:enter', function () {
                    Lampa.Activity.push({
                        title: cat.title,
                        component: 'vkvideo_list',
                        page: 1,
                        category: idx
                    });
                });
            });
        }

        function renderItems(row, items, cat) {
            if (!items || !items.length) {
                row.append('<div style="padding:1em;color:rgba(255,255,255,.4)">Ничего не найдено</div>');
                return;
            }

            items.forEach(function (item) {
                var card = item;
                if (cat && cat.title === 'Мои плейлисты') {
                    card = vkAlbumToCard(item);
                } else {
                    card = vkVideoToCard(item);
                }

                var el = $(
                    '<div class="card selector">' +
                        '<div class="card__view">' +
                            '<img class="card__img" src="' + (card.img || '') + '" onerror="this.src=\'\'">' +
                        '</div>' +
                        '<div class="card__title">' + escHtml(card.title) + '</div>' +
                    '</div>'
                );

                el.on('hover:enter', function () {
                    if (card.type === 'playlist') {
                        Lampa.Activity.push({
                            title: card.title,
                            component: 'vkvideo_album',
                            page: 1,
                            album_id: card.album_id,
                            owner_id: card.owner_id
                        });
                    } else {
                        Lampa.Activity.push({
                            title: card.title,
                            component: 'vkvideo_full',
                            card: card,
                            movie: card
                        });
                    }
                });

                row.append(el);
            });
        }

        function loadMyVideos(offset, count, callback) {
            ensureAuth(function () {
                var auth = readAuth();
                vkApiAuth('video.get', {
                    owner_id: auth.user_id,
                    count: count,
                    offset: offset,
                    extended: 1
                }, function (data) {
                    callback(data && data.items ? data.items : []);
                }, function () {
                    callback([]);
                });
            });
        }

        function loadMyAlbums(offset, count, callback) {
            ensureAuth(function () {
                var auth = readAuth();
                vkApiAuth('video.getAlbums', {
                    owner_id: auth.user_id,
                    count: count,
                    offset: offset,
                    need_system: 1
                }, function (data) {
                    callback(data && data.items ? data.items : []);
                }, function () {
                    callback([]);
                });
            });
        }

        return comp;
    }

    // ─── Album List Component ────────────────────────────────────────

    function VKAlbumListComponent(object) {
        var comp = Lampa.InteractionCategory.extend({
            url: '',
            comp_id: 'vkvideo_album_list'
        });

        comp.create = function () {
            this.html(Lampa.Template.get('category_full', {}));
        };

        comp.start = function () {
            var self = this;
            var albumId = object.album_id;
            var ownerId = object.owner_id;

            loadAlbumVideos(ownerId, albumId, 0, PAGE_SIZE, function (items) {
                renderList(self, items);
            });
        };

        comp.nextPageReuest = function (obj, resolve, reject) {
            var albumId = object.album_id;
            var ownerId = object.owner_id;
            var offset = (obj.page - 1) * PAGE_SIZE;

            loadAlbumVideos(ownerId, albumId, offset, PAGE_SIZE, function (items) {
                resolve({ results: items.map(vkVideoToCard) });
            }, function () {
                reject();
            });
        };

        function loadAlbumVideos(ownerId, albumId, offset, count, callback, error) {
            vkApiAuth('video.get', {
                owner_id: ownerId,
                album_id: albumId,
                count: count,
                offset: offset,
                extended: 1
            }, function (data) {
                callback(data && data.items ? data.items : []);
            }, function (err) {
                if (error) error(err);
                else callback([]);
            });
        }

        function renderList(self, items) {
            var container = self.activity.render().find('.category-full__body').eq(0);
            if (!container.length) container = self.activity.render().find('.scroll__body').eq(0);
            if (!container.length) return;

            container.empty();

            if (!items.length) {
                container.append('<div style="padding:2em;text-align:center;color:rgba(255,255,255,.5)">Плейлист пуст</div>');
                return;
            }

            items.forEach(function (item) {
                var card = vkVideoToCard(item);
                var el = $(
                    '<div class="card selector">' +
                        '<div class="card__view">' +
                            '<img class="card__img" src="' + (card.img || '') + '" onerror="this.src=\'\'">' +
                        '</div>' +
                        '<div class="card__title">' + escHtml(card.title) + '</div>' +
                    '</div>'
                );

                el.on('hover:enter', function () {
                    Lampa.Activity.push({
                        title: card.title,
                        component: 'vkvideo_full',
                        card: card,
                        movie: card
                    });
                });

                container.append(el);
            });
        }

        return comp;
    }

    // ─── Search List Component ───────────────────────────────────────

    function VKSearchListComponent(object) {
        var comp = Lampa.InteractionCategory.extend({
            url: '',
            comp_id: 'vkvideo_search_list'
        });

        comp.create = function () {
            this.html(Lampa.Template.get('category_full', {}));
        };

        comp.start = function () {
            var self = this;
            var query = object.query || '';

            if (!query) {
                self.empty();
                return;
            }

            vkApiAuth('video.search', {
                q: query,
                count: PAGE_SIZE,
                offset: 0,
                sort: 2,
                adult: 0
            }, function (data) {
                renderList(self, (data && data.items || []).map(vkVideoToCard));
            }, function () {
                self.empty();
            });
        };

        comp.nextPageReuest = function (obj, resolve, reject) {
            var query = object.query || '';
            var offset = (obj.page - 1) * PAGE_SIZE;

            vkApiAuth('video.search', {
                q: query,
                count: PAGE_SIZE,
                offset: offset,
                sort: 2,
                adult: 0
            }, function (data) {
                resolve({ results: (data && data.items || []).map(vkVideoToCard) });
            }, function () {
                reject();
            });
        };

        function renderList(self, items) {
            var container = self.activity.render().find('.category-full__body').eq(0);
            if (!container.length) container = self.activity.render().find('.scroll__body').eq(0);
            if (!container.length) return;

            container.empty();

            if (!items.length) {
                container.append('<div style="padding:2em;text-align:center;color:rgba(255,255,255,.5)">Ничего не найдено</div>');
                return;
            }

            items.forEach(function (card) {
                var el = $(
                    '<div class="card selector">' +
                        '<div class="card__view">' +
                            '<img class="card__img" src="' + (card.img || '') + '" onerror="this.src=\'\'">' +
                        '</div>' +
                        '<div class="card__title">' + escHtml(card.title) + '</div>' +
                    '</div>'
                );

                el.on('hover:enter', function () {
                    Lampa.Activity.push({
                        title: card.title,
                        component: 'vkvideo_full',
                        card: card,
                        movie: card
                    });
                });

                container.append(el);
            });
        }

        return comp;
    }

    // ─── Full Page Component ─────────────────────────────────────────

    function VKFullComponent(object) {
        var card = object.card || object.movie || {};
        var comp = Lampa.InteractionMain.extend({
            comp_id: 'vkvideo_full'
        });

        comp.create = function () {
            var html = buildFullPage(card);
            this.html(html);
        };

        comp.start = function () {
            var self = this;

            loadFullVideoDetails(card, function (details) {
                if (details) {
                    updateFullPage(self, card, details);
                }
            });
        };

        comp.render = function () {};

        function buildFullPage(card) {
            var img = card.img || card.poster || '';
            var duration = card.duration_text || '';
            var views = card.views || 0;
            var date = card.date ? new Date(card.date * 1000).toLocaleDateString('ru-RU') : '';

            return (
                '<div class="vkvideo-full">' +
                    '<div class="vkvideo-full__poster">' +
                        '<img src="' + img + '" onerror="this.style.display=\'none\'">' +
                    '</div>' +
                    '<div class="vkvideo-full__info">' +
                        '<div class="vkvideo-full__title">' + escHtml(card.title || '') + '</div>' +
                        '<div class="vkvideo-full__meta">' +
                            (duration ? '<span>' + duration + '</span>' : '') +
                            (views ? '<span>' + views + ' просмотров</span>' : '') +
                            (date ? '<span>' + date + '</span>' : '') +
                        '</div>' +
                        '<div class="vkvideo-full__description">' + escHtml(card.overview || '') + '</div>' +
                        '<div class="vkvideo-full__buttons">' +
                            '<div class="vkvideo-full__btn vkvideo-full__play selector" style="display:inline-flex;align-items:center;gap:0.5em;padding:0.8em 1.5em;background:rgba(255,255,255,0.1);border-radius:0.5em;cursor:pointer;">' +
                                '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
                                '<span>Смотреть</span>' +
                            '</div>' +
                            '<div class="vkvideo-full__btn vkvideo-full__add-album selector" style="display:inline-flex;align-items:center;gap:0.5em;padding:0.8em 1.5em;background:rgba(255,255,255,0.1);border-radius:0.5em;cursor:pointer;margin-left:0.5em;">' +
                                '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>' +
                                '<span>В плейлист</span>' +
                            '</div>' +
                            '<div class="vkvideo-full__btn vkvideo-full__open-vk selector" style="display:inline-flex;align-items:center;gap:0.5em;padding:0.8em 1.5em;background:rgba(255,255,255,0.1);border-radius:0.5em;cursor:pointer;margin-left:0.5em;">' +
                                '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M18 13h2v-2h-2v2zm-4 6h2v-2h-2v2zm-4-6h2v-2h-2v2zm-4 6h2v-2H6v2zm-4-6h2v-2H2v2zm0-4h2V7H2v2zm12-6H2v2h14V3zm4 6h2V7h-2v2zm0 4h2v-2h-2v2z"/>' +
                                '</svg>' +
                                '<span>VK</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>'
            );
        }

        function updateFullPage(self, card, details) {
            var container = self.activity.render();
            container.find('.vkvideo-full__play').on('hover:enter', function () {
                playVideo(card);
            });

            container.find('.vkvideo-full__add-album').on('hover:enter', function () {
                showAddToAlbumMenu(card);
            });

            container.find('.vkvideo-full__open-vk').on('hover:enter', function () {
                var vkUrl = 'https://vk.com/video' + (card.owner_id || 0) + '_' + (card.id || 0);
                window.open(vkUrl, '_blank');
            });
        }

        function loadFullVideoDetails(card, callback) {
            var videos = (card.owner_id || 0) + '_' + (card.id || 0);

            vkApiAuth('video.get', { videos: videos, extended: 1 }, function (data) {
                var items = data && data.items;
                callback(items && items[0] ? items[0] : null);
            }, function () {
                callback(null);
            });
        }

        return comp;
    }

    // ─── Album Management ────────────────────────────────────────────

    function showAddToAlbumMenu(card) {
        ensureAuth(function () {
            var auth = readAuth();

            vkApiAuth('video.getAlbums', {
                owner_id: auth.user_id,
                count: 100,
                need_system: 0
            }, function (data) {
                var albums = data && data.items ? data.items : [];
                var items = albums.map(function (album) {
                    return {
                        title: album.title + ' (' + (album.count || 0) + ')',
                        album_id: album.id,
                        onSelect: function () {
                            addToAlbum(card, album.id);
                        }
                    };
                });

                items.unshift({
                    title: '+ Создать новый плейлист',
                    onSelect: function () {
                        createAlbumAndAdd(card);
                    }
                });

                Lampa.Select.show({
                    title: 'Добавить в плейлист',
                    items: items
                });
            }, function () {
                notify('Не удалось загрузить плейлисты');
            });
        });
    }

    function addToAlbum(card, albumId) {
        var owner_id = card.owner_id || 0;
        var video_id = card.id || 0;

        vkApiAuth('video.addToAlbums', {
            owner_id: owner_id,
            video_id: video_id,
            target_id: readAuth().user_id,
            album_id: albumId
        }, function () {
            notify('Добавлено в плейлист');
        }, function (err) {
            notify('Ошибка: ' + err);
        });
    }

    function createAlbumAndAdd(card) {
        Lampa.Input.show({
            title: 'Название плейлиста',
            value: '',
            placeholder: 'Введите название',
            onInsert: function (title) {
                if (!title.trim()) {
                    notify('Название не может быть пустым');
                    return;
                }

                vkApiAuth('video.createAlbum', {
                    title: title.trim()
                }, function (data) {
                    if (data && data.response && data.response.id) {
                        addToAlbum(card, data.response.id);
                    } else {
                        notify('Не удалось создать плейлист');
                    }
                }, function (err) {
                    notify('Ошибка создания плейлиста: ' + err);
                });
            }
        });
    }

    // ─── Search Integration ──────────────────────────────────────────

    function createSearchSource() {
        var network = new Lampa.Reguest();

        return {
            title: 'VK Video',
            params: {},
            search: function (params, onComplite) {
                var query = params.query;
                if (!query || query.length < 2) {
                    onComplite([]);
                    return;
                }

                ensureAuth(function () {
                    vkApiAuth('video.search', {
                        q: query,
                        count: 20,
                        sort: 2,
                        adult: 0
                    }, function (data) {
                        if (data && data.items && data.items.length) {
                            var items = data.items.map(function (item) {
                                var card = vkVideoToCard(item);
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
            onCancel: function () {
                network.clear();
            }
        };
    }

    function initSearchIntegration() {
        if (initialized) return;
        if (!Lampa || !Lampa.Search || typeof Lampa.Search.addSource !== 'function') return;
        Lampa.Search.addSource(createSearchSource());
        initialized = true;
    }

    // ─── Full Page Hook ──────────────────────────────────────────────

    function initFullHook() {
        if (!Lampa || !Lampa.Listener || !Lampa.Listener.follow) return;

        Lampa.Listener.follow('full', function (event) {
            if (event.type === 'complite' && event.card && event.card.source === 'vkvideo') {
                injectFullButtons(event);
            }
        });
    }

    function injectFullButtons(event) {
        var card = event.card;
        var body = event.body;

        if (!body || !body.find) return;

        var container = body.find('.buttons--container');
        if (!container.length) return;

        if (container.find('.vkvideo-play-btn').length) return;

        var playBtn = $(
            '<div class="full-start__button vkvideo-play-btn selector" style="color:#fff;background:rgba(0,0,0,0.32)!important;border-color:transparent!important;display:inline-flex!important;align-items:center!important;">' +
                '<svg viewBox="0 0 24 24" width="2em" height="2em" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
            '</div>'
        );

        playBtn.on('hover:enter', function () {
            playVideo(card);
        });

        container.prepend(playBtn);
    }

    // ─── Styles ──────────────────────────────────────────────────────

    function addStyles() {
        if ($('#vkvideo-style').length) return;

        $('body').append(
            '<style id="vkvideo-style">' +
                '.vkvideo-full{display:flex;flex-wrap:wrap;gap:1.5em;padding:1.5em;color:#fff}' +
                '.vkvideo-full__poster{flex:0 0 280px;max-width:280px}' +
                '.vkvideo-full__poster img{width:100%;border-radius:0.5em;display:block}' +
                '.vkvideo-full__info{flex:1;min-width:300px}' +
                '.vkvideo-full__title{font-size:1.6em;font-weight:700;margin-bottom:0.5em}' +
                '.vkvideo-full__meta{display:flex;gap:1em;font-size:0.9em;color:rgba(255,255,255,0.6);margin-bottom:1em}' +
                '.vkvideo-full__description{font-size:0.95em;line-height:1.5;color:rgba(255,255,255,0.8);margin-bottom:1.5em;max-height:10em;overflow-y:auto}' +
                '.vkvideo-full__buttons{display:flex;flex-wrap:wrap;gap:0.5em}' +
                '.vkvideo-full__btn.focus{background:rgba(255,255,255,0.2)!important;transform:scale(1.05)}' +
                '.vkvideo-full__play{background:rgba(76,175,80,0.3)!important}' +
                '.vkvideo-full__play.focus{background:rgba(76,175,80,0.5)!important}' +
            '</style>'
        );
    }

    // ─── Menu ────────────────────────────────────────────────────────

    function addMenu() {
        var menu = $('.menu .menu__list').eq(0);
        if (!menu.length) return;
        if (menu.find('.menu__item[data-sid="vkvideo"]').length) return;

        var icon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 6l4 4h-3v4h-2v-4H8l4-4z"/></svg>';

        var btn = $(
            '<li class="menu__item selector" data-action="vkvideo_action" data-sid="vkvideo">' +
                '<div class="menu__ico">' + icon + '</div>' +
                '<div class="menu__text">VK Video</div>' +
            '</li>'
        );

        btn.on('hover:enter', function () {
            Lampa.Activity.push({
                title: 'VK Video',
                component: 'vkvideo',
                page: 1
            });
        });

        var lastItem = menu.find('.menu__item').last();
        if (lastItem.length) {
            btn.insertAfter(lastItem);
        } else {
            menu.append(btn);
        }
    }

    // ─── Settings ────────────────────────────────────────────────────

    function addSettings() {
        if (!Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: 'vkvideo',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 6l4 4h-3v4h-2v-4H8l4-4z"/></svg>',
            name: 'VK Video'
        });

        Lampa.SettingsApi.addParam({
            component: 'vkvideo',
            param: {
                type: 'title'
            },
            field: {
                name: 'Авторизация VK OAuth'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'vkvideo',
            param: {
                name: 'vk_client_id',
                type: 'input',
                default: '',
                placeholder: 'VK App ID'
            },
            field: {
                name: 'VK App ID (Standalone)'
            },
            onChange: function () {
                var settings = readSettings();
                settings.client_id = Lampa.Storage.get('vk_client_id', '');
                saveSettings(settings);
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'vkvideo',
            param: {
                name: 'vk_login',
                type: 'trigger',
                default: false
            },
            field: {
                name: function () {
                    return isAuthorized() ? 'Выйти из VK' : 'Войти в VK';
                }
            },
            onChange: function () {
                if (isAuthorized()) {
                    logoutUser();
                } else {
                    var settings = readSettings();
                    if (!settings.client_id) {
                        notify('Сначала введите VK App ID');
                        return;
                    }
                    loginUser();
                }
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'vkvideo',
            param: {
                type: 'title'
            },
            field: {
                name: function () {
                    var auth = readAuth();
                    if (isAuthorized()) {
                        return 'Статус: авторизован как ' + (auth.user_name || 'ID ' + auth.user_id);
                    }
                    return 'Статус: не авторизован';
                }
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'vkvideo',
            param: {
                type: 'title'
            },
            field: {
                name: 'Как получить VK App ID:<br>1. Откройте vk.com/editapp?act=create<br>2. Тип: Standalone<br>3. Вставьте ID в поле выше'
            }
        });
    }

    // ─── Utilities ───────────────────────────────────────────────────

    function escHtml(text) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(text || ''));
        return div.innerHTML;
    }

    // ─── Entry Point ─────────────────────────────────────────────────

    function start() {
        if (!window.Lampa || !window.$) return;

        addStyles();
        addSettings();

        Lampa.Component.add('vkvideo', VKMainComponent);
        Lampa.Component.add('vkvideo_album', VKAlbumListComponent);
        Lampa.Component.add('vkvideo_album_list', VKAlbumListComponent);
        Lampa.Component.add('vkvideo_search_list', VKSearchListComponent);
        Lampa.Component.add('vkvideo_full', VKFullComponent);

        initSearchIntegration();
        initFullHook();

        if (window.appready) {
            addMenu();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') addMenu();
            });
        }

        console.log('[VKVideo] Plugin loaded');
    }

    start();
})();
