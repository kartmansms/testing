/**
 * AnimeVost Plugin for Lampa v1.0.0
 *
 * Интеграция базы данных аниме v13.vost.pw для медиа-центра Lampa.
 * Каталог, поиск, фильтры, карточки с описанием.
 *
 * @author kartmansms
 * @license MIT
 */

(function () {
    'use strict';

    if (window.plugin_animevost_ready) return;
    window.plugin_animevost_ready = true;

    var SETTINGS_KEY = 'animevost_settings_v1';
    var HOST = 'https://v13.vost.pw';

    var genres = [
        { slug: 'boyevyye-iskusstva', name: 'Боевые искусства' },
        { slug: 'voyna', name: 'Война' },
        { slug: 'drama', name: 'Драма' },
        { slug: 'detektiv', name: 'Детектив' },
        { slug: 'istoriya', name: 'История' },
        { slug: 'komediya', name: 'Комедия' },
        { slug: 'mekha', name: 'Меха' },
        { slug: 'mistika', name: 'Мистика' },
        { slug: 'makho-sedze', name: 'Махо-сёдзё' },
        { slug: 'muzykalnyy', name: 'Музыкальный' },
        { slug: 'povsednevnost', name: 'Повседневность' },
        { slug: 'priklyucheniya', name: 'Приключения' },
        { slug: 'parodiya', name: 'Пародия' },
        { slug: 'romantika', name: 'Романтика' },
        { slug: 'senen', name: 'Сёнэн' },
        { slug: 'sedze', name: 'Сёдзё' },
        { slug: 'sport', name: 'Спорт' },
        { slug: 'skazka', name: 'Сказка' },
        { slug: 'sedze-ay', name: 'Сёдзё-ай' },
        { slug: 'senen-ay', name: 'Сёнэн-ай' },
        { slug: 'samurai', name: 'Самураи' },
        { slug: 'triller', name: 'Триллер' },
        { slug: 'uzhasy', name: 'Ужасы' },
        { slug: 'fantastika', name: 'Фантастика' },
        { slug: 'fentezi', name: 'Фэнтези' },
        { slug: 'shkola', name: 'Школа' },
        { slug: 'etti', name: 'Этти' }
    ];

    var types = [
        { slug: 'tv', name: 'ТВ' },
        { slug: 'tv-speshl', name: 'ТВ-спэшл' },
        { slug: 'ova', name: 'OVA' },
        { slug: 'ona', name: 'ONA' },
        { slug: 'polnometrazhnyy-film', name: 'Полнометражный фильм' },
        { slug: 'korotkometrazhnyy-film', name: 'Короткометражный фильм' },
        { slug: 'dunkhua', name: 'Дунхуа' }
    ];

    var years = [];
    for (var y = 2026; y >= 1971; y--) years.push(y);

    function defaults() {
        return { card_size: 'normal' };
    }

    function storageGet(key, fallback) {
        try {
            if (window.Lampa && Lampa.Storage && Lampa.Storage.get) {
                var v = Lampa.Storage.get(key, fallback);
                return v === undefined || v === null ? fallback : v;
            }
        } catch (e) {}
        try {
            var raw = localStorage.getItem(key);
            if (raw) { try { return JSON.parse(raw); } catch (e) { return fallback; } }
            return fallback;
        } catch (err) { return fallback; }
    }

    function storageSet(key, value) {
        try {
            if (window.Lampa && Lampa.Storage && Lampa.Storage.set) { Lampa.Storage.set(key, value); return; }
        } catch (e) {}
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) {}
    }

    function readSettings() {
        var base = defaults();
        var saved = storageGet(SETTINGS_KEY, {});
        if (!saved || typeof saved !== 'object') saved = {};
        for (var k in saved) { if (saved.hasOwnProperty(k)) base[k] = saved[k]; }
        return base;
    }

    function notify(msg) {
        if (window.Lampa && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(msg);
        else if (window.console) console.log('[AnimeVost]', msg);
    }

    function esc(v) {
        v = v === undefined || v === null ? '' : String(v);
        return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function stripHtml(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        return (tmp.textContent || tmp.innerText || '').trim();
    }

    // ─── Network ────────────────────────────────────────────────────

    var CORS_PROXIES = [
        '',
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url='
    ];
    var proxyIndex = 0;

    function fetchPage(url, callback) {
        var called = false;
        function done(data) {
            if (called) return;
            called = true;
            callback(data || '');
        }

        var attempts = CORS_PROXIES.length;
        var attempt = 0;

        function tryNext() {
            if (attempt >= attempts) {
                console.log('[AnimeVost] All fetch attempts failed for', url);
                done('');
                return;
            }

            var proxy = CORS_PROXIES[attempt];
            var fullUrl = proxy ? proxy + encodeURIComponent(url) : url;
            attempt++;

            console.log('[AnimeVost] Attempt', attempt, 'fetching:', fullUrl);

            try {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', fullUrl, true);
                xhr.timeout = 12000;
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status >= 200 && xhr.status < 400 && xhr.responseText && xhr.responseText.length > 500) {
                            console.log('[AnimeVost] Success with attempt', attempt, 'length:', xhr.responseText.length);
                            done(xhr.responseText);
                        } else {
                            console.log('[AnimeVost] Attempt', attempt, 'failed:', xhr.status, xhr.responseText ? xhr.responseText.length : 0);
                            tryNext();
                        }
                    }
                };
                xhr.onerror = function () {
                    console.log('[AnimeVost] Attempt', attempt, 'network error');
                    tryNext();
                };
                xhr.ontimeout = function () {
                    console.log('[AnimeVost] Attempt', attempt, 'timeout');
                    tryNext();
                };
                xhr.send();
            } catch (e) {
                console.log('[AnimeVost] Attempt', attempt, 'exception:', e.message);
                tryNext();
            }
        }

        tryNext();
    }

    // ─── HTML Parsing (regex-based) ─────────────────────────────────

    function rxOne(html, pattern) {
        var m = html.match(pattern);
        return m ? m[1].trim() : '';
    }

    function parseShortStoryFromHtml(blockHtml) {
        var item = {};
        var titleM = blockHtml.match(/<h2>\s*<a href="([^"]+)">([\s\S]*?)<\/a>/);
        if (!titleM) return null;

        item.url = titleM[1];
        item.title = stripHtml(titleM[2]);
        var idM = item.url.match(/\/(\d+)-/);
        item.id = idM ? parseInt(idM[1], 10) : 0;

        var posterM = blockHtml.match(/<img class="imgRadius" src="([^"]+)"/);
        item.poster = posterM ? posterM[1] : '';
        if (item.poster && item.poster.indexOf('http') !== 0) {
            item.poster = HOST + (item.poster.indexOf('/') === 0 ? '' : '/') + item.poster;
        }

        var engM = blockHtml.match(/<h4>([\s\S]*?)<\/h4>/);
        item.original_title = engM ? stripHtml(engM[1]) : '';

        item.year = parseInt(rxOne(blockHtml, /Год выхода:\s*<\/strong>\s*(\d{4})/), 10) || 0;

        var genreRaw = rxOne(blockHtml, /Жанр:\s*<\/strong>\s*([^<]+)/);
        item.genres = genreRaw ? genreRaw.split(',').map(function (g) { return g.trim(); }) : [];

        item.type = rxOne(blockHtml, /Тип:\s*<\/strong>\s*([^<]+)/);
        item.episodes = rxOne(blockHtml, /Количество серий:\s*<\/strong>\s*([^<]+)/);

        var ratingM = blockHtml.match(/width:(\d+)%/);
        item.rating = ratingM ? parseInt(ratingM[1], 10) : 0;

        var votesM = blockHtml.match(/vote-num-id-\d+">(\d+)/);
        item.votes = votesM ? parseInt(votesM[1], 10) : 0;

        var descM = blockHtml.match(/Описание:\s*<\/strong>\s*([\s\S]*?)<\/p>/);
        item.description = descM ? stripHtml(descM[1]) : '';

        return item;
    }

    function parseListPage(html) {
        if (!html) return { items: [], pages: 1, current: 1 };

        var items = [];
        var parts = html.split('<div class="shortstory">');
        for (var i = 1; i < parts.length; i++) {
            var item = parseShortStoryFromHtml(parts[i]);
            if (item) items.push(item);
        }

        var pages = 1, current = 1;
        var navM = html.match(/class="block_4">([\s\S]*?)<\/td>/);
        if (navM) {
            var nums = [];
            var allNums = navM[1].match(/(\d+)/g);
            if (allNums) {
                for (var n = 0; n < allNums.length; n++) nums.push(parseInt(allNums[n], 10));
            }
            if (nums.length) {
                current = nums[0];
                pages = Math.max.apply(null, nums);
            }
        }

        return { items: items, pages: pages, current: current };
    }

    function parseDetailPage(html) {
        if (!html) return null;
        var item = {};

        var titleM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        item.title = titleM ? stripHtml(titleM[1]).replace(/\s+/g, ' ').trim() : '';
        if (!item.title) {
            var pageTitleM = html.match(/<title>([\s\S]*?)<\/title>/);
            if (pageTitleM) {
                item.title = stripHtml(pageTitleM[1]).replace(/\s*».*/g, '').trim();
            }
        }

        var posterM = html.match(/<img class="imgRadius" src="([^"]+)"/);
        item.poster = posterM ? posterM[1] : '';
        if (item.poster && item.poster.indexOf('http') !== 0) {
            item.poster = HOST + (item.poster.indexOf('/') === 0 ? '' : '/') + item.poster;
        }

        var engM = html.match(/<h4>([\s\S]*?)<\/h4>/);
        item.original_title = engM ? stripHtml(engM[1]) : '';
        if (!item.original_title) {
            var engAlt = html.match(/itemprop="name"[^>]*>([^<]+)<\/span/);
            if (engAlt) item.original_title = engAlt[1].trim();
        }

        item.year = parseInt(rxOne(html, /Год выхода:\s*<\/strong>\s*(\d{4})/), 10) || 0;

        var genreRaw = rxOne(html, /Жанр:\s*<\/strong>\s*([^<]+)/);
        item.genres = genreRaw ? genreRaw.split(',').map(function (g) { return g.trim(); }) : [];

        item.type = rxOne(html, /Тип:\s*<\/strong>\s*([^<]+)/);
        item.episodes = rxOne(html, /Количество серий:\s*<\/strong>\s*([^<]+)/);
        item.director = rxOne(html, /Режиссёр:\s*<\/strong>\s*(?:<a[^>]*>)?([^<]+)/);

        var ratingM = html.match(/width:(\d+)%/);
        item.rating = ratingM ? parseInt(ratingM[1], 10) : 0;

        var votesM = html.match(/vote-num-id-\d+">(\d+)/);
        item.votes = votesM ? parseInt(votesM[1], 10) : 0;

        var descM = html.match(/itemprop="description">([\s\S]*?)<\/span>/);
        if (!descM) descM = html.match(/Описание:\s*<\/strong>\s*([\s\S]*?)(?:<\/p>|<\/div>)/);
        item.description = descM ? stripHtml(descM[1]) : '';

        return item;
    }

    // ─── URL Builder ────────────────────────────────────────────────

    function buildListUrl(params) {
        var page = params.page || 1;
        var url = HOST + '/';

        if (params.genre) url = HOST + '/zhanr/' + params.genre + '/';
        else if (params.type) url = HOST + '/tip/' + params.type + '/';
        else if (params.year) url = HOST + '/god/' + params.year + '/';
        else if (params.ongoing) url = HOST + '/ongoing/';
        else if (params.preview) url = HOST + '/preview/';
        else if (params.search) {
            url = HOST + '/index.php?do=search&subaction=search&story=' + encodeURIComponent(params.search);
            if (page > 1) url += '&start=' + ((page - 1) * 20 + 1);
            return url;
        }

        if (page > 1) url += 'page/' + page + '/';
        return url;
    }

    // ─── Card HTML ──────────────────────────────────────────────────

    var NO_POSTER = 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">' +
        '<rect fill="%23333" width="200" height="280"/>' +
        '<text fill="%23888" font-family="Arial" font-size="14" text-anchor="middle" x="100" y="140">Нет постера</text></svg>'
    );

    function cardHtml(item) {
        var poster = item.poster || NO_POSTER;
        var r = item.rating || 0;
        var rc = r >= 80 ? '#4caf50' : r >= 60 ? '#ff9800' : r >= 40 ? '#f44336' : '#888';
        var badge = item.type ? '<div class="AnimeVost-card__badge">' + esc(item.type) + '</div>' : '';

        return '<div class="AnimeVost card selector" data-url="' + esc(item.url) + '">' +
            '<div class="card__view">' +
            '<img class="card__img" src="' + esc(poster) + '" onerror="this.onerror=null;this.src=\'' + NO_POSTER + '\'" />' +
            badge +
            '<div class="AnimeVost-card__rating" style="color:' + rc + '">' + r + '</div>' +
            '</div>' +
            '<div class="card__title">' + esc(item.title) + '</div>' +
            '<div class="Shikimori-card__meta">' +
            (item.year ? item.year + ' · ' : '') +
            esc(item.episodes || '') +
            '</div></div>';
    }

    // ─── Styles ─────────────────────────────────────────────────────

    function addStyles() {
        if ($('#animevost-style').length) return;
        $('body').append(
            '<style id="animevost-style">' +
            '.AnimeVost-module{padding:1.2em 1.5em 2.5em;color:#fff;height:100%;display:flex;flex-direction:column;box-sizing:border-box}' +
            '.AnimeVost-module>.scroll{flex:1;overflow:hidden;position:relative;width:100%}' +
            '.AnimeVost-module .scroll__body{width:100%}' +
            '.AnimeVost-head{display:flex;flex-wrap:wrap;margin-bottom:0.8em;gap:0.3em}' +
            '.AnimeVost-quick{display:flex;flex-wrap:wrap;margin-bottom:0.8em;gap:0.25em}' +
            '.AnimeVost-head__button,.AnimeVost-chip{' +
            'display:inline-flex!important;align-items:center!important;justify-content:center!important;' +
            'padding:0.65em 1.2em!important;height:auto!important;line-height:1!important;' +
            'background:rgba(255,255,255,0.06)!important;border:1px solid rgba(255,255,255,0.04)!important;' +
            'color:rgba(255,255,255,0.85);font-size:0.95em;font-weight:500;margin:0 0.3em 0.3em 0!important;' +
            'transition:all 0.2s ease-in-out;border-radius:0.5em!important;outline:none!important;box-shadow:none!important}' +
            '.AnimeVost-chip{border-radius:1.5em!important;padding:0.5em 1.2em!important;font-size:0.88em;opacity:0.85}' +
            '.AnimeVost-head__button.focus,.AnimeVost-chip.focus{' +
            'background:#c83a4b!important;color:#fff!important;border-color:#e95a68!important;transform:scale(1.05);' +
            'box-shadow:0 0.4em 1.2em rgba(200,58,75,0.35)!important}' +
            '.AnimeVost-chip--active{background:rgba(200,58,75,0.22)!important;border-color:rgba(200,58,75,0.55)!important;color:#ff8e9b!important;opacity:1}' +
            '.AnimeVost-active{font-size:1.05em;color:rgba(255,255,255,.62);margin:.15em 0 1em;line-height:1.35}' +
            '.AnimeVost-active span{color:#e95a68;font-weight:600}' +
            '.AnimeVost-body{display:flex;flex-flow:row wrap;align-items:flex-start;justify-content:flex-start;padding:1em .5em}' +
            '.AnimeVost.card{flex:0 0 14.285%;max-width:14.285%;padding:0 .6em;box-sizing:border-box;margin:0 0 1.5em 0;position:relative}' +
            '.AnimeVost-loader,.AnimeVost-empty{width:100%;text-align:center;font-size:1.2em;color:rgba(255,255,255,.68);padding:2em 0}' +
            '.AnimeVost-more{height:2.8em;line-height:2.8em;min-width:8em;text-align:center;margin-top:2em}' +
            '.AnimeVost-detail{padding:1.2em 1.5em;color:#fff;max-width:900px;margin:0 auto}' +
            '.AnimeVost-det-head{display:flex;gap:1.2em;margin-bottom:1.2em}' +
            '.AnimeVost-det-poster{width:180px;min-width:180px;border-radius:.5em;overflow:hidden}' +
            '.AnimeVost-det-poster img{width:100%;display:block}' +
            '.AnimeVost-det-info{flex:1}' +
            '.AnimeVost-det-title{font-size:1.6em;font-weight:700;color:#eee;margin-bottom:.3em}' +
            '.AnimeVost-det-orig{font-size:1.1em;color:#888;margin-bottom:.7em}' +
            '.AnimeVost-det-meta{font-size:.95em;color:#aaa;line-height:1.8}' +
            '.AnimeVost-det-meta strong{color:#ccc}' +
            '.AnimeVost-det-desc{margin-top:1em;font-size:1em;color:#bbb;line-height:1.6}' +
            '.AnimeVost-det-rating{display:inline-flex;align-items:center;gap:.4em;background:rgba(255,255,255,.08);border-radius:.4em;padding:.3em .7em;margin-top:.7em}' +
            '.AnimeVost-det-rating .rv{font-size:1.3em;font-weight:700;color:#e8a000}' +
            '.AnimeVost-det-rating .rvc{font-size:.85em;color:#888}' +
            '.AnimeVost-back{background:rgba(255,255,255,.06);color:#ccc;border:1px solid rgba(255,255,255,.08);border-radius:.4em;padding:.5em 1em;cursor:pointer;font-size:.95em;margin-bottom:1em;display:inline-block}' +
            '.AnimeVost-back:hover{background:rgba(200,58,75,.3);color:#fff}' +
            '.AnimeVost-search-input{width:100%;padding:.7em;font-size:1.1em;background:rgba(255,255,255,.06);color:#eee;border:1px solid rgba(255,255,255,.1);border-radius:.4em;outline:none;box-sizing:border-box}' +
            '.AnimeVost-search-input:focus{border-color:#e8a000}' +
            '.AnimeVost-search-go{margin-top:.5em;background:#e8a000;color:#fff;border:none;border-radius:.4em;padding:.6em 1.2em;cursor:pointer;font-size:1em}' +
            '.AnimeVost-card__rating,.AnimeVost-card__badge{position:absolute;top:.45em;padding:.25em .45em;border-radius:.25em;background:rgba(10,12,16,.82);font-size:.82em;line-height:1;color:#fff}' +
            '.AnimeVost-card__rating{left:.45em;color:#ffd166}' +
            '.AnimeVost-card__badge{right:.45em;color:#fff;background:rgba(232,160,0,.88)}' +
            '.AnimeVost.card .card__view{background:#1b1d24;border-radius:.35em;overflow:hidden;position:relative;padding-bottom:145%}' +
            '.AnimeVost.card .card__img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block;background:#22252d}' +
            '.AnimeVost.card.focus .card__view{box-shadow:0 0 0 .22em #fff,0 .4em 1.4em rgba(232,160,0,.45)}' +
            '.AnimeVost.card .card__title{font-size:1.06em;line-height:1.22;max-height:2.55em;overflow:hidden;margin-top:.55em}' +
            '.AnimeVost-card__meta{font-size:.88em;line-height:1.25;color:rgba(255,255,255,.52);height:2.35em;overflow:hidden;margin-top:.25em}' +
            '</style>'
        );
    }

    // ─── Catalog Component ──────────────────────────────────────────

    function Catalog(object) {
        var params = object || {};
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });

        var html = $('<div class="AnimeVost-module"></div>');
        var head = $('<div class="AnimeVost-head"></div>');
        var quick = $('<div class="AnimeVost-quick"></div>');
        var body = $('<div class="AnimeVost-body"></div>');

        var last;
        var rendered = false;
        var loading = false;
        var curPage = parseInt(params.page, 10) || 1;
        var totPages = 1;
        var curParams = {};
        var searchMode = false;

        this.render = function () {
            if (!rendered) {
                rendered = true;
                html.append(head).append(quick).append(scroll.render());
                scroll.append(body);
                scroll.minus();

                scroll.onWheel = function (step) {
                    var ec = Lampa.Controller.enabled && Lampa.Controller.enabled();
                    if (ec && ec.name !== 'content') Lampa.Controller.toggle('content');
                    if (step > 0) Navigator.move('down');
                    else Navigator.move('up');
                };

                scroll.onEnd = function () {
                    if (!loading && curPage < totPages) {
                        curPage++;
                        load(false);
                    }
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
                    var target = last || html.find('.selector').first();
                    Lampa.Controller.collectionFocus(target, html);
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
                },
                enter: function () {
                    var focused = html.find('.selector.focus');
                    if (focused.length) {
                        var action = focused.data('action');
                        if (typeof action === 'function') action();
                    }
                }
            });

            Lampa.Controller.toggle('content');
        };

        this.destroy = function () {
            scroll.destroy();
            body.empty();
        };

        function showChips(list, paramKey) {
            quick.empty();
            list.forEach(function (item) {
                var label = item.name || String(item);
                var val = item.slug || item;
                var chip = $('<div class="AnimeVost-chip selector"></div>').text(label);
                chip.on('hover:enter click tap', function () {
                    curParams = {};
                    curParams[paramKey] = val;
                    searchMode = false;
                    curPage = 1;
                    load(true);
                });
                quick.append(chip);
            });
        }

        function clearChips() {
            quick.empty();
        }

        function loadSection(params, reset) {
            curParams = params || {};
            searchMode = false;
            curPage = 1;
            clearChips();
            load(reset !== false);
        }

        function buildHeader() {
            head.empty();
            quick.empty();

            var buttons = [
                { label: 'Главная', action: function () { loadSection({}); } },
                { label: 'Жанр', action: function () { showChips(genres, 'genre'); } },
                { label: 'Категории', action: function () { showChips(types, 'type'); } },
                { label: 'Год', action: function () {
                    var yearList = years.map(function (y) { return { name: String(y), slug: y }; });
                    showChips(yearList, 'year');
                }},
                { label: 'Онгоинги', action: function () { loadSection({ ongoing: true }); } },
                { label: 'Анонсы', action: function () { loadSection({ preview: true }); } },
                { label: 'Поиск', action: function () { showSearch(); } }
            ];

            buttons.forEach(function (b) {
                var el = $('<div class="AnimeVost-head__button selector"></div>').text(b.label);
                el.on('hover:enter click tap', b.action);
                head.append(el);
            });
        }

        function showSearch() {
            body.empty();
            searchMode = true;

            var wrap = $('<div style="width:100%;padding:0 .5em"></div>');
            var inp = $('<input class="AnimeVost-search-input" type="text" placeholder="Поиск аниме..." />');
            var btn = $('<div class="AnimeVost-search-go selector">Найти</div>');

            btn.on('hover:enter click tap', function () {
                var q = inp.val().trim();
                if (!q) return;
                curParams = { search: q };
                curPage = 1;
                load(true);
            });

            inp.on('keydown', function (e) {
                if (e.keyCode === 13) btn.trigger('hover:enter');
            });

            wrap.append(inp).append(btn);
            body.append(wrap);

            setTimeout(function () { inp.focus(); }, 100);
        }

        function load(reset) {
            if (loading) return;
            loading = true;

            if (reset) {
                body.empty();
                last = null;
            }

            var loader = $('<div class="AnimeVost-loader">Загрузка...</div>');
            body.append(loader);

            var p = {};
            for (var k in curParams) { if (curParams.hasOwnProperty(k)) p[k] = curParams[k]; }
            p.page = curPage;

            var listUrl = buildListUrl(p);
            console.log('[AnimeVost] Fetching:', listUrl);

            fetchPage(listUrl, function (html_data) {
                loading = false;
                loader.remove();

                console.log('[AnimeVost] Response length:', html_data ? html_data.length : 0);
                if (html_data) {
                    var storyCount = (html_data.match(/<div class="shortstory">/g) || []).length;
                    console.log('[AnimeVost] shortstory blocks found:', storyCount);
                }

                var result = parseListPage(html_data);
                totPages = result.pages;
                console.log('[AnimeVost] Parsed items:', result.items.length, 'Pages:', result.pages);

                if (!result.items.length && !body.children().length) {
                    body.append('<div class="AnimeVost-empty">Ничего не найдено</div>');
                    return;
                }

                result.items.forEach(function (item) {
                    var card = $(cardHtml(item));
                    card.data('action', function () {
                        openDetail(item.url);
                    });
                    card.on('hover:enter click tap', function () {
                        openDetail(item.url);
                    });
                    body.append(card);
                    last = card[0];
                });

                if (curPage < totPages) {
                    var more = $('<div class="AnimeVost-more selector">Ещё...</div>');
                    more.on('hover:enter click tap', function () {
                        curPage++;
                        load(false);
                    });
                    body.append(more);
                }
            });
        }

        function openDetail(itemUrl) {
            Lampa.Activity.push({
                url: itemUrl,
                title: 'AnimeVost',
                component: 'animevost_detail',
                animevost_url: itemUrl
            });
        }
    }

    // ─── Detail Component ───────────────────────────────────────────

    function DetailComponent(object) {
        var params = object || {};
        var html = $('<div class="AnimeVost-detail"></div>');
        var rendered = false;

        this.render = function () {
            if (!rendered) {
                rendered = true;
                html.html('<div class="AnimeVost-loader">Загрузка...</div>');
                loadDetail();
            }
            return html;
        };

        this.create = this.render;

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(html);
                    var target = html.find('.selector').first();
                    Lampa.Controller.collectionFocus(target, html);
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
                },
                enter: function () {
                    var focused = html.find('.selector.focus');
                    if (focused.length) {
                        var action = focused.data('action');
                        if (typeof action === 'function') action();
                    }
                }
            });

            Lampa.Controller.toggle('content');
        };

        this.destroy = function () { html.empty(); };

        function loadDetail() {
            var url = params.url || params.animevost_url || '';
            if (!url) { html.html('<div class="AnimeVost-empty">Нет данных</div>'); return; }
            if (url.indexOf('http') !== 0) url = HOST + url;

            console.log('[AnimeVost] Detail loading:', url);

            fetchPage(url, function (raw) {
                console.log('[AnimeVost] Detail response length:', raw ? raw.length : 0);
                if (!raw || raw.length < 200) {
                    html.html('<div class="AnimeVost-empty">Не удалось загрузить</div>');
                    return;
                }

                var item = parseDetailPage(raw);
                console.log('[AnimeVost] Detail parsed:', item ? item.title : 'null');
                if (!item || !item.title) {
                    html.html('<div class="AnimeVost-empty">Не удалось загрузить</div>');
                    return;
                }

                var rc = item.rating >= 80 ? '#4caf50' : item.rating >= 60 ? '#ff9800' : item.rating >= 40 ? '#f44336' : '#888';
                var gn = item.genres.length ? item.genres.join(', ') : '';

                var h = '<div class="AnimeVost-det-head">';
                h += '<div class="AnimeVost-det-poster"><img src="' + esc(item.poster || NO_POSTER) + '" onerror="this.onerror=null;this.src=\'' + NO_POSTER + '\'" /></div>';
                h += '<div class="AnimeVost-det-info">';
                h += '<div class="AnimeVost-det-title">' + esc(item.title) + '</div>';
                if (item.original_title) h += '<div class="AnimeVost-det-orig">' + esc(item.original_title) + '</div>';
                h += '<div class="AnimeVost-det-meta">';
                if (item.year) h += '<div><strong>Год:</strong> ' + item.year + '</div>';
                if (item.type) h += '<div><strong>Тип:</strong> ' + esc(item.type) + '</div>';
                if (gn) h += '<div><strong>Жанры:</strong> ' + esc(gn) + '</div>';
                if (item.episodes) h += '<div><strong>Серии:</strong> ' + esc(item.episodes) + '</div>';
                if (item.director) h += '<div><strong>Режиссёр:</strong> ' + esc(item.director) + '</div>';
                h += '</div>';
                if (item.rating) {
                    h += '<div class="AnimeVost-det-rating"><span class="rv" style="color:' + rc + '">' + item.rating + '%</span>';
                    if (item.votes) h += '<span class="rvc">(' + item.votes + ' голосов)</span>';
                    h += '</div>';
                }
                h += '</div></div>';
                if (item.description) h += '<div class="AnimeVost-det-desc">' + esc(item.description) + '</div>';

                var siteBtn = $('<div class="AnimeVost-back selector">Открыть на сайте</div>');
                siteBtn.data('action', function () { window.open(url, '_blank'); });
                siteBtn.on('hover:enter click tap', function () { window.open(url, '_blank'); });

                html.html(h);
                html.append(siteBtn);
            });
        }
    }

    // ─── Registration ───────────────────────────────────────────────

    function addMenu() {
        var menu = $('.menu .menu__list').eq(0);
        if (!menu.length || $('.menu__item.selector[data-action="animevost"]').length) return;

        var button = $(
            '<li class="menu__item selector" data-action="animevost">' +
                '<div class="menu__ico">' +
                    '<svg viewBox="0 0 24 24" width="44" height="44" fill="#e8a000" xmlns="http://www.w3.org/2000/svg">' +
                        '<path d="M12 2L2 7l10 5 10-5-10-5z"/>' +
                        '<path d="M2 17l10 5 10-5"/>' +
                        '<path d="M2 12l10 5 10-5"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="menu__text">AnimeVost</div>' +
            '</li>'
        );

        button.on('hover:enter click tap mouseup', function () {
            Lampa.Activity.push({
                url: '',
                title: 'AnimeVost',
                component: 'animevost',
                page: 1
            });
        });

        menu.append(button);
    }

    function start() {
        if (!window.Lampa || !window.$) return;

        addStyles();

        Lampa.Component.add('animevost', Catalog);
        Lampa.Component.add('animevost_detail', DetailComponent);

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
