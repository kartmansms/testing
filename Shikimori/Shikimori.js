(function () {
    'use strict';

    if (window.plugin_jutsu_ready) return;
    window.plugin_jutsu_ready = true;

    var SETTINGS_KEY = 'jutsu_settings_v2';
    var TMDB_CACHE_KEY = 'jutsu_tmdb_cache_v2';
    var SITE_HOST = 'https://jut-su.net'; // Актуальный домен
    var PAGE_LIMIT = 20;

    function defaults() {
        return { card_size: 'normal', proxy_type: 'corsproxy' };
    }

    function storageGet(key, fallback) {
        try {
            if (window.Lampa && Lampa.Storage && Lampa.Storage.get) {
                var value = Lampa.Storage.get(key, fallback);
                return value === undefined || value === null ? fallback : value;
            }
            var local = localStorage.getItem(key);
            return local ? JSON.parse(local) : fallback;
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
            localStorage.setItem(key, JSON.stringify(value));
        } catch (err) {}
    }

    function readSettings() {
        var base = defaults();
        var saved = storageGet(SETTINGS_KEY, {});
        for (var key in saved) if (saved.hasOwnProperty(key)) base[key] = saved[key];
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

    // --- Парсинг HTML с сайта ---
    
    function parseHTML(html) {
        var items = [];
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        var posts = tempDiv.querySelectorAll('.short, .item, .post, article, .movie-item, .short-item');
        
        for (var i = 0; i < posts.length; i++) {
            var post = posts[i];
            var linkNode = post.querySelector('a');
            var imgNode = post.querySelector('img');
            
            if (!linkNode || !imgNode) continue;

            var url = linkNode.getAttribute('href');
            var poster = imgNode.getAttribute('src');
            if (poster && poster.indexOf('//') === 0) poster = 'https:' + poster;
            else if (poster && poster.indexOf('http') !== 0) poster = SITE_HOST + poster;

            var title = imgNode.getAttribute('alt') || '';
            if (!title) {
                var titleNode = post.querySelector('.title, h2, h3, .name');
                if (titleNode) title = titleNode.innerText || titleNode.textContent;
            }
            if (!title) title = linkNode.innerText || linkNode.textContent;

            title = title.trim().replace(/\s+/g, ' ');

            if (url && title) {
                items.push({
                    id: url,
                    name: title,
                    poster: poster || ''
                });
            }
        }
        return items;
    }

    function getProxyUrl(url) {
        var proxy = readSettings().proxy_type;
        if (proxy === 'corsproxy') return 'https://corsproxy.io/?' + encodeURIComponent(url);
        if (proxy === 'allorigins') return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        if (proxy === 'thingproxy') return 'https://thingproxy.freeboard.io/fetch/' + url;
        return url; // direct
    }

    function requestAnime(params, oncomplete, onerror) {
        var page = parseInt(params.page, 10) || 1;
        var url = SITE_HOST;

        if (params.search) {
            // Используем GET поиск DLE для совместимости с прокси
            url = SITE_HOST + '/index.php?do=search&subaction=search&search_start=' + page + '&full_search=0&result_from=' + ((page - 1) * PAGE_LIMIT + 1) + '&story=' + encodeURIComponent(params.search);
        } else {
            url = params.category || SITE_HOST;
            if (page > 1) {
                url = url.replace(/\/$/, '') + '/page/' + page + '/';
            }
        }

        var finalUrl = getProxyUrl(url);

        $.ajax({
            url: finalUrl,
            method: 'GET',
            dataType: 'html',
            timeout: 15000,
            success: function (html) {
                if (html.indexOf('Cloudflare') > -1 || html.indexOf('Just a moment...') > -1) {
                    notify('Jut.su: Блокировка Cloudflare. Прокси не помог.');
                    if (onerror) onerror();
                    return;
                }
                var items = parseHTML(html);
                oncomplete(items);
            },
            error: function (xhr) {
                notify('Jut.su: Ошибка сети или прокси недоступен.');
                if (onerror) onerror(xhr);
            }
        });
    }

    // --- Привязка к TMDB ---

    function openAnime(data) {
        var tmdbCache = storageGet(TMDB_CACHE_KEY, {});
        if (tmdbCache[data.id] && tmdbCache[data.id].id) {
            openTmdb({ id: tmdbCache[data.id].id, media_type: tmdbCache[data.id].type }, data);
            return;
        }
        fallbackSearch(data);
    }

    function fallbackSearch(data) {
        function clean(str) {
            if (!str) return '';
            var s = str
                .replace(/\b(\d+\s*сезон)\b/gi, '')
                .replace(/\b(ТВ-?\d+)\b/gi, '')
                .replace(/\(.*\)/g, '')
                .replace(/\[.*\]/g, '')
                .replace(/смотреть онлайн/gi, '')
                .replace(/[^\w\а-яА-ЯёЁ\s]/gi, ' ')
                .replace(/\s{2,}/g, ' ');
            return s.trim();
        }

        var cleanQuery = clean(data.name);
        if (!cleanQuery || cleanQuery.length < 2) {
            openLampaSearch(data);
            return;
        }

        var apiKey = "4ef0d7355d9ffb5151e987764708ce96";
        var lang = (window.Lampa && Lampa.Storage) ? Lampa.Storage.get('language', 'ru') : 'ru';
        var url = 'https://api.themoviedb.org/3/search/multi?api_key=' + apiKey + '&language=' + lang + '&query=' + encodeURIComponent(cleanQuery);

        var handleSuccess = function(res) {
            if (res && res.results && res.results.length > 0) {
                var bestItem = null;
                for (var j = 0; j < res.results.length; j++) {
                    var item = res.results[j];
                    if (item.media_type === 'tv' || item.media_type === 'movie') {
                        bestItem = item;
                        break;
                    }
                }
                if (bestItem) openTmdb(bestItem, data);
                else openLampaSearch(data);
            } else {
                openLampaSearch(data);
            }
        };

        notify('Поиск в базе TMDB...');
        $.ajax({ url: url, dataType: 'json', success: handleSuccess, error: function() { openLampaSearch(data); } });
    }

    function openLampaSearch(data) {
        notify('Не найдено в TMDB, открыт ручной поиск');
        var query = data.name.replace(/(смотреть онлайн|все серии|сезон \d+)/gi, '').trim();
        if (window.Lampa && Lampa.Activity) {
            Lampa.Activity.push({ url: '', title: 'Поиск: ' + query, component: 'search', query: query });
        }
    }

    function openTmdb(item, sourceData) {
        var type = item.media_type || item.type || 'tv';
        var movie = {
            id: item.id || item.tmdb_id,
            title: item.title || item.name || sourceData.name,
            original_title: item.original_title || item.original_name || sourceData.name,
            name: item.name || item.title || sourceData.name,
            original_name: item.original_name || item.original_title || sourceData.name,
            poster_path: item.poster_path || '',
            backdrop_path: item.backdrop_path || '',
            vote_average: item.vote_average || 0,
            jutsu: sourceData
        };
        
        var tmdbCache = storageGet(TMDB_CACHE_KEY, {});
        if (!tmdbCache[sourceData.id] || tmdbCache[sourceData.id].id !== movie.id) {
            tmdbCache[sourceData.id] = { id: movie.id, type: type === 'movie' ? 'movie' : 'tv' };
            storageSet(TMDB_CACHE_KEY, tmdbCache);
        }

        Lampa.Activity.push({ url: '', title: movie.title, component: 'full', id: movie.id, method: type === 'movie' ? 'movie' : 'tv', card: movie, source: 'tmdb' });
    }

    // --- Интерфейс карточки ---

    function Card(data) {
        var settings = readSettings();
        var compact = settings.card_size === 'compact' ? ' Jutsu--compact' : '';
        
        this.data = data;
        this.render = function () {
            var imgFallback = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="440"><rect width="100%" height="100%" fill="#22252d"/><text x="50%" y="50%" fill="#777" font-family="Arial" font-size="24" text-anchor="middle">Jut.su</text></svg>');
            var poster = data.poster || imgFallback;

            return $('<div class="card Jutsu selector' + compact + '" data-id="' + esc(data.id) + '">' +
                '<div class="card__view"><img class="card__img" src="' + esc(poster) + '" /></div>' +
                '<div class="card__title">' + esc(data.name) + '</div></div>');
        };
    }

    // --- Основной компонент каталога ---

    function Catalog(object) {
        var params = object || {};
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var html = $('<div class="Jutsu-module"></div>');
        var head = $('<div class="Jutsu-head"></div>');
        var quick = $('<div class="Jutsu-quick"></div>');
        var active = $('<div class="Jutsu-active"></div>');
        var body = $('<div class="Jutsu-body"></div>');
        var last;
        var rendered = false;
        var loading = false;
        var ended = false;
        var autoLoading = false;

        params.page = parseInt(params.page, 10) || 1;

        this.render = function () {
            if (!rendered) {
                rendered = true;
                html.append(head).append(quick).append(active).append(scroll.render());
                scroll.append(body);
                scroll.minus();
                scroll.onWheel = function (step) {
                    var enabledController = Lampa.Controller.enabled && Lampa.Controller.enabled();
                    if (enabledController && enabledController.name !== 'content') Lampa.Controller.toggle('content');
                    if (step > 0) Navigator.move('down'); else Navigator.move('up');
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
                left: function () { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); },
                right: function () { Navigator.move('right'); },
                up: function () { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); },
                down: function () { if (Navigator.canmove('down')) Navigator.move('down'); },
                back: function () { if (Lampa.Activity && Lampa.Activity.backward) Lampa.Activity.backward(); },
                enter: function () { 
                    var focused = html.find('.selector.focus');
                    if (focused.length) { var action = focused.data('action'); if (action) action(); }
                }
            });
            Lampa.Controller.toggle('content');
        };

        this.destroy = function () { html.off(); scroll.render().off(); scroll.destroy(); html.remove(); };

        function buildHeader() {
            head.empty(); quick.empty(); active.empty();
            addHeadButton('Главная', function () { openWith({ page: 1, search: '', category: '' }); });
            addHeadButton('Поиск', openSearch);
            addHeadButton('Настройки', openSettings);
            
            addQuick('Новинки', { category: SITE_HOST, search: '' });
            addQuick('Онгоинги', { category: SITE_HOST + '/ongoing/', search: '' });
            addQuick('Топ 100', { category: SITE_HOST + '/top/', search: '' });
            addQuick('Фильмы', { category: SITE_HOST + '/anime-films/', search: '' });
            
            if (params.search || params.category) {
                addQuick('Сброс', { page: 1, search: '', category: '' }, true);
            }
            renderActive();
        }

        function bindPress(element, action) {
            var locked = false;
            var run = function () {
                if (locked) return; locked = true; setTimeout(function () { locked = false; }, 280); action();
            };
            element.data('action', run);
            element.on('hover:enter click tap mouseup', run);
            element.on('keydown keyup', function (e) {
                var code = e.keyCode || e.which;
                if (code === 13 || code === 32) { if (e.type === 'keyup') run(); e.preventDefault(); return false; }
            });
        }

        function addHeadButton(title, action) {
            var btn = $('<div class="simple-button selector Jutsu-head__button">' + esc(title) + '</div>');
            btn.on('hover:focus nav_focus', function () { last = btn[0]; });
            bindPress(btn, action); head.append(btn);
        }

        function addQuick(title, values, reset) {
            var selected = !reset;
            if (selected) {
                for (var key in values) {
                    if (String(params[key] || '') !== String(values[key] || '')) { selected = false; break; }
                }
            }
            var btn = $('<div class="simple-button selector Jutsu-chip' + (selected ? ' Jutsu-chip--active' : '') + '">' + esc(title) + '</div>');
            btn.on('hover:focus nav_focus', function () { last = btn[0]; });
            bindPress(btn, function () { openWith(values); }); quick.append(btn);
        }

        function renderActive() {
            var parts = [];
            if (params.search) parts.push('поиск: ' + params.search);
            else if (params.category && params.category !== SITE_HOST) {
                var catName = params.category.replace(SITE_HOST, '').replace(/\//g, '');
                parts.push('категория: ' + catName);
            }
            active.html(parts.length ? '<span>Активно:</span> ' + esc(parts.join(' / ')) : '<span>Jut.su</span> парсер аниме');
        }

        function openWith(values) {
            var next = {};
            for (var key in params) if (params[key] !== undefined && params[key] !== null && params[key] !== '') next[key] = params[key];
            next.page = values.hasOwnProperty('page') ? values.page : 1;
            for (var key in values) { if (values[key] === '') delete next[key]; else next[key] = values[key]; }
            
            Lampa.Activity.push({ url: '', title: 'Jut.su', component: 'jutsu', page: next.page, search: next.search || '', category: next.category || '' });
        }

        function openSearch() {
            var value = params.search || '';
            if (window.Lampa && Lampa.Input && Lampa.Input.edit) {
                Lampa.Input.edit({ title: 'Поиск Jut.su', value: value, free: true }, function (text) {
                    text = String(text || '').trim();
                    if (!text) notify('Введите название'); else openWith({ search: text, category: '' });
                });
            } else {
                value = window.prompt('Поиск Jut.su', value);
                if (value !== null) { value = String(value || '').trim(); if (value) openWith({ search: value, category: '' }); }
            }
        }

        function openSettings() {
            var settings = readSettings();
            
            var proxyMap = {
                'corsproxy': 'CorsProxy.io (Рекомендуется)',
                'allorigins': 'AllOrigins (Резервный)',
                'thingproxy': 'ThingProxy (Резервный 2)',
                'direct': 'Прямой (Без прокси - для MSX/Android)'
            };

            var items = [
                { title: 'Сервер-прокси: ' + (proxyMap[settings.proxy_type] || proxyMap['corsproxy']), value: 'proxy_type' },
                { title: 'Размер карточек: ' + (settings.card_size === 'compact' ? 'компактный' : 'обычный'), value: 'card_size' },
                { title: 'Очистить кэш поиска TMDB', value: 'clear_tmdb_cache' }
            ];
            Lampa.Select.show({ title: 'Настройки Jut.su', items: items, onSelect: function (item) {
                if (item.value === 'card_size') {
                    settings.card_size = settings.card_size === 'normal' ? 'compact' : 'normal';
                } else if (item.value === 'proxy_type') {
                    showProxySelector(settings);
                    return;
                } else if (item.value === 'clear_tmdb_cache') { 
                    storageSet(TMDB_CACHE_KEY, {}); notify('Кэш поиска очищен'); return; 
                }
                saveSettings(settings); notify('Настройки сохранены'); openWith({ page: 1 });
            }, onBack: function () { Lampa.Controller.toggle('content'); } });
        }

        function showProxySelector(settings) {
            var items = [
                { title: 'CorsProxy.io (Рекомендуется)', value: 'corsproxy' },
                { title: 'AllOrigins (Резервный)', value: 'allorigins' },
                { title: 'ThingProxy (Резервный 2)', value: 'thingproxy' },
                { title: 'Прямой (Без прокси)', value: 'direct' }
            ];
            Lampa.Select.show({ title: 'Выберите сервер', items: items, onSelect: function(item) {
                settings.proxy_type = item.value;
                saveSettings(settings);
                notify('Прокси изменен');
                openWith({ page: 1 });
            }, onBack: function() { openSettings(); }});
        }

        function load(append) {
            if (loading || ended && append) return;
            loading = true; body.find('.Jutsu-more').remove();
            if (!append) { body.empty(); last = null; }
            body.append('<div class="Jutsu-loader' + (append ? ' Jutsu-loader--more' : '') + '">Загрузка...</div>');
            
            requestAnime(params, function (data) {
                loading = false; body.find('.Jutsu-loader').remove();
                if (!append) body.empty();
                
                if (!data || !data.length) {
                    ended = true;
                    if (!append) body.append('<div class="Jutsu-empty">Ничего не найдено</div>');
                    return;
                }
                
                autoLoading = false;
                if (data.length < PAGE_LIMIT - 5) ended = true; 
                for (var i = 0; i < data.length; i++) appendCard(data[i]);
                if (!ended && !params.search) addMoreButton(); 
                if (window.Lampa && Lampa.Controller) { Lampa.Controller.collectionSet(html); Lampa.Controller.collectionFocus(last || body.find('.selector').first(), html); }
            }, function () {
                autoLoading = false; loading = false; body.find('.Jutsu-loader').remove();
                if (append) addMoreButton(); else body.append('<div class="Jutsu-empty" style="padding:2em; line-height:1.5;">Ошибка сети.<br>Возможно прокси-сервер недоступен или сайт включил жесткую блокировку Cloudflare.<br><br>Попробуйте сменить сервер-прокси в Настройках.</div>');
            });
        }

        function appendCard(item) {
            var card = new Card(item);
            var render = card.render();
            render.data('card', card);
            render.on('hover:focus nav_focus', function () { last = render[0]; scroll.update(render, true); });
            bindPress(render, function () { openAnime(item); });
            body.append(render);
        }

        function addMoreButton() {
            var more = $('<div class="simple-button selector Jutsu-more">Еще</div>');
            more.on('hover:focus nav_focus', function () { last = more[0]; scroll.update(more, true); });
            bindPress(more, function () { loadNextPage(false); }); body.append(more);
        }

        function loadNextPage(auto) {
            if (loading || ended || autoLoading) return;
            autoLoading = !!auto; params.page = (parseInt(params.page, 10) || 1) + 1; load(true);
        }
    }

    function extendFull() {
        if (!window.Lampa || !Lampa.Listener || !Lampa.Listener.follow) return;
        Lampa.Listener.follow('full', function (event) {
            var card;
            if (!event || event.type !== 'complite' || !event.object || !event.object.activity) return;
            card = event.object.activity.card || {};
            
            var page = $('.full-start, .full-start-new').last();
            if (!page.length) page = $('.full').last();
            if (!card || !page.length) return;
            
            if (page.find('.jutsu-full-btn').length) return;

            var title = card.name || card.title || card.original_name || '';
            if (!title) return;

            var line = $('<div class="jutsu-full-extra" style="margin-top:1em;"></div>');
            var linkBtn = $('<div class="simple-button selector jutsu-full-btn" style="background: rgba(30,144,255,0.2); border-color: #1e90ff;">Найти на Jut.su</div>');
            
            linkBtn.on('hover:enter click tap mouseup', function () {
                Lampa.Activity.push({ url: '', title: 'Jut.su', component: 'jutsu', page: 1, search: title, category: '' });
            });
            
            line.append(linkBtn);
            page.find('.full-start__buttons, .full-start-new__buttons').first().after(line);
        });
    }

    function addMenu() {
        var menu = $('.menu .menu__list').eq(0);
        if (!menu.length || $('.menu__item.selector[data-action="jutsu"]').length) return;
        var button = $('<li class="menu__item selector" data-action="jutsu"><div class="menu__ico"><svg viewBox="0 0 44 44" width="44" height="44"><circle cx="22" cy="22" r="19" fill="#1e90ff"/><path d="M25 12h-6v14c0 2.2-1.8 4-4 4h-1v-4h1c0.6 0 1-0.4 1-1V12z" fill="#fff" transform="scale(1.2) translate(-2, -2)"/></svg></div><div class="menu__text">Jut.su</div></li>');
        button.on('hover:enter click tap mouseup', function () {
            Lampa.Activity.push({ url: '', title: 'Jut.su', component: 'jutsu', page: 1, category: SITE_HOST });
        });
        menu.append(button);
    }

    function addStyles() {
        if ($('#jutsu-style').length) return;
        $('body').append('<style id="jutsu-style">' +
            '.Jutsu-module{padding:1.2em 1.5em 2.5em;color:#fff;height:100%;display:flex;flex-direction:column;box-sizing:border-box}' +
            '.Jutsu-module>.scroll{flex:1;overflow:hidden;position:relative;width:100%}' +
            '.Jutsu-module .scroll__body{width:100%}' +
            '.Jutsu-head,.Jutsu-quick{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-flow:row wrap;flex-flow:row wrap;margin-bottom:.75em}' +
            '.Jutsu-head__button,.Jutsu-chip,.Jutsu-more{margin:0 .55em .55em 0;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.08)}' +
            '.Jutsu-head__button.focus,.Jutsu-chip.focus,.Jutsu-more.focus,.jutsu-full-btn.focus{background:#1e90ff;color:#fff;border-color:#1e90ff}' +
            '.Jutsu-chip--active{background:rgba(30,144,255,.28);border-color:rgba(30,144,255,.7)}' +
            '.Jutsu-active{font-size:1.05em;color:rgba(255,255,255,.62);margin:.15em 0 1em;line-height:1.35}' +
            '.Jutsu-active span{color:#1e90ff;font-weight:600}' +
            '.Jutsu-body{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-flow:row wrap;flex-flow:row wrap;align-items:flex-start;justify-content:flex-start;padding:1em .5em}' +
            '.Jutsu.card{flex:0 0 14.285%;max-width:14.285%;padding:0 .6em;box-sizing:border-box;margin:0 0 1.5em 0;position:relative}' +
            '.Jutsu.card.Jutsu--compact{flex:0 0 10%;max-width:10%}' +
            '.Jutsu.card .card__view{background:#1b1d24;border-radius:.35em;overflow:hidden;position:relative;padding-bottom:145%}' +
            '.Jutsu.card .card__img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;background:#22252d}' +
            '.Jutsu.card.focus .card__view{box-shadow:0 0 0 .22em #fff,0 .4em 1.4em rgba(30,144,255,.45)}' +
            '.Jutsu.card .card__title{font-size:1.06em;line-height:1.22;max-height:2.55em;overflow:hidden;margin-top:.55em}' +
            '.Jutsu-loader,.Jutsu-empty{width:100%;text-align:center;font-size:1.2em;color:rgba(255,255,255,.68);padding:2em 0}' +
            '.Jutsu-loader--more{width:100%;font-size:1em;padding:1em 0;color:rgba(255,255,255,.48)}' +
            '.Jutsu-more{height:2.8em;line-height:2.8em;min-width:8em;text-align:center;margin-top:2em}' +
        '</style>');
    }

    function start() {
        if (!window.Lampa || !window.$) return;
        addStyles();
        Lampa.Component.add('jutsu', Catalog);
        extendFull();
        if (window.appready) addMenu();
        else Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') addMenu();
        });
    }

    start();
})();
