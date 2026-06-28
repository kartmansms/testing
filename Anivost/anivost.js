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

    function fetchPage(url, callback) {
        if (window.Lampa && Lampa.Network) {
            var net = new Lampa.Reguest();
            net.timeout(20000);
            net.native(url, function (data) {
                callback(data || '');
            }, function () {
                net.clear();
                callback('');
            }, false, { dataType: 'text' });
        } else {
            fetchWithXHR(url, callback);
        }
    }

    function fetchWithXHR(url, callback) {
        var called = false;
        function done(data) {
            if (called) return;
            called = true;
            callback(data || '');
        }

        var CORS_PROXIES = [
            '',
            'https://corsproxy.io/?',
            'https://api.allorigins.win/raw?url='
        ];
        var attempt = 0;

        function tryNext() {
            if (attempt >= CORS_PROXIES.length) {
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
                xhr.timeout = 20000;
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status >= 200 && xhr.status < 400 && xhr.responseText && xhr.responseText.length > 100) {
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

        return '<div class="AnimeVost card selector" data-url="' + esc(item.url) + '" data-title="' + esc(item.title) + '">' +
            '<div class="card__view">' +
            '<img class="card__img" src="' + esc(poster) + '" onerror="this.onerror=null;this.src=\'' + NO_POSTER + '\'" />' +
            badge +
            '<div class="AnimeVost-card__rating" style="color:' + rc + '">' + r + '</div>' +
            '</div>' +
            '<div class="card__title">' + esc(item.title) + '</div>' +
            '<div class="AnimeVost-card__meta">' +
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
            '.AnimeVost-detail{padding:2em 3em;color:#fff;max-width:1100px;margin:0 auto}' +
            '.AnimeVost-det-wrap{display:flex;gap:2em;margin-bottom:1.5em}' +
            '.AnimeVost-det-poster{width:220px;min-width:220px;flex-shrink:0;border-radius:.6em;overflow:hidden;box-shadow:0 .5em 2em rgba(0,0,0,.5)}' +
            '.AnimeVost-det-poster img{width:100%;height:auto;display:block}' +
            '.AnimeVost-det-info{flex:1;display:flex;flex-direction:column;justify-content:flex-start}' +
            '.AnimeVost-det-year{font-size:1em;color:rgba(255,255,255,.6);margin-bottom:.3em}' +
            '.AnimeVost-det-title{font-size:2.2em;font-weight:700;color:#fff;line-height:1.15;margin-bottom:.4em}' +
            '.AnimeVost-det-orig{font-size:1.1em;color:rgba(255,255,255,.45);margin-bottom:.6em}' +
            '.AnimeVost-det-badges{display:flex;gap:.5em;margin-bottom:.6em;flex-wrap:wrap}' +
            '.AnimeVost-det-badge{display:inline-flex;align-items:center;gap:.3em;padding:.3em .7em;border-radius:.3em;font-size:.88em;font-weight:600}' +
            '.AnimeVost-det-badge--rating{background:rgba(255,255,255,.1);color:#fff}' +
            '.AnimeVost-det-badge--rating span{color:#e8a000;font-size:1.05em}' +
            '.AnimeVost-det-badge--status{background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.12)}' +
            '.AnimeVost-det-meta-line{font-size:.95em;color:rgba(255,255,255,.55);margin-bottom:1em;line-height:1.6}' +
            '.AnimeVost-det-meta-line span{color:rgba(255,255,255,.8)}' +
            '.AnimeVost-det-actions{display:flex;gap:.7em;margin-bottom:1.5em;flex-wrap:wrap}' +
            '.AnimeVost-det-actions .selector{display:inline-flex;align-items:center;justify-content:center;width:3em;height:3em;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.06);border-radius:50%;color:rgba(255,255,255,.8);cursor:pointer;transition:all .2s}' +
            '.AnimeVost-det-actions .selector.focus{background:rgba(255,255,255,.2);color:#fff;border-color:rgba(255,255,255,.25);transform:scale(1.1);box-shadow:0 0 1.2em rgba(255,255,255,.15)}' +
            '.AnimeVost-det-actions .selector svg{width:1.4em;height:1.4em;fill:currentColor}' +
            '.AnimeVost-det-actions .selector--text{width:auto;border-radius:2em;padding:0 1.2em;gap:.4em;font-size:.85em}' +
            '.AnimeVost-det-scroll{padding:0 0 1em}' +
            '.AnimeVost-det-desc-title{font-size:1.15em;font-weight:600;color:#eee;margin:0 0 .4em}' +
            '.AnimeVost-det-desc{font-size:1em;color:rgba(255,255,255,.65);line-height:1.65}' +
            '.AnimeVost-det-episodes{margin-top:1.5em}' +
            '.AnimeVost-det-episodes__title{font-size:1.1em;color:#eee;margin-bottom:.5em}' +
            '.AnimeVost-det-ep-list{display:flex;flex-wrap:wrap;gap:.4em}' +
            '.AnimeVost-det-ep-item{padding:.4em .8em;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.04);border-radius:.3em;color:rgba(255,255,255,.6);font-size:.88em;cursor:pointer;transition:all .15s}' +
            '.AnimeVost-det-ep-item:hover,.AnimeVost-det-ep-item.focus{background:rgba(232,160,0,.2);color:#e8a000;border-color:rgba(232,160,0,.3)}' +
            '.AnimeVost-card__rating,.AnimeVost-card__badge{position:absolute;top:.45em;padding:.25em .45em;border-radius:.25em;background:rgba(10,12,16,.82);font-size:.82em;line-height:1;color:#fff}' +
            '.AnimeVost-card__rating{left:.45em;color:#ffd166}' +
            '.AnimeVost-card__badge{right:.45em;color:#fff;background:rgba(232,160,0,.88)}' +
            '.AnimeVost.card .card__view{background:#1b1d24;border-radius:.35em;overflow:hidden;position:relative;padding-bottom:145%}' +
            '.AnimeVost.card .card__img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block;background:#22252d}' +
            '.AnimeVost.card.focus .card__view{box-shadow:0 0 0 .22em #fff,0 .4em 1.4em rgba(232,160,0,.45)}' +
            '.AnimeVost.card .card__title{font-size:1.06em;line-height:1.22;max-height:2.55em;overflow:hidden;margin-top:.55em}' +
            '.AnimeVost-card__meta{font-size:.88em;line-height:1.25;color:rgba(255,255,255,.52);height:2.35em;overflow:hidden;margin-top:.25em}' +
            '.AnimeVost-det-actions{display:flex;gap:.5em;margin:1em 0;flex-wrap:wrap}' +
            '.AnimeVost-det-actions .selector{display:inline-flex;align-items:center;justify-content:center;gap:.4em;padding:.65em 1.2em;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.06);border-radius:2em;color:#ccc;font-size:.92em;cursor:pointer;transition:all .2s;min-width:3em}' +
            '.AnimeVost-det-actions .selector.focus{background:#e8a000;color:#fff;border-color:#e8a000;transform:scale(1.05);box-shadow:0 0 1em rgba(232,160,0,.4)}' +
            '.AnimeVost-det-actions .selector svg{width:1.2em;height:1.2em;fill:currentColor;flex-shrink:0}' +
            '.AnimeVost-det-episodes{margin-top:1em}' +
            '.AnimeVost-det-episodes__title{font-size:1.1em;color:#eee;margin-bottom:.5em}' +
            '.AnimeVost-det-ep-list{display:flex;flex-wrap:wrap;gap:.4em}' +
            '.AnimeVost-det-ep-item{padding:.4em .8em;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.04);border-radius:.3em;color:#aaa;font-size:.88em;cursor:pointer;transition:all .15s}' +
            '.AnimeVost-det-ep-item:hover,.AnimeVost-det-ep-item.focus{background:rgba(232,160,0,.2);color:#e8a000;border-color:rgba(232,160,0,.3)}' +
            '.AnimeVost-det-desc-title{font-size:1.15em;font-weight:600;color:#eee;margin:1.2em 0 .4em}' +
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
                    var focused = html.find('.focus');
                    if (!focused.length) return;
                    focused.trigger('hover:enter');
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
            if (window.Lampa && Lampa.Input) {
                Lampa.Input({
                    title: 'Поиск аниме',
                    value: '',
                    placeholder: 'Введите название...',
                    onSubmit: function (query) {
                        query = (query || '').trim();
                        if (!query) return;
                        curParams = { search: query };
                        curPage = 1;
                        searchMode = true;
                        clearChips();
                        load(true);
                    }
                });
            } else {
                var q = prompt('Поиск аниме:');
                if (q && q.trim()) {
                    curParams = { search: q.trim() };
                    curPage = 1;
                    searchMode = true;
                    clearChips();
                    load(true);
                }
            }
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

            var pagesToLoad = reset ? 3 : 1;
            var loadedItems = [];
            var loadedPages = 0;
            var loadedTotal = 1;

            function fetchPageNum(pageNum) {
                var p = {};
                for (var k in curParams) { if (curParams.hasOwnProperty(k)) p[k] = curParams[k]; }
                p.page = pageNum;

                var listUrl = buildListUrl(p);
                console.log('[AnimeVost] Fetching page', pageNum, ':', listUrl);

                fetchPage(listUrl, function (html_data) {
                    loadedPages++;

                    if (html_data) {
                        var storyCount = (html_data.match(/<div class="shortstory">/g) || []).length;
                        console.log('[AnimeVost] Page', pageNum, 'shortstory blocks:', storyCount);
                    }

                    var result = parseListPage(html_data);
                    if (pageNum === 1) loadedTotal = result.pages;
                    console.log('[AnimeVost] Page', pageNum, 'items:', result.items.length, 'total pages:', result.pages);

                    loadedItems = loadedItems.concat(result.items);

                    if (loadedPages < pagesToLoad && pageNum < loadedTotal) {
                        fetchPageNum(pageNum + 1);
                    } else {
                        finishLoad(result);
                    }
                });
            }

            function finishLoad(result) {
                loading = false;
                loader.remove();
                totPages = loadedTotal;

                console.log('[AnimeVost] Total loaded:', loadedItems.length, 'items');

                if (!loadedItems.length && !body.children().length) {
                    body.append('<div class="AnimeVost-empty">Ничего не найдено</div>');
                    return;
                }

                loadedItems.forEach(function (item) {
                    var card = $(cardHtml(item));

                    card.on('hover:enter click tap', function () {
                        openDetail(item.url, item);
                    });

                    body.append(card);
                    last = card[0];
                });

                curPage = Math.min(pagesToLoad, totPages);

                if (curPage < totPages) {
                    var more = $('<div class="AnimeVost-more selector">Ещё...</div>');
                    more.on('hover:enter click tap', function () {
                        curPage++;
                        load(false);
                    });
                    body.append(more);
                }
            }

            fetchPageNum(curPage);
        }

        function openDetail(itemUrl, itemData) {
            Lampa.Activity.push({
                url: itemUrl,
                title: 'AnimeVost',
                component: 'animevost_detail',
                animevost_url: itemUrl,
                animevost_data: itemData || null
            });
        }
    }

    // ─── Detail Component ───────────────────────────────────────────

    function DetailComponent(object) {
        var params = object || {};
        var html = $('<div class="AnimeVost-detail"></div>');
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var content = $('<div></div>');
        var rendered = false;
        var currentUrl = params.url || params.animevost_url || '';
        var cachedData = params.animevost_data || null;

        this.render = function () {
            if (!rendered) {
                rendered = true;
                html.append(scroll.render());
                scroll.append(content);
                scroll.minus();
                content.html('<div class="AnimeVost-loader">Загрузка...</div>');
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

        this.destroy = function () { scroll.destroy(); content.empty(); };

        function loadDetail() {
            var url = currentUrl;
            if (!url) { content.html('<div class="AnimeVost-empty">Нет данных</div>'); return; }
            if (url.indexOf('http') !== 0) url = HOST + url;
            currentUrl = url;

            console.log('[AnimeVost] Detail loading:', url);

            function renderItem(item, episodes, rawHtml) {
                var gn = item.genres.length ? item.genres.join(' | ') : '';
                var posterUrl = esc(item.poster || NO_POSTER);

                var h = '';

                h += '<div class="AnimeVost-det-wrap">';
                h += '<div class="AnimeVost-det-poster"><img src="' + posterUrl + '" onerror="this.onerror=null;this.src=\'' + NO_POSTER + '\'" /></div>';
                h += '<div class="AnimeVost-det-info">';

                if (item.year || item.type) {
                    h += '<div class="AnimeVost-det-year">' + (item.year || '') + (item.year && item.type ? ', ' : '') + esc(item.type || '') + '</div>';
                }

                h += '<div class="AnimeVost-det-title">' + esc(item.title) + '</div>';

                if (item.original_title) {
                    h += '<div class="AnimeVost-det-orig">' + esc(item.original_title) + '</div>';
                }

                h += '<div class="AnimeVost-det-badges">';
                if (item.rating) {
                    h += '<div class="AnimeVost-det-badge AnimeVost-det-badge--rating"><span>' + item.rating + '%</span>Rating</div>';
                }
                if (item.votes) {
                    h += '<div class="AnimeVost-det-badge AnimeVost-det-badge--rating"><span>' + item.votes + '</span>Голосов</div>';
                }
                h += '</div>';

                var metaParts = [];
                if (item.episodes) metaParts.push('Серии: ' + esc(item.episodes));
                if (gn) metaParts.push(gn);
                if (metaParts.length) {
                    h += '<div class="AnimeVost-det-meta-line">' + metaParts.join(' · ') + '</div>';
                }

                h += '<div class="AnimeVost-det-actions">';

                h += '<div class="selector" data-action="play">';
                h += '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
                h += '</div>';

                h += '<div class="selector" data-action="share">';
                h += '<svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>';
                h += '</div>';

                h += '<div class="selector" data-action="site">';
                h += '<svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>';
                h += '</div>';

                h += '</div>';
                h += '</div></div>';

                h += '<div class="AnimeVost-det-scroll">';

                h += '<div class="buttons--container"></div>';

                if (item.description) {
                    h += '<div class="AnimeVost-det-desc-title">Подробнее</div>';
                    h += '<div class="AnimeVost-det-desc">' + esc(item.description) + '</div>';
                }

                if (episodes.length) {
                    h += '<div class="AnimeVost-det-episodes">';
                    h += '<div class="AnimeVost-det-episodes__title">Эпизоды</div>';
                    h += '<div class="AnimeVost-det-ep-list">';
                    for (var i = 0; i < episodes.length; i++) {
                        h += '<div class="AnimeVost-det-ep-item selector" data-ep="' + i + '" data-action="episode">';
                        h += 'Серия ' + (i + 1);
                        h += '</div>';
                    }
                    h += '</div></div>';
                }

                h += '</div>';

                content.html(h);
                bindDetailActions(item, episodes);
                sendFullEvent(item, episodes);
            }

            if (cachedData) {
                console.log('[AnimeVost] Using cached data for:', cachedData.title);
                fetchPage(url, function (raw) {
                    var episodes = raw ? parseEpisodes(raw) : [];
                    renderItem(cachedData, episodes, raw);
                });
            } else {
                fetchPage(url, function (raw) {
                    console.log('[AnimeVost] Detail response length:', raw ? raw.length : 0);
                    if (!raw || raw.length < 200) {
                        content.html('<div class="AnimeVost-empty">Не удалось загрузить</div>');
                        return;
                    }

                    var item = parseDetailPage(raw);
                    console.log('[AnimeVost] Detail parsed:', item ? item.title : 'null');
                    if (!item || !item.title) {
                        content.html('<div class="AnimeVost-empty">Не удалось загрузить</div>');
                        return;
                    }

                    var episodes = parseEpisodes(raw);
                    renderItem(item, episodes, raw);
                });
            }
        }

        function parseEpisodes(raw) {
            var episodes = [];
            var epRegex = /<a[^>]+href="([^"]*)"[^>]*>\s*(?:Серия|Серии|Эпизод)\s*(\d+)/gi;
            var m;
            while ((m = epRegex.exec(raw)) !== null) {
                episodes.push({ url: m[1], num: parseInt(m[2], 10) });
            }
            if (!episodes.length) {
                var linkRegex = /<a[^>]+href="(\/[^"]*\d+[^"]*)"[^>]*class="[^"]*ser[^"]*"[^>]*>/gi;
                while ((m = linkRegex.exec(raw)) !== null) {
                    episodes.push({ url: m[1], num: episodes.length + 1 });
                }
            }
            return episodes;
        }

        function sendFullEvent(item, episodes) {
            try {
                var lampaCard = {
                    id: item.id || 0,
                    title: item.title || '',
                    name: item.title || '',
                    original_title: item.original_title || '',
                    original_name: item.original_title || '',
                    poster: item.poster || '',
                    poster_path: item.poster || '',
                    overview: item.description || '',
                    release_date: item.year ? item.year + '-01-01' : '',
                    year: item.year || 0,
                    genres: item.genres || [],
                    genre_ids: [],
                    source: 'animevost',
                    method: 'anime',
                    vote_average: item.rating ? item.rating / 10 : 0,
                    episode: episodes.length ? 1 : 0,
                    season: 1
                };

                var activeLayer = null;
                try {
                    var layer = Lampa.Activity.active();
                    if (layer && layer.activity) activeLayer = layer.activity;
                } catch (e) {}

                var eventData = {
                    type: 'complite',
                    card: lampaCard,
                    body: content,
                    html: content,
                    object: activeLayer ? { activity: activeLayer } : {}
                };

                Lampa.Listener.send('full', eventData);

                setTimeout(function () {
                    Lampa.Listener.send('full', {
                        type: 'options',
                        card: lampaCard,
                        body: content,
                        html: content,
                        options: [],
                        object: activeLayer ? { activity: activeLayer } : {}
                    });
                }, 500);
            } catch (e) {
                console.log('[AnimeVost] sendFullEvent error:', e.message);
            }
        }

        function bindDetailActions(item, episodes) {
            content.find('[data-action]').each(function () {
                var el = $(this);
                var action = el.data('action');

                el.on('hover:enter click tap', function () {
                    if (action === 'play') {
                        var sources = [];
                        if (episodes.length) {
                            for (var i = 0; i < episodes.length; i++) {
                                var epUrl = episodes[i].url;
                                if (epUrl.indexOf('http') !== 0) epUrl = HOST + epUrl;
                                (function (url, num) {
                                    sources.push({
                                        title: 'Серия ' + num,
                                        url: url,
                                        onSelect: function () { window.open(url, '_blank'); }
                                    });
                                })(epUrl, i + 1);
                            }
                        }
                        sources.push({
                            title: 'Открыть на сайте AnimeVost',
                            url: currentUrl,
                            onSelect: function () { window.open(currentUrl, '_blank'); }
                        });
                        Lampa.Select.show({
                            title: 'Источники',
                            items: sources
                        });
                    } else if (action === 'share') {
                        if (navigator.share) {
                            navigator.share({ title: item.title, url: currentUrl });
                        } else if (navigator.clipboard) {
                            navigator.clipboard.writeText(currentUrl);
                            notify('Ссылка скопирована');
                        } else {
                            prompt('Ссылка:', currentUrl);
                        }
                    } else if (action === 'site') {
                        window.open(currentUrl, '_blank');
                    } else if (action === 'episode') {
                        var idx = parseInt(el.data('ep'), 10);
                        if (episodes[idx]) {
                            var epUrl = episodes[idx].url;
                            if (epUrl.indexOf('http') !== 0) epUrl = HOST + epUrl;
                            window.open(epUrl, '_blank');
                        }
                    }
                });
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
