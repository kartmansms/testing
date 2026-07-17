/**
 * VK Player Plugin for Lampa
 * Просмотр видео из ВКонтакте
 * 
 * Возможности:
 * - Авторизация через VK OAuth
 * - Поиск видео
 * - Просмотр видео из сообществ和个人ных видео
 * - Интеграция с Lampa Player
 */

(function() {
    'use strict';

    // ===================== КОНСТАНТЫ =====================
    var VK_APP_ID = '51748705'; // ID приложения VK (standalone)
    var VK_API_VERSION = '5.199';
    var AUTH_KEY = 'vk_auth';
    var CACHE_KEY = 'vk_cache';
    var CACHE_TTL = 1000 * 60 * 30; // 30 минут
    var SUBS_KEY = 'vk_subscriptions'; // подписки на сообщества
    var PLAYLISTS_KEY = 'vk_playlists'; // пользовательские плейлисты
    var HISTORY_KEY = 'vk_history'; // история просмотра
    var FAVORITES_KEY = 'vk_favorites'; // избранное
    var HISTORY_MAX = 100; // максимум записей в истории

    // ===================== ЯЗЫКИ =====================
    function initLang() {
        Lampa.Lang.add({
            vk_title: { ru: "VK Видео", en: "VK Video" },
            vk_search: { ru: "Поиск видео VK", en: "Search VK Video" },
            vk_my: { ru: "Мои видео", en: "My Videos" },
            vk_popular: { ru: "Популярное", en: "Popular" },
            vk_settings: { ru: "Настройки VK", en: "VK Settings" },
            vk_auth_btn: { ru: "Войти через VK", en: "Login via VK" },
            vk_logout: { ru: "Выйти", en: "Logout" },
            vk_auth_desc: { ru: "Авторизуйтесь для доступа к личным видео", en: "Authorize to access personal videos" },
            vk_no_auth: { ru: "Необходима авторизация", en: "Authorization required" },
            vk_search_placeholder: { ru: "Введите название видео...", en: "Enter video title..." },
            vk_error: { ru: "Ошибка загрузки", en: "Loading error" },
            vk_duration: { ru: "Длительность", en: "Duration" },
            vk_views: { ru: "Просмотров", en: "Views" },
            vk_date: { ru: "Дата загрузки", en: "Upload date" },
            vk_subscriptions: { ru: "Подписки", en: "Subscriptions" },
            vk_playlists: { ru: "Плейлисты", en: "Playlists" },
            vk_add_sub: { ru: "Подписаться на сообщество", en: "Subscribe to community" },
            vk_remove_sub: { ru: "Отписаться", en: "Unsubscribe" },
            vk_add_playlist: { ru: "Создать плейлист", en: "Create playlist" },
            vk_edit_playlist: { ru: "Редактировать плейлист", en: "Edit playlist" },
            vk_delete_playlist: { ru: "Удалить плейлист", en: "Delete playlist" },
            vk_add_to_playlist: { ru: "Добавить в плейлист", en: "Add to playlist" },
            vk_playlist_name: { ru: "Название плейлиста", en: "Playlist name" },
            vk_playlist_desc: { ru: "Описание", en: "Description" },
            vk_videos_count: { ru: "видео", en: "videos" },
            vk_community_added: { ru: "Сообщество добавлено в подписки", en: "Community added to subscriptions" },
            vk_community_removed: { ru: "Сообщество удалено из подписок", en: "Community removed from subscriptions" },
            vk_playlist_created: { ru: "Плейлист создан", en: "Playlist created" },
            vk_playlist_deleted: { ru: "Плейлист удален", en: "Playlist deleted" },
            vk_video_added: { ru: "Видео добавлено в плейлист", en: "Video added to playlist" },
            vk_search_community: { ru: "Найти сообщество", en: "Find community" },
            vk_enter_community_id: { ru: "Введите ID или короткое имя сообщества", en: "Enter community ID or screen name" },
            vk_history: { ru: "История просмотра", en: "Watch History" },
            vk_favorites: { ru: "Избранное", en: "Favorites" },
            vk_add_favorites: { ru: "Добавить в избранное", en: "Add to favorites" },
            vk_remove_favorites: { ru: "Удалить из избранного", en: "Remove from favorites" },
            vk_clear_history: { ru: "Очистить историю", en: "Clear history" },
            vk_added_to_favorites: { ru: "Добавлено в избранное", en: "Added to favorites" },
            vk_removed_from_favorites: { ru: "Удалено из избранного", en: "Removed from favorites" },
            vk_history_cleared: { ru: "История очищена", en: "History cleared" },
            vk_watched: { ru: "Просмотрено", en: "Watched" },
            vk_watched_at: { ru: "Просмотрено", en: "Watched" },
            vk_progress: { ru: "Прогресс", en: "Progress" }
        });
    }

    // ===================== УТИЛИТЫ =====================
    function storageGet(key) {
        return Lampa.Storage.get(key);
    }

    function storageSet(key, val) {
        Lampa.Storage.set(key, val);
    }

    function readAuth() {
        return storageGet(AUTH_KEY) || { access_token: '', user_id: 0, expires_at: 0 };
    }

    function isAuthorized() {
        var auth = readAuth();
        return auth.access_token && auth.expires_at > Date.now();
    }

    function formatDuration(seconds) {
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        var s = seconds % 60;
        if (h > 0) return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function formatDate(timestamp) {
        var d = new Date(timestamp * 1000);
        return d.toLocaleDateString('ru-RU');
    }

    function truncate(str, len) {
        if (!str) return '';
        return str.length > len ? str.substring(0, len) + '...' : str;
    }

    // ===================== КЭШИРОВАНИЕ =====================
    function getCached(key) {
        var data = storageGet(CACHE_KEY);
        if (!data || !data[key]) return null;
        var item = data[key];
        if (Date.now() - item.ts > CACHE_TTL) return null;
        return item.value;
    }

    function setCache(key, value) {
        var data = storageGet(CACHE_KEY) || {};
        data[key] = { value: value, ts: Date.now() };
        // Очистка старых записей
        var keys = Object.keys(data);
        if (keys.length > 50) {
            var sorted = keys.sort(function(a, b) { return (data[a].ts || 0) - (data[b].ts || 0); });
            for (var i = 0; i < 20; i++) delete data[sorted[i]];
        }
        storageSet(CACHE_KEY, data);
    }

    // ===================== VK API =====================
    function vkApi(method, params, callback, errorCallback) {
        var url = 'https://api.vk.com/method/' + method;
        var auth = readAuth();

        params.access_token = auth.access_token;
        params.v = VK_API_VERSION;

        $.ajax({
            url: url,
            method: 'GET',
            data: params,
            dataType: 'jsonp',
            crossDomain: true,
            timeout: 15000
        }).done(function(response) {
            if (response.error) {
                console.error('VK API Error:', response.error);
                if (errorCallback) errorCallback(response.error);
                return;
            }
            callback(response.response);
        }).fail(function(jqXHR, textStatus) {
            console.error('VK API Request Failed:', textStatus);
            if (errorCallback) errorCallback({ error_msg: textStatus });
        });
    }

    // ===================== ПОИСК =====================
    function searchVideos(query, page, callback, errorCallback) {
        var cacheKey = 'search_' + query + '_' + page;
        var cached = getCached(cacheKey);
        if (cached) return callback(cached);

        vkApi('video.search', {
            q: query,
            count: 20,
            offset: (page - 1) * 20,
            adult: 0,
            sort: 0 // по релевантности
        }, function(data) {
            setCache(cacheKey, data);
            callback(data);
        }, errorCallback);
    }

    function getPopularVideos(page, callback, errorCallback) {
        var cacheKey = 'popular_' + page;
        var cached = getCached(cacheKey);
        if (cached) return callback(cached);

        vkApi('video.get', {
            owner_id: -1,
            count: 20,
            offset: (page - 1) * 20
        }, function(data) {
            setCache(cacheKey, data);
            callback(data);
        }, errorCallback);
    }

    function getMyVideos(page, callback, errorCallback) {
        if (!isAuthorized()) {
            if (errorCallback) errorCallback({ error_msg: 'Not authorized' });
            return;
        }

        var auth = readAuth();
        var cacheKey = 'my_' + auth.user_id + '_' + page;
        var cached = getCached(cacheKey);
        if (cached) return callback(cached);

        vkApi('video.get', {
            owner_id: auth.user_id,
            count: 20,
            offset: (page - 1) * 20
        }, function(data) {
            setCache(cacheKey, data);
            callback(data);
        }, errorCallback);
    }

    function getCommunityVideos(ownerId, page, callback, errorCallback) {
        var cacheKey = 'community_' + ownerId + '_' + page;
        var cached = getCached(cacheKey);
        if (cached) return callback(cached);

        vkApi('video.get', {
            owner_id: ownerId,
            count: 20,
            offset: (page - 1) * 20
        }, function(data) {
            setCache(cacheKey, data);
            callback(data);
        }, errorCallback);
    }

    // ===================== ПОДПИСКИ НА СООБЩЕСТВА =====================
    function getSubscriptions() {
        return storageGet(SUBS_KEY) || [];
    }

    function saveSubscriptions(subs) {
        storageSet(SUBS_KEY, subs);
    }

    function addSubscription(community) {
        var subs = getSubscriptions();
        // Проверяем дубликат
        for (var i = 0; i < subs.length; i++) {
            if (subs[i].id === community.id) return false;
        }
        subs.push({
            id: community.id,
            name: community.name,
            screen_name: community.screen_name,
            photo: community.photo_50 || community.photo_100 || '',
            members_count: community.members_count || 0,
            video_count: community.videos_count || 0,
            added_at: Date.now()
        });
        saveSubscriptions(subs);
        return true;
    }

    function removeSubscription(communityId) {
        var subs = getSubscriptions();
        var newSubs = [];
        for (var i = 0; i < subs.length; i++) {
            if (subs[i].id !== communityId) {
                newSubs.push(subs[i]);
            }
        }
        saveSubscriptions(newSubs);
    }

    function isSubscribed(communityId) {
        var subs = getSubscriptions();
        for (var i = 0; i < subs.length; i++) {
            if (subs[i].id === communityId) return true;
        }
        return false;
    }

    function resolveCommunity(screenName, callback, errorCallback) {
        vkApi('utils.resolveScreenName', {
            screen_name: screenName
        }, function(data) {
            if (data && data.type === 'group') {
                // Получаем информацию о сообществе
                vkApi('groups.getById', {
                    group_id: data.object_id,
                    fields: 'name,screen_name,photo_50,photo_100,members_count,videos_count'
                }, function(groups) {
                    if (groups && groups.length > 0) {
                        callback(groups[0]);
                    } else {
                        errorCallback({ error_msg: 'Community not found' });
                    }
                }, errorCallback);
            } else if (data && data.type === 'page') {
                vkApi('users.get', {
                    user_ids: data.object_id,
                    fields: 'photo_50,photo_100,video_count'
                }, function(users) {
                    if (users && users.length > 0) {
                        var user = users[0];
                        user.id = -user.id; // VK использует отрицательные ID для пользователей в video.get
                        user.name = user.first_name + ' ' + user.last_name;
                        user.screen_name = screenName;
                        callback(user);
                    } else {
                        errorCallback({ error_msg: 'User not found' });
                    }
                }, errorCallback);
            } else {
                errorCallback({ error_msg: 'Not found' });
            }
        }, errorCallback);
    }

    // ===================== ПЛЕЙЛИСТЫ =====================
    function getPlaylists() {
        return storageGet(PLAYLISTS_KEY) || [];
    }

    function savePlaylists(playlists) {
        storageSet(PLAYLISTS_KEY, playlists);
    }

    function createPlaylist(name, description) {
        var playlists = getPlaylists();
        var id = 'pl_' + Date.now();
        var playlist = {
            id: id,
            name: name || 'Новый плейлист',
            description: description || '',
            videos: [],
            created_at: Date.now(),
            updated_at: Date.now()
        };
        playlists.push(playlist);
        savePlaylists(playlists);
        return playlist;
    }

    function deletePlaylist(playlistId) {
        var playlists = getPlaylists();
        var newPlaylists = [];
        for (var i = 0; i < playlists.length; i++) {
            if (playlists[i].id !== playlistId) {
                newPlaylists.push(playlists[i]);
            }
        }
        savePlaylists(newPlaylists);
    }

    function getPlaylist(playlistId) {
        var playlists = getPlaylists();
        for (var i = 0; i < playlists.length; i++) {
            if (playlists[i].id === playlistId) return playlists[i];
        }
        return null;
    }

    function updatePlaylist(playlistId, updates) {
        var playlists = getPlaylists();
        for (var i = 0; i < playlists.length; i++) {
            if (playlists[i].id === playlistId) {
                if (updates.name !== undefined) playlists[i].name = updates.name;
                if (updates.description !== undefined) playlists[i].description = updates.description;
                playlists[i].updated_at = Date.now();
                savePlaylists(playlists);
                return playlists[i];
            }
        }
        return null;
    }

    function addToPlaylist(playlistId, video) {
        var playlists = getPlaylists();
        for (var i = 0; i < playlists.length; i++) {
            if (playlists[i].id === playlistId) {
                // Проверяем дубликат
                var videoId = video.owner_id + '_' + video.id;
                for (var j = 0; j < playlists[i].videos.length; j++) {
                    if (playlists[i].videos[j].videoId === videoId) return false;
                }
                playlists[i].videos.push({
                    videoId: videoId,
                    owner_id: video.owner_id,
                    id: video.id,
                    title: video.title || 'Без названия',
                    image: video.image || [],
                    duration: video.duration || 0,
                    added_at: Date.now()
                });
                playlists[i].updated_at = Date.now();
                savePlaylists(playlists);
                return true;
            }
        }
        return false;
    }

    function removeFromPlaylist(playlistId, videoId) {
        var playlists = getPlaylists();
        for (var i = 0; i < playlists.length; i++) {
            if (playlists[i].id === playlistId) {
                var newVideos = [];
                for (var j = 0; j < playlists[i].videos.length; j++) {
                    if (playlists[i].videos[j].videoId !== videoId) {
                        newVideos.push(playlists[i].videos[j]);
                    }
                }
                playlists[i].videos = newVideos;
                playlists[i].updated_at = Date.now();
                savePlaylists(playlists);
                return true;
            }
        }
        return false;
    }

    function getPlaylistVideos(playlistId, callback) {
        var playlist = getPlaylist(playlistId);
        if (!playlist) return callback([]);

        // Получаем полные данные видео через API
        var videoIds = [];
        for (var i = 0; i < playlist.videos.length; i++) {
            var v = playlist.videos[i];
            videoIds.push(v.owner_id + '_' + v.id);
        }

        if (videoIds.length === 0) return callback([]);

        vkApi('video.get', {
            videos: videoIds.join(','),
            count: 100
        }, function(data) {
            callback(data.items || []);
        }, function() {
            // Fallback: возвращаем кэшированные данные
            callback(playlist.videos);
        });
    }

    function showAddToPlaylistModal(video) {
        var playlists = getPlaylists();
        var html = '<div class="vk-playlist-modal">';

        if (playlists.length === 0) {
            html += '<p>У вас пока нет плейлистов</p>';
            html += '<div class="vk-playlist-create selector" data-action="create">+ Создать плейлист</div>';
        } else {
            for (var i = 0; i < playlists.length; i++) {
                var pl = playlists[i];
                var count = pl.videos ? pl.videos.length : 0;
                html += '<div class="vk-playlist-item selector" data-id="' + pl.id + '">' +
                    '<div class="vk-playlist-item__name">' + pl.name + '</div>' +
                    '<div class="vk-playlist-item__count">' + count + ' видео</div>' +
                '</div>';
            }
            html += '<div class="vk-playlist-create selector" data-action="create">+ Создать новый</div>';
        }

        html += '</div>';

        Lampa.Modal.open({
            title: 'Добавить в плейлист',
            html: $(html),
            size: 'medium',
            onBack: function() {
                Lampa.Modal.close();
            }
        });

        // Обработчики
        $('.vk-playlist-item').on('hover:enter', function() {
            var playlistId = $(this).data('id');
            addToPlaylist(playlistId, video);
            Lampa.Noty.show(Lampa.Lang.translate('vk_video_added'));
            Lampa.Modal.close();
        });

        $('.vk-playlist-create').on('hover:enter', function() {
            Lampa.Modal.close();
            showCreatePlaylistModal(video);
        });
    }

    function showCreatePlaylistModal(videoToadd) {
        Lampa.Modal.open({
            title: Lampa.Lang.translate('vk_add_playlist'),
            html: $('<div class="vk-create-playlist">' +
                '<input type="text" class="vk-playlist-name-input" placeholder="' + Lampa.Lang.translate('vk_playlist_name') + '">' +
                '<input type="text" class="vk-playlist-desc-input" placeholder="' + Lampa.Lang.translate('vk_playlist_desc') + '">' +
                '</div>'),
            size: 'medium',
            onBack: function() {
                var name = $('.vk-playlist-name-input').val().trim();
                var desc = $('.vk-playlist-desc-input').val().trim();

                if (name) {
                    var playlist = createPlaylist(name, desc);
                    if (videoToadd) {
                        addToPlaylist(playlist.id, videoToadd);
                    }
                    Lampa.Noty.show(Lampa.Lang.translate('vk_playlist_created'));
                }

                Lampa.Modal.close();
            }
        });
    }

    // ===================== ИСТОРИЯ ПРОСМОТРА =====================
    function getHistory() {
        return storageGet(HISTORY_KEY) || [];
    }

    function saveHistory(history) {
        storageSet(HISTORY_KEY, history);
    }

    function addToHistory(video, progress) {
        var history = getHistory();
        var videoId = video.owner_id + '_' + video.id;

        // Удаляем дубликат
        var newHistory = [];
        for (var i = 0; i < history.length; i++) {
            if (history[i].videoId !== videoId) {
                newHistory.push(history[i]);
            }
        }

        // Добавляем в начало
        newHistory.unshift({
            videoId: videoId,
            owner_id: video.owner_id,
            id: video.id,
            title: video.title || 'Без названия',
            image: video.image || [],
            duration: video.duration || 0,
            description: video.description || '',
            player: video.player || '',
            progress: progress || 0,
            watched_at: Date.now()
        });

        // Ограничиваем размер
        if (newHistory.length > HISTORY_MAX) {
            newHistory = newHistory.slice(0, HISTORY_MAX);
        }

        saveHistory(newHistory);
    }

    function updateHistoryProgress(videoId, progress) {
        var history = getHistory();
        for (var i = 0; i < history.length; i++) {
            if (history[i].videoId === videoId) {
                history[i].progress = progress;
                history[i].watched_at = Date.now();
                saveHistory(history);
                return;
            }
        }
    }

    function removeFromHistory(videoId) {
        var history = getHistory();
        var newHistory = [];
        for (var i = 0; i < history.length; i++) {
            if (history[i].videoId !== videoId) {
                newHistory.push(history[i]);
            }
        }
        saveHistory(newHistory);
    }

    function clearHistory() {
        saveHistory([]);
    }

    function isInHistory(videoId) {
        var history = getHistory();
        for (var i = 0; i < history.length; i++) {
            if (history[i].videoId === videoId) return true;
        }
        return false;
    }

    // ===================== ИЗБРАННОЕ =====================
    function getFavorites() {
        return storageGet(FAVORITES_KEY) || [];
    }

    function saveFavorites(favorites) {
        storageSet(FAVORITES_KEY, favorites);
    }

    function addToFavorites(video) {
        var favorites = getFavorites();
        var videoId = video.owner_id + '_' + video.id;

        // Проверяем дубликат
        for (var i = 0; i < favorites.length; i++) {
            if (favorites[i].videoId === videoId) return false;
        }

        favorites.unshift({
            videoId: videoId,
            owner_id: video.owner_id,
            id: video.id,
            title: video.title || 'Без названия',
            image: video.image || [],
            duration: video.duration || 0,
            description: video.description || '',
            player: video.player || '',
            added_at: Date.now()
        });

        saveFavorites(favorites);
        return true;
    }

    function removeFromFavorites(videoId) {
        var favorites = getFavorites();
        var newFavorites = [];
        for (var i = 0; i < favorites.length; i++) {
            if (favorites[i].videoId !== videoId) {
                newFavorites.push(favorites[i]);
            }
        }
        saveFavorites(newFavorites);
    }

    function isFavorite(videoId) {
        var favorites = getFavorites();
        for (var i = 0; i < favorites.length; i++) {
            if (favorites[i].videoId === videoId) return true;
        }
        return false;
    }

    function toggleFavorite(video) {
        var videoId = video.owner_id + '_' + video.id;
        if (isFavorite(videoId)) {
            removeFromFavorites(videoId);
            Lampa.Noty.show(Lampa.Lang.translate('vk_removed_from_favorites'));
            return false;
        } else {
            addToFavorites(video);
            Lampa.Noty.show(Lampa.Lang.translate('vk_added_to_favorites'));
            return true;
        }
    }

    // ===================== UI: ИСТОРИЯ =====================
    function renderHistory(container) {
        var history = getHistory();

        if (history.length === 0) {
            container.html('<div class="vk-empty">' +
                '<p>История просмотра пуста</p>' +
            '</div>');
            return;
        }

        var html = '<div class="vk-history-header">' +
            '<div class="vk-history-title">История (' + history.length + ' видео)</div>' +
            '<div class="vk-history-clear selector">' + Lampa.Lang.translate('vk_clear_history') + '</div>' +
        '</div>';
        html += '<div class="vk-grid">';

        for (var i = 0; i < history.length; i++) {
            var item = history[i];
            var card = historyItemToCard(item);
            html += renderHistoryCard(card, item);
        }

        html += '</div>';

        container.html(html);

        // Обработчики
        container.find('.vk-card').on('hover:enter', function() {
            var videoId = $(this).data('video-id');
            var item = findHistoryItem(videoId);
            if (item) {
                playVideoWithHistory(item);
            }
        });

        container.find('.vk-card').on('hover:long', function() {
            var videoId = $(this).data('video-id');
            showHistoryMenu(videoId, container);
        });

        container.find('.vk-history-clear').on('hover:enter', function() {
            Lampa.Modal.open({
                title: 'Очистить историю?',
                html: $('<div><p>Удалить всю историю просмотра?</p></div>'),
                size: 'small',
                onBack: function() {
                    clearHistory();
                    Lampa.Noty.show(Lampa.Lang.translate('vk_history_cleared'));
                    renderHistory(container);
                    Lampa.Modal.close();
                }
            });
        });
    }

    function historyItemToCard(item) {
        var duration = item.duration ? formatDuration(item.duration) : '';
        var date = item.watched_at ? formatDate(item.watched_at / 1000) : '';

        return {
            id: 'vk_' + item.videoId,
            title: item.title || 'Без названия',
            poster: item.image && item.image.length > 0 ? item.image[item.image.length - 1].url : '',
            vk_duration: duration,
            vk_date: date,
            vk_video_id: item.id,
            vk_owner_id: item.owner_id,
            progress: item.progress || 0
        };
    }

    function findHistoryItem(videoId) {
        var history = getHistory();
        for (var i = 0; i < history.length; i++) {
            if (history[i].videoId === videoId) return history[i];
        }
        return null;
    }

    function renderHistoryCard(card, item) {
        var progressPercent = item.duration > 0 ? Math.round((item.progress || 0) / item.duration * 100) : 0;
        var progressHtml = progressPercent > 0 ?
            '<div class="vk-card__progress"><div class="vk-card__progress-bar" style="width:' + progressPercent + '%"></div></div>' : '';

        return '<div class="vk-card selector" data-video-id="' + card.vk_owner_id + '_' + card.vk_video_id + '">' +
            '<div class="vk-card__poster">' +
                '<img src="' + (card.poster || '') + '" alt="' + (card.title || '') + '" loading="lazy">' +
                '<div class="vk-card__duration">' + card.vk_duration + '</div>' +
                progressHtml +
            '</div>' +
            '<div class="vk-card__title">' + truncate(card.title, 50) + '</div>' +
            '<div class="vk-card__meta">' +
                '<span class="vk-card__date">' + card.vk_date + '</span>' +
            '</div>' +
        '</div>';
    }

    function showHistoryMenu(videoId, container) {
        var item = findHistoryItem(videoId);
        if (!item) return;

        Lampa.Modal.open({
            title: truncate(item.title, 40),
            html: $('<div class="vk-video-menu">' +
                '<div class="vk-video-menu__item selector" data-action="play">▶ Смотреть</div>' +
                '<div class="vk-video-menu__item selector" data-action="add_playlist">' + Lampa.Lang.translate('vk_add_to_playlist') + '</div>' +
                '<div class="vk-video-menu__item selector" data-action="add_fav">' + Lampa.Lang.translate('vk_add_favorites') + '</div>' +
                '<div class="vk-video-menu__item selector" data-action="remove">' + Lampa.Lang.translate('vk_remove_favorites') + '</div>' +
            '</div>'),
            size: 'small',
            onBack: function() {
                Lampa.Modal.close();
            }
        });

        $('[data-action="play"]').on('hover:enter', function() {
            Lampa.Modal.close();
            playVideoWithHistory(item);
        });

        $('[data-action="add_playlist"]').on('hover:enter', function() {
            Lampa.Modal.close();
            showAddToPlaylistModal(item);
        });

        $('[data-action="add_fav"]').on('hover:enter', function() {
            Lampa.Modal.close();
            addToFavorites(item);
            Lampa.Noty.show(Lampa.Lang.translate('vk_added_to_favorites'));
        });

        $('[data-action="remove"]').on('hover:enter', function() {
            Lampa.Modal.close();
            removeFromHistory(videoId);
            renderHistory(container);
        });
    }

    function playVideoWithHistory(video) {
        // Конвертируем формат истории в формат video для воспроизведения
        var videoObj = {
            owner_id: video.owner_id,
            id: video.id,
            title: video.title,
            image: video.image || [],
            duration: video.duration || 0,
            player: video.player || ''
        };

        getVideoStream(videoObj, function(stream) {
            if (!stream || !stream.url) {
                Lampa.Noty.show(Lampa.Lang.translate('vk_error'));
                return;
            }

            // Добавляем в историю
            addToHistory(videoObj, 0);

            // Воспроизводим
            Lampa.Player.play({
                title: video.title,
                url: stream.url,
                subtitle: stream.isHls ? 'HLS' : 'MP4',
                poster: videoObj.image && videoObj.image.length > 0 ? videoObj.image[videoObj.image.length - 1].url : '',
                movie: {
                    id: 'vk_' + video.owner_id + '_' + video.id,
                    title: video.title,
                    media_type: 'video',
                    source: 'vk'
                }
            });

            // Отслеживаем прогресс
            trackPlaybackProgress(video);
        });
    }

    function trackPlaybackProgress(video) {
        var videoId = video.owner_id + '_' + video.id;
        var checkInterval = setInterval(function() {
            try {
                var player = Lampa.Player;
                if (player && player.video) {
                    var currentTime = player.video.currentTime || 0;
                    var duration = video.duration || 0;
                    updateHistoryProgress(videoId, currentTime);
                }
            } catch(e) {}
        }, 5000);

        // Останавливаем через 10 минут или при остановке
        setTimeout(function() {
            clearInterval(checkInterval);
        }, 600000);
    }

    // ===================== UI: ИЗБРАННОЕ =====================
    function renderFavorites(container) {
        var favorites = getFavorites();

        if (favorites.length === 0) {
            container.html('<div class="vk-empty">' +
                '<p>Избранное пусто</p>' +
            '</div>');
            return;
        }

        var html = '<div class="vk-history-header">' +
            '<div class="vk-history-title">Избранное (' + favorites.length + ' видео)</div>' +
        '</div>';
        html += '<div class="vk-grid">';

        for (var i = 0; i < favorites.length; i++) {
            var item = favorites[i];
            var card = favoriteToCard(item);
            html += renderFavoriteCard(card, item);
        }

        html += '</div>';

        container.html(html);

        // Обработчики
        container.find('.vk-card').on('hover:enter', function() {
            var videoId = $(this).data('video-id');
            var item = findFavoriteItem(videoId);
            if (item) {
                playVideoWithFavorite(item);
            }
        });

        container.find('.vk-card').on('hover:long', function() {
            var videoId = $(this).data('video-id');
            showFavoriteMenu(videoId, container);
        });
    }

    function favoriteToCard(item) {
        var duration = item.duration ? formatDuration(item.duration) : '';
        var date = item.added_at ? formatDate(item.added_at / 1000) : '';

        return {
            id: 'vk_fav_' + item.videoId,
            title: item.title || 'Без названия',
            poster: item.image && item.image.length > 0 ? item.image[item.image.length - 1].url : '',
            vk_duration: duration,
            vk_date: date,
            vk_video_id: item.id,
            vk_owner_id: item.owner_id
        };
    }

    function findFavoriteItem(videoId) {
        var favorites = getFavorites();
        for (var i = 0; i < favorites.length; i++) {
            if (favorites[i].videoId === videoId) return favorites[i];
        }
        return null;
    }

    function renderFavoriteCard(card, item) {
        return '<div class="vk-card selector" data-video-id="' + card.vk_owner_id + '_' + card.vk_video_id + '">' +
            '<div class="vk-card__poster">' +
                '<img src="' + (card.poster || '') + '" alt="' + (card.title || '') + '" loading="lazy">' +
                '<div class="vk-card__duration">' + card.vk_duration + '</div>' +
            '</div>' +
            '<div class="vk-card__title">' + truncate(card.title, 50) + '</div>' +
            '<div class="vk-card__meta">' +
                '<span class="vk-card__date">' + card.vk_date + '</span>' +
            '</div>' +
        '</div>';
    }

    function showFavoriteMenu(videoId, container) {
        var item = findFavoriteItem(videoId);
        if (!item) return;

        Lampa.Modal.open({
            title: truncate(item.title, 40),
            html: $('<div class="vk-video-menu">' +
                '<div class="vk-video-menu__item selector" data-action="play">▶ Смотреть</div>' +
                '<div class="vk-video-menu__item selector" data-action="add_playlist">' + Lampa.Lang.translate('vk_add_to_playlist') + '</div>' +
                '<div class="vk-video-menu__item selector" data-action="remove">' + Lampa.Lang.translate('vk_remove_favorites') + '</div>' +
            '</div>'),
            size: 'small',
            onBack: function() {
                Lampa.Modal.close();
            }
        });

        $('[data-action="play"]').on('hover:enter', function() {
            Lampa.Modal.close();
            playVideoWithFavorite(item);
        });

        $('[data-action="add_playlist"]').on('hover:enter', function() {
            Lampa.Modal.close();
            showAddToPlaylistModal(item);
        });

        $('[data-action="remove"]').on('hover:enter', function() {
            Lampa.Modal.close();
            removeFromFavorites(videoId);
            renderFavorites(container);
        });
    }

    function playVideoWithFavorite(video) {
        var videoObj = {
            owner_id: video.owner_id,
            id: video.id,
            title: video.title,
            image: video.image || [],
            duration: video.duration || 0,
            player: video.player || ''
        };

        getVideoStream(videoObj, function(stream) {
            if (!stream || !stream.url) {
                Lampa.Noty.show(Lampa.Lang.translate('vk_error'));
                return;
            }

            addToHistory(videoObj, 0);

            Lampa.Player.play({
                title: video.title,
                url: stream.url,
                subtitle: stream.isHls ? 'HLS' : 'MP4',
                poster: videoObj.image && videoObj.image.length > 0 ? videoObj.image[videoObj.image.length - 1].url : '',
                movie: {
                    id: 'vk_' + video.owner_id + '_' + video.id,
                    title: video.title,
                    media_type: 'video',
                    source: 'vk'
                }
            });

            trackPlaybackProgress(videoObj);
        });
    }

    // ===================== UI: ПОДПИСКИ =====================
    function renderSubscriptions(container) {
        var subs = getSubscriptions();

        if (subs.length === 0) {
            container.html('<div class="vk-empty">' +
                '<p>У вас пока нет подписок</p>' +
                '<div class="vk-add-sub-btn selector">' + Lampa.Lang.translate('vk_add_sub') + '</div>' +
            '</div>');

            container.find('.vk-add-sub-btn').on('hover:enter', function() {
                showAddSubscriptionModal(container);
            });
            return;
        }

        var html = '<div class="vk-subs-grid">';
        for (var i = 0; i < subs.length; i++) {
            var sub = subs[i];
            html += '<div class="vk-sub-card selector" data-id="' + sub.id + '">' +
                '<div class="vk-sub-card__photo">' +
                    '<img src="' + (sub.photo || '') + '" alt="' + (sub.name || '') + '">' +
                '</div>' +
                '<div class="vk-sub-card__info">' +
                    '<div class="vk-sub-card__name">' + sub.name + '</div>' +
                    '<div class="vk-sub-card__members">' + (sub.members_count || 0) + ' участников</div>' +
                '</div>' +
            '</div>';
        }
        html += '<div class="vk-sub-add selector">' + Lampa.Lang.translate('vk_add_sub') + '</div>';
        html += '</div>';

        container.html(html);

        // Обработчики
        container.find('.vk-sub-card').on('hover:enter', function() {
            var communityId = parseInt($(this).data('id'));
            showCommunityVideos(communityId, container);
        });

        container.find('.vk-sub-card').on('hover:long', function() {
            var communityId = parseInt($(this).data('id'));
            showRemoveSubConfirm(communityId, container);
        });

        container.find('.vk-sub-add').on('hover:enter', function() {
            showAddSubscriptionModal(container);
        });
    }

    function showAddSubscriptionModal(container) {
        Lampa.Modal.open({
            title: Lampa.Lang.translate('vk_add_sub'),
            html: $('<div class="vk-add-sub-modal">' +
                '<p>' + Lampa.Lang.translate('vk_enter_community_id') + '</p>' +
                '<input type="text" class="vk-community-input" placeholder="screen_name или ID">' +
                '</div>'),
            size: 'medium',
            onBack: function() {
                var input = $('.vk-community-input').val().trim();
                if (input) {
                    resolveCommunity(input, function(community) {
                        addSubscription(community);
                        Lampa.Noty.show(Lampa.Lang.translate('vk_community_added'));
                        renderSubscriptions(container);
                    }, function(error) {
                        Lampa.Noty.show('Ошибка: ' + (error.error_msg || 'Не найдено'));
                    });
                }
                Lampa.Modal.close();
            }
        });
    }

    function showRemoveSubConfirm(communityId, container) {
        var subs = getSubscriptions();
        var community = null;
        for (var i = 0; i < subs.length; i++) {
            if (subs[i].id === communityId) {
                community = subs[i];
                break;
            }
        }

        if (!community) return;

        Lampa.Modal.open({
            title: 'Отписаться?',
            html: $('<div><p>Отписаться от сообщества "' + community.name + '"?</p></div>'),
            size: 'small',
            onBack: function() {
                removeSubscription(communityId);
                Lampa.Noty.show(Lampa.Lang.translate('vk_community_removed'));
                renderSubscriptions(container);
                Lampa.Modal.close();
            }
        });
    }

    function showCommunityVideos(communityId, backContainer) {
        var content = $('<div class="vk-community-content"></div>');
        var header = $('<div class="vk-community-header"></div>');
        var grid = $('<div class="vk-community-grid"></div>');
        var loadMore = $('<div class="vk-load-more selector">Загрузить ещё</div>');

        content.append(header).append(grid).append(loadMore);
        backContainer.html(content);

        var page = 1;

        function loadPage() {
            getCommunityVideos(communityId, page, function(data) {
                if (!data || !data.items) return;

                header.html('<div class="vk-community-title">Видео сообщества (' + data.count + ' всего)</div>');

                for (var i = 0; i < data.items.length; i++) {
                    var card = videoToCard(data.items[i]);
                    grid.append(renderVideoCard(card, data.items[i]));
                }

                if (data.count > page * 20) {
                    loadMore.show();
                } else {
                    loadMore.hide();
                }
            });
        }

        loadPage();

        loadMore.on('hover:enter', function() {
            page++;
            loadPage();
        });

        // Клик по видео
        grid.on('hover:enter', '.vk-card', function() {
            var idx = $(this).data('index');
            // Находим видео по индексу в DOM
            var cards = grid.find('.vk-card');
            var realIndex = cards.index($(this));
            getCommunityVideos(communityId, 1, function(data) {
                if (data && data.items && data.items[realIndex]) {
                    playVideoWithMenu(data.items[realIndex]);
                }
            });
        });
    }

    // ===================== UI: ПЛЕЙЛИСТЫ =====================
    function renderPlaylists(container) {
        var playlists = getPlaylists();

        if (playlists.length === 0) {
            container.html('<div class="vk-empty">' +
                '<p>У вас пока нет плейлистов</p>' +
                '<div class="vk-create-pl-btn selector">' + Lampa.Lang.translate('vk_add_playlist') + '</div>' +
            '</div>');

            container.find('.vk-create-pl-btn').on('hover:enter', function() {
                showCreatePlaylistModal(null);
                setTimeout(function() { renderPlaylists(container); }, 500);
            });
            return;
        }

        var html = '<div class="vk-playlists-grid">';
        for (var i = 0; i < playlists.length; i++) {
            var pl = playlists[i];
            var count = pl.videos ? pl.videos.length : 0;
            var firstPoster = '';
            if (pl.videos && pl.videos.length > 0 && pl.videos[0].image && pl.videos[0].image.length > 0) {
                firstPoster = pl.videos[0].image[pl.videos[0].image.length - 1].url || '';
            }

            html += '<div class="vk-playlist-card selector" data-id="' + pl.id + '">' +
                '<div class="vk-playlist-card__poster">' +
                    (firstPoster ? '<img src="' + firstPoster + '" alt="' + pl.name + '">' : '<div class="vk-playlist-card__empty">🎬</div>') +
                    '<div class="vk-playlist-card__count">' + count + ' видео</div>' +
                '</div>' +
                '<div class="vk-playlist-card__title">' + pl.name + '</div>' +
            '</div>';
        }
        html += '<div class="vk-playlist-add selector" data-action="create">+ ' + Lampa.Lang.translate('vk_add_playlist') + '</div>';
        html += '</div>';

        container.html(html);

        // Обработчики
        container.find('.vk-playlist-card').on('hover:enter', function() {
            var playlistId = $(this).data('id');
            showPlaylistVideos(playlistId, container);
        });

        container.find('.vk-playlist-card').on('hover:long', function() {
            var playlistId = $(this).data('id');
            showPlaylistMenu(playlistId, container);
        });

        container.find('.vk-playlist-add').on('hover:enter', function() {
            showCreatePlaylistModal(null);
            setTimeout(function() { renderPlaylists(container); }, 500);
        });
    }

    function showPlaylistVideos(playlistId, backContainer) {
        var playlist = getPlaylist(playlistId);
        if (!playlist) return;

        var content = $('<div class="vk-playlist-content"></div>');
        var header = $('<div class="vk-playlist-header"></div>');
        var grid = $('<div class="vk-playlist-grid"></div>');
        var backBtn = $('<div class="vk-back-btn selector">← Назад</div>');

        header.append(backBtn).append('<div class="vk-playlist-title">' + playlist.name + ' (' + playlist.videos.length + ' видео)</div>');
        if (playlist.description) {
            header.append('<div class="vk-playlist-desc">' + playlist.description + '</div>');
        }

        content.append(header).append(grid);
        backContainer.html(content);

        // Загружаем видео
        getPlaylistVideos(playlistId, function(videos) {
            for (var i = 0; i < videos.length; i++) {
                var card = videoToCard(videos[i]);
                grid.append(renderVideoCard(card, videos[i], playlistId));
            }
        });

        // Назад
        backBtn.on('hover:enter', function() {
            renderPlaylists(backContainer);
        });

        // Клик по видео
        grid.on('hover:enter', '.vk-card', function() {
            var videoId = $(this).data('video-id');
            getPlaylistVideos(playlistId, function(videos) {
                for (var i = 0; i < videos.length; i++) {
                    if (videos[i].owner_id + '_' + videos[i].id === videoId) {
                        playVideoWithMenu(videos[i]);
                        break;
                    }
                }
            });
        });

        // Удаление видео из плейлиста
        grid.on('hover:long', '.vk-card', function() {
            var videoId = $(this).data('video-id');
            var card = $(this);
            Lampa.Modal.open({
                title: 'Удалить из плейлиста?',
                html: $('<div><p>Удалить видео из плейлиста "' + playlist.name + '"?</p></div>'),
                size: 'small',
                onBack: function() {
                    removeFromPlaylist(playlistId, videoId);
                    card.remove();
                    Lampa.Modal.close();
                }
            });
        });
    }

    function showPlaylistMenu(playlistId, container) {
        var playlist = getPlaylist(playlistId);
        if (!playlist) return;

        Lampa.Modal.open({
            title: playlist.name,
            html: $('<div class="vk-playlist-menu">' +
                '<div class="vk-playlist-menu__item selector" data-action="edit">' + Lampa.Lang.translate('vk_edit_playlist') + '</div>' +
                '<div class="vk-playlist-menu__item selector" data-action="delete">' + Lampa.Lang.translate('vk_delete_playlist') + '</div>' +
                '</div>'),
            size: 'small',
            onBack: function() {
                Lampa.Modal.close();
            }
        });

        $('[data-action="edit"]').on('hover:enter', function() {
            Lampa.Modal.close();
            showEditPlaylistModal(playlistId, container);
        });

        $('[data-action="delete"]').on('hover:enter', function() {
            Lampa.Modal.close();
            Lampa.Modal.open({
                title: 'Удалить плейлист?',
                html: $('<div><p>Удалить плейлист "' + playlist.name + '"?</p></div>'),
                size: 'small',
                onBack: function() {
                    deletePlaylist(playlistId);
                    Lampa.Noty.show(Lampa.Lang.translate('vk_playlist_deleted'));
                    renderPlaylists(container);
                    Lampa.Modal.close();
                }
            });
        });
    }

    function showEditPlaylistModal(playlistId, container) {
        var playlist = getPlaylist(playlistId);
        if (!playlist) return;

        Lampa.Modal.open({
            title: Lampa.Lang.translate('vk_edit_playlist'),
            html: $('<div class="vk-edit-playlist">' +
                '<input type="text" class="vk-playlist-name-input" value="' + (playlist.name || '') + '" placeholder="' + Lampa.Lang.translate('vk_playlist_name') + '">' +
                '<input type="text" class="vk-playlist-desc-input" value="' + (playlist.description || '') + '" placeholder="' + Lampa.Lang.translate('vk_playlist_desc') + '">' +
                '</div>'),
            size: 'medium',
            onBack: function() {
                var name = $('.vk-playlist-name-input').val().trim();
                var desc = $('.vk-playlist-desc-input').val().trim();

                if (name) {
                    updatePlaylist(playlistId, { name: name, description: desc });
                }

                renderPlaylists(container);
                Lampa.Modal.close();
            }
        });
    }

    function renderVideoCard(card, video, playlistId) {
        var menuBtn = playlistId ? '' : '<div class="vk-card__menu-btn selector" data-video-id="' + card.vk_owner_id + '_' + card.vk_video_id + '">⋯</div>';
        return '<div class="vk-card selector" data-id="' + card.id + '" data-video-id="' + card.vk_owner_id + '_' + card.vk_video_id + '">' +
            '<div class="vk-card__poster">' +
                '<img src="' + (card.poster || '') + '" alt="' + (card.title || '') + '" loading="lazy">' +
                '<div class="vk-card__duration">' + card.vk_duration + '</div>' +
                menuBtn +
            '</div>' +
            '<div class="vk-card__title">' + truncate(card.title, 50) + '</div>' +
            '<div class="vk-card__meta">' +
                '<span class="vk-card__views">' + card.vk_views + ' просм.</span>' +
                '<span class="vk-card__date">' + card.vk_date + '</span>' +
            '</div>' +
        '</div>';
    }

    function playVideoWithMenu(video) {
        var videoId = video.owner_id + '_' + video.id;
        var isFav = isFavorite(videoId);

        // Показать контекстное меню перед воспроизведением
        var html = '<div class="vk-video-menu">' +
            '<div class="vk-video-menu__item selector" data-action="play">▶ Смотреть</div>' +
            '<div class="vk-video-menu__item selector" data-action="toggle_fav">' + (isFav ? Lampa.Lang.translate('vk_remove_favorites') : Lampa.Lang.translate('vk_add_favorites')) + '</div>' +
            '<div class="vk-video-menu__item selector" data-action="add_playlist">' + Lampa.Lang.translate('vk_add_to_playlist') + '</div>' +
            '<div class="vk-video-menu__item selector" data-action="add_sub">' + Lampa.Lang.translate('vk_add_sub') + '</div>' +
        '</div>';

        Lampa.Modal.open({
            title: truncate(video.title, 40),
            html: $(html),
            size: 'small',
            onBack: function() {
                Lampa.Modal.close();
            }
        });

        $('[data-action="play"]').on('hover:enter', function() {
            Lampa.Modal.close();
            playVideo(video);
        });

        $('[data-action="toggle_fav"]').on('hover:enter', function() {
            Lampa.Modal.close();
            toggleFavorite(video);
        });

        $('[data-action="add_playlist"]').on('hover:enter', function() {
            Lampa.Modal.close();
            showAddToPlaylistModal(video);
        });

        $('[data-action="add_sub"]').on('hover:enter', function() {
            Lampa.Modal.close();
            if (video.owner_id < 0) {
                vkApi('groups.getById', {
                    group_id: Math.abs(video.owner_id),
                    fields: 'name,screen_name,photo_50,members_count'
                }, function(groups) {
                    if (groups && groups.length > 0) {
                        addSubscription(groups[0]);
                        Lampa.Noty.show(Lampa.Lang.translate('vk_community_added'));
                    }
                });
            }
        });
    }

    // ===================== ПОЛУЧЕНИЕ СТРИМА =====================
    function getVideoStream(video, callback) {
        // VK возвращает разные форматы в зависимости от прав
        var formats = [];

        // mp4_240, mp4_360, mp4_480, mp4_720, mp4_1080
        if (video.mp4_1080) formats.push({ quality: '1080p', url: video.mp4_1080 });
        if (video.mp4_720) formats.push({ quality: '720p', url: video.mp4_720 });
        if (video.mp4_480) formats.push({ quality: '480p', url: video.mp4_480 });
        if (video.mp4_360) formats.push({ quality: '360p', url: video.mp4_360 });
        if (video.mp4_240) formats.push({ quality: '240p', url: video.mp4_240 });

        // HLS
        if (video.hls) formats.push({ quality: 'HLS', url: video.hls, isHls: true });

        // Live streams
        if (video.live_mp4) formats.push({ quality: 'Live', url: video.live_mp4 });
        if (video.live_hls) formats.push({ quality: 'Live HLS', url: video.live_hls, isHls: true });

        if (formats.length === 0) {
            // Попробовать получить через player API
            getVideoPlayerUrl(video, callback);
            return;
        }

        // Выбираем лучший формат
        var best = formats[0];
        for (var i = 1; i < formats.length; i++) {
            if (!formats[i].isHls && formats[i].quality.indexOf('1080') === -1) {
                best = formats[i];
                break;
            }
        }

        callback({ url: best.url, formats: formats, isHls: best.isHls });
    }

    function getVideoPlayerUrl(video, callback) {
        // Fallback: получить URL через API player
        var videoUrl = video.player;
        if (videoUrl) {
            callback({ url: videoUrl, formats: [], isHls: false });
            return;
        }

        callback({ url: null, formats: [], isHls: false, error: 'No stream available' });
    }

    // ===================== КАРТОЧКИ =====================
    function videoToCard(video) {
        var duration = video.duration ? formatDuration(video.duration) : '';
        var views = video.views ? video.views.toLocaleString('ru-RU') : '0';
        var date = video.date ? formatDate(video.date) : '';

        return {
            id: 'vk_' + video.owner_id + '_' + video.id,
            title: video.title || 'Без названия',
            original_title: video.title,
            description: truncate(video.description, 200),
            poster: video.image ? (video.image[video.image.length - 1].url || video.image[0].url) : '',
            backdrop: video.image ? video.image[video.image.length - 1].url : '',
            year: video.date ? new Date(video.date * 1000).getFullYear() : 0,
            media_type: 'video',
            source: 'vk',
            // Кастомные поля VK
            vk_owner_id: video.owner_id,
            vk_video_id: video.id,
            vk_duration: duration,
            vk_views: views,
            vk_date: date,
            vk_url: video.player,
            // Дополнительная информация
            info: [
                { title: 'VK', description: duration },
                { title: 'Просмотров', description: views }
            ]
        };
    }

    // ===================== ПРОСМОТР =====================
    function playVideo(video) {
        getVideoStream(video, function(stream) {
            if (!stream || !stream.url) {
                Lampa.Noty.show(Lampa.Lang.translate('vk_error'));
                return;
            }

            var card = videoToCard(video);

            // Добавляем в историю
            addToHistory(video, 0);

            Lampa.Player.play({
                title: video.title,
                url: stream.url,
                subtitle: stream.isHls ? 'HLS' : 'MP4',
                poster: card.poster,
                movie: card
            });

            // Отслеживаем прогресс
            trackPlaybackProgress(video);
        });
    }

    // ===================== UI: СПИСОК ВИДЕО =====================
    function createVideoList(items, title, loadMore) {
        var list = [];

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            list.push(videoToCard(item));
        }

        return {
            title: title || 'VK Видео',
            items: list,
            loadMore: loadMore
        };
    }

    // ===================== КОМПОНЕНТ: КАТАЛОГ =====================
    function VKCatalog() {
        var self = this;
        var page = 1;
        var query = '';
        var mode = 'search'; // search, popular, my, community
        var container = null;
        var scroll = null;

        this.create = function() {
            container = $('<div class="vk-catalog"></div>');
        };

        this.render = function() {
            return container;
        };

        this.start = function() {
            // Получаем параметры из Activity
            if (this.activity) {
                if (this.activity.vk_mode) mode = this.activity.vk_mode;
                if (this.activity.vk_query) query = this.activity.vk_query;
                if (this.activity.vk_communityId) self.communityId = this.activity.vk_communityId;
                if (this.activity.vk_playlistId) self.playlistId = this.activity.vk_playlistId;
            }
            self.load();
        };

        this.load = function() {
            if (mode === 'search' && query) {
                searchVideos(query, page, self.onLoad, self.onError);
            } else if (mode === 'popular') {
                getPopularVideos(page, self.onLoad, self.onError);
            } else if (mode === 'my') {
                getMyVideos(page, self.onLoad, self.onError);
            } else if (mode === 'community') {
                getCommunityVideos(self.communityId, page, self.onLoad, self.onError);
            } else if (mode === 'subscriptions') {
                renderSubscriptions(container);
            } else if (mode === 'playlists') {
                renderPlaylists(container);
            } else if (mode === 'history') {
                renderHistory(container);
            } else if (mode === 'favorites') {
                renderFavorites(container);
            }
        };

        this.onLoad = function(data) {
            if (!data || !data.items) {
                container.html('<div class="empty">' + Lampa.Lang.translate('vk_error') + '</div>');
                return;
            }

            var html = '<div class="vk-grid">';
            for (var i = 0; i < data.items.length; i++) {
                var item = data.items[i];
                var card = videoToCard(item);
                html += self.renderCard(card);
            }
            html += '</div>';

            if (data.count > page * 20) {
                html += '<div class="vk-load-more selector" data-page="' + (page + 1) + '">Загрузить ещё</div>';
            }

            container.html(html);

            // Обработчики
            container.find('.vk-card').on('hover:enter', function() {
                var idx = $(this).data('index');
                playVideo(data.items[idx]);
            });

            container.find('.vk-load-more').on('hover:enter', function() {
                page = parseInt($(this).data('page'));
                self.load();
            });
        };

        this.onError = function(error) {
            container.html('<div class="empty">' + Lampa.Lang.translate('vk_error') + '</div>');
            console.error('VK Error:', error);
        };

        this.renderCard = function(card) {
            return '<div class="vk-card selector" data-id="' + card.id + '" data-index="' + card.vk_video_id + '">' +
                '<div class="vk-card__poster">' +
                    '<img src="' + (card.poster || '') + '" alt="' + (card.title || '') + '" loading="lazy">' +
                    '<div class="vk-card__duration">' + card.vk_duration + '</div>' +
                '</div>' +
                '<div class="vk-card__title">' + truncate(card.title, 50) + '</div>' +
                '<div class="vk-card__meta">' +
                    '<span class="vk-card__views">' + card.vk_views + ' просм.</span>' +
                    '<span class="vk-card__date">' + card.vk_date + '</span>' +
                '</div>' +
            '</div>';
        };

        this.setMode = function(newMode, data) {
            mode = newMode;
            page = 1;
            if (data) {
                if (data.query) query = data.query;
                if (data.communityId) self.communityId = data.communityId;
                if (data.playlistId) self.playlistId = data.playlistId;
            }
        };

        this.destroy = function() {
            if (container) container.remove();
        };
    }

    Lampa.Component.add('vk_catalog', VKCatalog);

    // ===================== КОМПОНЕНТ: ПОИСК =====================
    function VKSearch() {
        var self = this;
        var input = null;

        this.create = function() {
            input = $('<input type="text" class="vk-search-input" placeholder="' + Lampa.Lang.translate('vk_search_placeholder') + '">');
        };

        this.render = function() {
            return $('<div class="vk-search"></div>').append(input);
        };

        this.start = function() {
            input.on('keyup', function(e) {
                if (e.key === 'Enter') {
                    var query = input.val().trim();
                    if (query) {
                        self.onSearch(query);
                    }
                }
            });
        };

        this.onSearch = function(query) {
            // Вызов поиска
            searchVideos(query, 1, function(data) {
                if (data && data.items) {
                    var event = $.Event('vk:search:results');
                    $(document).trigger(event, [data.items, query]);
                }
            });
        };

        this.destroy = function() {
            if (input) input.remove();
        };
    }

    Lampa.Component.add('vk_search', VKSearch);

    // ===================== НАСТРОЙКИ =====================
    function initSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'vk',
            name: Lampa.Lang.translate('vk_title'),
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.339-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.847 2.49 2.27 4.674 2.86 4.674.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.253-1.406 2.15-3.574 2.15-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z"/></svg>'
        });

        // Кнопка авторизации
        Lampa.SettingsApi.addParam({
            component: 'vk',
            param: {
                name: 'vk_auth',
                type: 'button'
            },
            field: {
                name: isAuthorized() ? Lampa.Lang.translate('vk_logout') : Lampa.Lang.translate('vk_auth_btn'),
                description: isAuthorized() ? 'ID: ' + readAuth().user_id : Lampa.Lang.translate('vk_auth_desc')
            },
            onChange: function() {
                if (isAuthorized()) {
                    // Выход
                    storageSet(AUTH_KEY, { access_token: '', user_id: 0, expires_at: 0 });
                    Lampa.Noty.show('Вы вышли из VK');
                    Lampa.Settings.update();
                } else {
                    // Авторизация через VK
                    openVKAuth();
                }
            }
        });

        // Поиск по умолчанию
        Lampa.SettingsApi.addParam({
            component: 'vk',
            param: {
                name: 'vk_default_search',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Добавить поиск в главное меню',
                description: 'Добавить пункт "VK Поиск" в главное меню'
            },
            onChange: function() {
                Lampa.Settings.update();
            }
        });

        // Взрослый контент
        Lampa.SettingsApi.addParam({
            component: 'vk',
            param: {
                name: 'vk_adult',
                type: 'trigger',
                default: false
            },
            field: {
                name: 'Взрослый контент',
                description: 'Показывать видео 18+'
            },
            onChange: function() {
                Lampa.Settings.update();
            }
        });

        // Подписки
        Lampa.SettingsApi.addParam({
            component: 'vk',
            param: {
                name: 'vk_subscriptions',
                type: 'button'
            },
            field: {
                name: Lampa.Lang.translate('vk_subscriptions'),
                description: 'Управление подписками на сообщества (' + getSubscriptions().length + ')'
            },
            onChange: function() {
                Lampa.Activity.push({
                    component: 'vk_catalog',
                    title: Lampa.Lang.translate('vk_subscriptions'),
                    vk_mode: 'subscriptions'
                });
            }
        });

        // Плейлисты
        Lampa.SettingsApi.addParam({
            component: 'vk',
            param: {
                name: 'vk_playlists',
                type: 'button'
            },
            field: {
                name: Lampa.Lang.translate('vk_playlists'),
                description: 'Управление плейлистами (' + getPlaylists().length + ')'
            },
            onChange: function() {
                Lampa.Activity.push({
                    component: 'vk_catalog',
                    title: Lampa.Lang.translate('vk_playlists'),
                    vk_mode: 'playlists'
                });
            }
        });

        // История
        Lampa.SettingsApi.addParam({
            component: 'vk',
            param: {
                name: 'vk_history',
                type: 'button'
            },
            field: {
                name: Lampa.Lang.translate('vk_history'),
                description: 'Просмотренные видео (' + getHistory().length + ')'
            },
            onChange: function() {
                Lampa.Activity.push({
                    component: 'vk_catalog',
                    title: Lampa.Lang.translate('vk_history'),
                    vk_mode: 'history'
                });
            }
        });

        // Избранное
        Lampa.SettingsApi.addParam({
            component: 'vk',
            param: {
                name: 'vk_favorites',
                type: 'button'
            },
            field: {
                name: Lampa.Lang.translate('vk_favorites'),
                description: 'Избранные видео (' + getFavorites().length + ')'
            },
            onChange: function() {
                Lampa.Activity.push({
                    component: 'vk_catalog',
                    title: Lampa.Lang.translate('vk_favorites'),
                    vk_mode: 'favorites'
                });
            }
        });

        // Кэш
        Lampa.SettingsApi.addParam({
            component: 'vk',
            param: {
                name: 'vk_clear_cache',
                type: 'button'
            },
            field: {
                name: 'Очистить кэш',
                description: 'Очистить кэш видео'
            },
            onChange: function() {
                storageSet(CACHE_KEY, {});
                Lampa.Noty.show('Кэш очищен');
                Lampa.Settings.update();
            }
        });
    }

    // ===================== АВТОРИЗАЦИЯ =====================
    function openVKAuth() {
        // VK OAuth для standalone приложений
        var redirectUri = 'https://oauth.vk.com/blank.html';
        var authUrl = 'https://oauth.vk.com/authorize?' +
            'client_id=' + VK_APP_ID +
            '&display=page' +
            '&redirect_uri=' + encodeURIComponent(redirectUri) +
            '&scope=video,offline' +
            '&response_type=token' +
            '&v=' + VK_API_VERSION;

        // Открываем окно авторизации
        var authWindow = window.open(authUrl, 'vk_auth', 'width=660,height=500');

        // Проверяем результат (пользователь должен вставить токен вручную)
        Lampa.Modal.open({
            title: 'Авторизация VK',
            html: $('<div class="vk-auth-modal">' +
                '<p>1. Откройте ссылку и разрешите доступ:</p>' +
                '<p class="vk-auth-url" style="word-break:break-all;color:#5181b8;">' + authUrl + '</p>' +
                '<p>2. Скопируйте access_token из адресной строки:</p>' +
                '<p style="font-size:0.8em;color:#999;">#access_token=...&expires_in=...&user_id=...</p>' +
                '<p>3. Вставьте токен в поле ниже:</p>' +
                '<input type="text" class="vk-token-input" placeholder="access_token">' +
                '<p>4. Вставьте user_id:</p>' +
                '<input type="text" class="vk-userid-input" placeholder="user_id">' +
                '</div>'),
            size: 'medium',
            onBack: function() {
                var token = $('.vk-token-input').val().trim();
                var userId = parseInt($('.vk-userid-input').val().trim());

                if (token && userId) {
                    storageSet(AUTH_KEY, {
                        access_token: token,
                        user_id: userId,
                        expires_at: Date.now() + (86400 * 365 * 1000) // 1 год (offline)
                    });
                    Lampa.Noty.show('VK авторизован! ID: ' + userId);
                }

                Lampa.Modal.close();
            }
        });
    }

    // ===================== МЕНЮ =====================
    function initMenu() {
        // Добавляем VK в главное меню
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') {
                setTimeout(function() {
                    addVKMenuItems();
                }, 1000);
            }
        });
    }

    function addVKMenuItems() {
        // Добавляем пункты в главное меню через Lampa.Menu
        if (Lampa.Menu) {
            Lampa.Menu.add({
                title: Lampa.Lang.translate('vk_title'),
                icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.339-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.847 2.49 2.27 4.674 2.86 4.674.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.253-1.406 2.15-3.574 2.15-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z"/></svg>',
                component: 'vk_main_menu'
            });
        }
    }

    // Компонент главное меню VK
    function VKMainMenu() {
        var self = this;
        var container = null;

        this.create = function() {
            container = $('<div class="vk-main-menu"></div>');
        };

        this.render = function() {
            return container;
        };

        this.start = function() {
            var html = '<div class="vk-menu-grid">' +
                '<div class="vk-menu-item selector" data-mode="search">' +
                    '<div class="vk-menu-item__icon">🔍</div>' +
                    '<div class="vk-menu-item__title">' + Lampa.Lang.translate('vk_search') + '</div>' +
                '</div>' +
                '<div class="vk-menu-item selector" data-mode="my">' +
                    '<div class="vk-menu-item__icon">📹</div>' +
                    '<div class="vk-menu-item__title">' + Lampa.Lang.translate('vk_my') + '</div>' +
                '</div>' +
                '<div class="vk-menu-item selector" data-mode="history">' +
                    '<div class="vk-menu-item__icon">🕐</div>' +
                    '<div class="vk-menu-item__title">' + Lampa.Lang.translate('vk_history') + ' (' + getHistory().length + ')</div>' +
                '</div>' +
                '<div class="vk-menu-item selector" data-mode="favorites">' +
                    '<div class="vk-menu-item__icon">⭐</div>' +
                    '<div class="vk-menu-item__title">' + Lampa.Lang.translate('vk_favorites') + ' (' + getFavorites().length + ')</div>' +
                '</div>' +
                '<div class="vk-menu-item selector" data-mode="subscriptions">' +
                    '<div class="vk-menu-item__icon">👥</div>' +
                    '<div class="vk-menu-item__title">' + Lampa.Lang.translate('vk_subscriptions') + ' (' + getSubscriptions().length + ')</div>' +
                '</div>' +
                '<div class="vk-menu-item selector" data-mode="playlists">' +
                    '<div class="vk-menu-item__icon">📋</div>' +
                    '<div class="vk-menu-item__title">' + Lampa.Lang.translate('vk_playlists') + ' (' + getPlaylists().length + ')</div>' +
                '</div>' +
                '<div class="vk-menu-item selector" data-mode="popular">' +
                    '<div class="vk-menu-item__icon">🔥</div>' +
                    '<div class="vk-menu-item__title">' + Lampa.Lang.translate('vk_popular') + '</div>' +
                '</div>' +
            '</div>';

            container.html(html);

            container.find('.vk-menu-item').on('hover:enter', function() {
                var mode = $(this).data('mode');
                self.openMode(mode);
            });
        };

        this.openMode = function(mode) {
            if (mode === 'search') {
                Lampa.Input.edit({
                    title: Lampa.Lang.translate('vk_search'),
                    value: '',
                    free: true,
                    nosave: true
                }, function(query) {
                    if (query && query.trim()) {
                        Lampa.Activity.push({
                            component: 'vk_catalog',
                            title: Lampa.Lang.translate('vk_search') + ': ' + query,
                            vk_mode: 'search',
                            vk_query: query.trim()
                        });
                    }
                });
            } else if (mode === 'my') {
                if (!isAuthorized()) {
                    Lampa.Noty.show(Lampa.Lang.translate('vk_no_auth'));
                    return;
                }
                Lampa.Activity.push({
                    component: 'vk_catalog',
                    title: Lampa.Lang.translate('vk_my'),
                    vk_mode: 'my'
                });
            } else if (mode === 'history') {
                Lampa.Activity.push({
                    component: 'vk_catalog',
                    title: Lampa.Lang.translate('vk_history'),
                    vk_mode: 'history'
                });
            } else if (mode === 'favorites') {
                Lampa.Activity.push({
                    component: 'vk_catalog',
                    title: Lampa.Lang.translate('vk_favorites'),
                    vk_mode: 'favorites'
                });
            } else if (mode === 'subscriptions') {
                Lampa.Activity.push({
                    component: 'vk_catalog',
                    title: Lampa.Lang.translate('vk_subscriptions'),
                    vk_mode: 'subscriptions'
                });
            } else if (mode === 'playlists') {
                Lampa.Activity.push({
                    component: 'vk_catalog',
                    title: Lampa.Lang.translate('vk_playlists'),
                    vk_mode: 'playlists'
                });
            } else if (mode === 'popular') {
                Lampa.Activity.push({
                    component: 'vk_catalog',
                    title: Lampa.Lang.translate('vk_popular'),
                    vk_mode: 'popular'
                });
            }
        };

        this.destroy = function() {
            if (container) container.remove();
        };
    }

    Lampa.Component.add('vk_main_menu', VKMainMenu);

    // ===================== ИНИЦИАЛИЗАЦИЯ =====================
    var manifest = {
        type: 'other',
        version: '1.0.0',
        author: 'MiMoCode',
        name: Lampa.Lang.translate('vk_title'),
        description: 'Просмотр видео из ВКонтакте',
        component: 'vk_player'
    };

    function add() {
        initLang();
        Lampa.Manifest.plugins = manifest;
        initSettings();
        initMenu();
    }

    function startPlugin() {
        window.plugin_vk_ready = true;

        if (window.appready) {
            add();
        } else {
            Lampa.Listener.follow('app', function(e) {
                if (e.type === 'ready') add();
            });
        }
    }

    if (!window.plugin_vk_ready) {
        startPlugin();
    }

})();
