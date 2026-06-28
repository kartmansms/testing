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
        return { card_size: 'normal', sort: 'date' };
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

    function notify(message) {
        if (window.Lampa && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(message);
        else if (window.console) console.log('[AnimeVost]', message);
    }

    function esc(value) {
        value = value === undefined || value === null ? '' : String(value);
        return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function stripHtml(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        return (tmp.textContent || tmp.innerText || '').trim();
    }

    // ─── Network ────────────────────────────────────────────────────

    function fetchPage(url, callback) {
        if (window.Lampa && typeof Lampa.Reguest === 'function') {
            try {
                var net = new Lampa.Reguest();
                if (typeof net.timeout === 'function') net.timeout(15000);
                if (typeof net.silent === 'function') {
                    net.silent(url, function (d) { callback(d); }, function () { callback(''); });
                    return;
                }
            } catch (e) {}
        }
        if (window.$) {
            $.ajax({ url: url, dataType: 'html', timeout: 15000,
                success: function (d) { callback(d); },
                error: function () { callback(''); }
            });
        } else { callback(''); }
    }

    // ─── HTML Parsing (regex-based, no DOMParser dependency) ────────

    function rxBetween(html, startPattern, endPattern) {
        var m = html.match(new RegExp(startPattern + '\\s*([\\s\\S]*?)' + endPattern));
        return m ? m[1].trim() : '';
    }

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
        item.director = rxOne(blockHtml, /Режиссёр:\s*<\/strong>\s*(?:<a[^>]*>)?([^<]+)/);

        var ratingM = blockHtml.match(/width:(\d+)%/);
        item.rating = ratingM ? parseInt(ratingM[1], 10) : 0;

        var votesM = blockHtml.match(/vote-num-id-\d+">(\d+)/);
        item.votes = votesM ? parseInt(votesM[1], 10) : 0;

        var descM = blockHtml.match(/Описание:\s*<\/strong>\s*([\s\S]*?)<\/p>/);
        item.description = descM ? stripHtml(descM[1]) : '';

        var catsM = blockHtml.match(/Категории:\s*<\/strong>\s*<i>([\s\S]*?)<\/i>/);
        item.categories = [];
        if (catsM) {
            var catParts = catsM[1].match(/>([^<]+)<\/a>/g);
            if (catParts) {
                for (var c = 0; c < catParts.length; c++) {
                    var catName = catParts[c].replace(/>|<\/a>/g, '').trim();
                    if (catName) item.categories.push(catName);
                }
            }
        }

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

        var pages = 1;
        var current = 1;

        var navM = html.match(/class="block_4">([\s\S]*?)<\/td>/);
        if (navM) {
            var navHtml = navM[1];
            var pageNums = [];
            var spanM = navHtml.match(/<span>(\d+)<\/span>/g);
            if (spanM) {
                for (var s = 0; s < spanM.length; s++) {
                    var num = parseInt(spanM[s].replace(/<[^>]+>/g, ''), 10);
                    if (num) pageNums.push(num);
                }
            }
            var linkNums = navHtml.match(/<a[^>]+>(\d+)<\/a>/g);
            if (linkNums) {
                for (var l = 0; l < linkNums.length; l++) {
                    var ln = parseInt(linkNums[l].replace(/<[^>]+>/g, ''), 10);
                    if (ln) pageNums.push(ln);
                }
            }
            if (pageNums.length) {
                current = pageNums[0];
                pages = Math.max.apply(null, pageNums);
            }
        }

        return { items: items, pages: pages, current: current };
    }

    function parseDetailPage(html) {
        if (!html) return null;
        var item = {};

        var titleM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        item.title = titleM ? stripHtml(titleM[1]) : '';

        var posterM = html.match(/<img class="imgRadius" src="([^"]+)"/);
        item.poster = posterM ? posterM[1] : '';
        if (item.poster && item.poster.indexOf('http') !== 0) {
            item.poster = HOST + (item.poster.indexOf('/') === 0 ? '' : '/') + item.poster;
        }

        var engM = html.match(/<h4>([\s\S]*?)<\/h4>/);
        item.original_title = engM ? stripHtml(engM[1]) : '';

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

        var descM = html.match(/Описание:\s*<\/strong>\s*([\s\S]*?)<\/p>/);
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

    function fetchList(params, callback) {
        fetchPage(buildListUrl(params), function (html) {
            callback(parseListPage(html));
        });
    }

    // ─── Card HTML ──────────────────────────────────────────────────

    var NO_POSTER = 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">' +
        '<rect fill="%23333" width="200" height="280"/>' +
        '<text fill="%23888" font-family="Arial" font-size="14" text-anchor="middle" x="100" y="140">Нет постера</text></svg>'
    );

    function cardHtml(item, size) {
        var poster = item.poster || NO_POSTER;
        var r = item.rating || 0;
        var rc = r >= 80 ? '#4caf50' : r >= 60 ? '#ff9800' : r >= 40 ? '#f44336' : '#888';
        var badge = item.type ? '<div class="av-badge">' + esc(item.type) + '</div>' : '';
        var year = item.year ? '<span class="av-year">' + item.year + '</span>' : '';

        return '<div class="av-card av-' + (size === 'compact' ? 'compact' : 'normal') + '" data-url="' + esc(item.url) + '">' +
            '<div class="av-poster-wrap">' +
            '<img class="av-poster" src="' + esc(poster) + '" onerror="this.onerror=null;this.src=\'' + NO_POSTER + '\'" />' +
            badge +
            '<div class="av-rating" style="background:' + rc + '">' + r + '</div>' +
            '</div>' +
            '<div class="av-info">' +
            '<div class="av-title">' + esc(item.title) + '</div>' +
            (item.original_title ? '<div class="av-orig">' + esc(item.original_title) + '</div>' : '') +
            '<div class="av-meta">' + year + (item.episodes ? ' · ' + esc(item.episodes) : '') + '</div>' +
            '</div></div>';
    }

    // ─── Styles ─────────────────────────────────────────────────────

    function addStyles() {
        if (document.getElementById('animevost-css')) return;
        var s = document.createElement('style');
        s.id = 'animevost-css';
        s.textContent =
            '.av-wrap{padding:10px 20px}' +
            '.av-head{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;align-items:center}' +
            '.av-btn{background:#2b2b2b;color:#ccc;border:1px solid #444;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:13px;transition:background .15s,color .15s}' +
            '.av-btn:hover,.av-btn.on{background:#e8a000;color:#fff;border-color:#e8a000}' +
            '.av-chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px}' +
            '.av-chip{background:#222;color:#aaa;border:1px solid #444;border-radius:14px;padding:4px 10px;cursor:pointer;font-size:12px;transition:all .15s}' +
            '.av-chip:hover,.av-chip.on{background:#e8a000;color:#fff;border-color:#e8a000}' +
            '.av-grid{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}' +
            '.av-card{width:155px;cursor:pointer;transition:transform .15s;border-radius:8px;overflow:hidden;background:#1a1a1a}' +
            '.av-card:hover{transform:scale(1.03)}' +
            '.av-card.compact{width:120px}' +
            '.av-poster-wrap{position:relative;width:100%;padding-bottom:140%;overflow:hidden}' +
            '.av-poster{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover}' +
            '.av-badge{position:absolute;top:6px;left:6px;background:rgba(0,0,0,.75);color:#e8a000;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:600}' +
            '.av-rating{position:absolute;top:6px;right:6px;color:#fff;font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;min-width:24px;text-align:center}' +
            '.av-info{padding:6px 8px 8px}' +
            '.av-title{font-size:13px;font-weight:600;color:#eee;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.3}' +
            '.av-orig{font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}' +
            '.av-meta{font-size:11px;color:#777;margin-top:4px}' +
            '.av-pager{display:flex;justify-content:center;align-items:center;gap:6px;margin:16px 0}' +
            '.av-pager .av-btn{background:#2b2b2b;color:#ccc;border:1px solid #444;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:13px}' +
            '.av-pager .av-btn:hover{background:#e8a000;color:#fff}' +
            '.av-page-info{color:#aaa;font-size:13px}' +
            '.av-loading,.av-empty{text-align:center;color:#888;padding:30px 0;font-size:14px}' +
            '.av-detail{padding:15px 20px;max-width:900px;margin:0 auto}' +
            '.av-det-head{display:flex;gap:16px;margin-bottom:16px}' +
            '.av-det-poster{width:200px;min-width:200px;border-radius:8px;overflow:hidden}' +
            '.av-det-poster img{width:100%;display:block}' +
            '.av-det-info{flex:1}' +
            '.av-det-title{font-size:22px;font-weight:700;color:#eee;margin-bottom:4px}' +
            '.av-det-orig{font-size:15px;color:#888;margin-bottom:10px}' +
            '.av-det-meta{font-size:13px;color:#aaa;line-height:1.8}' +
            '.av-det-meta strong{color:#ccc}' +
            '.av-det-desc{margin-top:14px;font-size:14px;color:#bbb;line-height:1.6}' +
            '.av-det-rating{display:inline-flex;align-items:center;gap:6px;background:#222;border-radius:6px;padding:4px 10px;margin-top:10px}' +
            '.av-det-rating .rv{font-size:18px;font-weight:700;color:#e8a000}' +
            '.av-det-rating .rvc{font-size:12px;color:#888}' +
            '.av-back{background:#2b2b2b;color:#ccc;border:1px solid #444;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:13px;margin-bottom:12px;display:inline-block}' +
            '.av-back:hover{background:#e8a000;color:#fff}' +
            '.av-search-wrap{padding:10px}' +
            '.av-search-input{width:100%;padding:10px;font-size:15px;background:#222;color:#eee;border:1px solid #555;border-radius:6px;outline:none;box-sizing:border-box}' +
            '.av-search-input:focus{border-color:#e8a000}' +
            '.av-search-go{margin-top:8px;background:#e8a000;color:#fff;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;font-size:14px}';
        document.head.appendChild(s);
    }

    // ─── Catalog Component ──────────────────────────────────────────

    function CatalogComponent(object) {
        this.extend(object);

        var self = this;
        var cardSize = readSettings().card_size;
        var curPage = 1;
        var totPages = 1;
        var params = {};
        var loading = false;
        var box = null;

        function load() {
            if (loading || !box) return;
            loading = true;
            box.innerHTML = '<div class="av-loading">Загрузка...</div>';

            var p = {};
            for (var k in params) { if (params.hasOwnProperty(k)) p[k] = params[k]; }
            p.page = curPage;

            fetchList(p, function (res) {
                loading = false;
                totPages = res.pages;
                render(res.items);
            });
        }

        function render(items) {
            if (!box) return;
            var h = '';
            if (!items.length) {
                h = '<div class="av-empty">Ничего не найдено</div>';
            } else {
                h += '<div class="av-grid">';
                for (var i = 0; i < items.length; i++) h += cardHtml(items[i], cardSize);
                h += '</div>';
            }
            if (totPages > 1) {
                h += '<div class="av-pager">';
                if (curPage > 1) h += '<div class="av-btn" data-p="' + (curPage - 1) + '">&laquo; Назад</div>';
                h += '<span class="av-page-info">Стр. ' + curPage + ' / ' + totPages + '</span>';
                if (curPage < totPages) h += '<div class="av-btn" data-p="' + (curPage + 1) + '">Вперёд &raquo;</div>';
                h += '</div>';
            }
            box.innerHTML = h;

            var cards = box.querySelectorAll('.av-card');
            for (var c = 0; c < cards.length; c++) {
                cards[c].onclick = function () {
                    var u = this.getAttribute('data-url');
                    if (u) navigateToDetail(u);
                };
            }
            var pbtns = box.querySelectorAll('.av-pager .av-btn');
            for (var pb = 0; pb < pbtns.length; pb++) {
                pbtns[pb].onclick = function () {
                    var pg = parseInt(this.getAttribute('data-p'), 10);
                    if (pg) { curPage = pg; load(); }
                };
            }
        }

        function nav(label, p, chipKey, chipList) {
            var el = document.createElement('div');
            el.className = 'av-btn';
            el.textContent = label;
            el.onclick = function () {
                params = p || {};
                curPage = 1;
                load();
            };
            return el;
        }

        function showSearch() {
            if (!box) return;
            box.innerHTML = '<div class="av-search-wrap">' +
                '<input class="av-search-input" id="av-si" type="text" placeholder="Поиск аниме..." />' +
                '<div class="av-btn av-search-go" id="av-sg">Найти</div></div><div id="av-sr"></div>';
            var inp = document.getElementById('av-si');
            var btn = document.getElementById('av-sg');
            if (inp) {
                inp.focus();
                inp.onkeydown = function (e) { if (e.keyCode === 13) go(); };
            }
            if (btn) btn.onclick = go;
            function go() {
                var q = inp ? inp.value.trim() : '';
                if (!q) return;
                params = { search: q };
                curPage = 1;
                loading = false;
                load();
            }
        }

        function makeChip(label, chipKey, chipVal) {
            var el = document.createElement('div');
            el.className = 'av-chip';
            el.textContent = label;
            el.onclick = function () {
                params = {};
                params[chipKey] = chipVal;
                curPage = 1;
                load();
            };
            return el;
        }

        this.createTemplate = function () {
            var tpl = document.createElement('div');
            tpl.className = 'av-wrap';

            var head = document.createElement('div');
            head.className = 'av-head';
            head.appendChild(nav('Главная', {}));
            head.appendChild(nav('Онгоинги', { ongoing: true }));
            head.appendChild(nav('Анонсы', { preview: true }));
            var sBtn = document.createElement('div');
            sBtn.className = 'av-btn';
            sBtn.textContent = 'Поиск';
            sBtn.onclick = showSearch;
            head.appendChild(sBtn);
            tpl.appendChild(head);

            var chipRow = document.createElement('div');
            chipRow.className = 'av-chips';
            for (var g = 0; g < genres.length; g++) {
                chipRow.appendChild(makeChip(genres[g].name, 'genre', genres[g].slug));
            }
            tpl.appendChild(chipRow);

            var typeRow = document.createElement('div');
            typeRow.className = 'av-chips';
            for (var t = 0; t < types.length; t++) {
                typeRow.appendChild(makeChip(types[t].name, 'type', types[t].slug));
            }
            tpl.appendChild(typeRow);

            var yearRow = document.createElement('div');
            yearRow.className = 'av-chips';
            for (var y = 0; y < Math.min(years.length, 10); y++) {
                yearRow.appendChild(makeChip(String(years[y]), 'year', years[y]));
            }
            tpl.appendChild(yearRow);

            box = document.createElement('div');
            box.className = 'av-content';
            tpl.appendChild(box);

            return tpl;
        };

        this.start = function () { load(); };
        this.destroy = function () { box = null; };
    }

    // ─── Detail Component ───────────────────────────────────────────

    function DetailComponent(object) {
        this.extend(object);
        var self = this;
        var box = null;

        this.createTemplate = function () {
            box = document.createElement('div');
            box.className = 'av-detail';
            box.innerHTML = '<div class="av-loading">Загрузка...</div>';
            return box;
        };

        this.start = function () {
            var url = '';
            try {
                if (self.activity && self.activity.url) url = self.activity.url;
            } catch (e) {}
            if (!url) {
                if (box) box.innerHTML = '<div class="av-empty">Нет данных</div>';
                return;
            }
            if (url.indexOf('http') !== 0) url = HOST + url;

            fetchPage(url, function (html) {
                if (!html || !box) return;
                var item = parseDetailPage(html);
                if (!item) { box.innerHTML = '<div class="av-empty">Не удалось загрузить</div>'; return; }

                var rc = item.rating >= 80 ? '#4caf50' : item.rating >= 60 ? '#ff9800' : item.rating >= 40 ? '#f44336' : '#888';
                var gn = item.genres.length ? item.genres.join(', ') : '';

                var h = '<div class="av-back" id="av-back">&larr; Назад</div>';
                h += '<div class="av-det-head">';
                h += '<div class="av-det-poster"><img src="' + esc(item.poster || NO_POSTER) + '" onerror="this.onerror=null;this.src=\'' + NO_POSTER + '\'" /></div>';
                h += '<div class="av-det-info">';
                h += '<div class="av-det-title">' + esc(item.title) + '</div>';
                if (item.original_title) h += '<div class="av-det-orig">' + esc(item.original_title) + '</div>';
                h += '<div class="av-det-meta">';
                if (item.year) h += '<div><strong>Год:</strong> ' + item.year + '</div>';
                if (item.type) h += '<div><strong>Тип:</strong> ' + esc(item.type) + '</div>';
                if (gn) h += '<div><strong>Жанры:</strong> ' + esc(gn) + '</div>';
                if (item.episodes) h += '<div><strong>Серии:</strong> ' + esc(item.episodes) + '</div>';
                if (item.director) h += '<div><strong>Режиссёр:</strong> ' + esc(item.director) + '</div>';
                h += '</div>';
                if (item.rating) {
                    h += '<div class="av-det-rating"><span class="rv" style="color:' + rc + '">' + item.rating + '%</span>';
                    if (item.votes) h += '<span class="rvc">(' + item.votes + ' голосов)</span>';
                    h += '</div>';
                }
                h += '</div></div>';
                if (item.description) h += '<div class="av-det-desc">' + esc(item.description) + '</div>';
                h += '<div style="margin-top:16px"><a href="' + esc(url) + '" target="_blank" class="av-btn" style="text-decoration:none;display:inline-block">Открыть на сайте</a></div>';

                box.innerHTML = h;

                var bb = document.getElementById('av-back');
                if (bb) bb.onclick = function () {
                    try { Lampa.Activity.backward(); } catch (e) { window.history.back(); }
                };
            });
        };

        this.destroy = function () { box = null; };
    }

    // ─── Navigation ─────────────────────────────────────────────────

    function navigateToDetail(url) {
        try {
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.push === 'function') {
                Lampa.Activity.push({
                    url: url,
                    title: 'AnimeVost',
                    component: 'animevost_detail',
                    animevost_url: url
                });
                return;
            }
        } catch (e) {}
        window.open(url, '_blank');
    }

    // ─── Init ───────────────────────────────────────────────────────

    function init() {
        addStyles();

        if (window.Lampa && Lampa.Component) {
            Lampa.Component.add('animevost', CatalogComponent);
            Lampa.Component.add('animevost_detail', DetailComponent);
        }

        if (window.Lampa && Lampa.Menu) {
            try {
                Lampa.Menu.add({
                    id: 'animevost',
                    title: 'AnimeVost',
                    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
                    component: 'animevost'
                });
            } catch (e) {
                notify('Menu.add failed: ' + e.message);
            }
        }

        notify('AnimeVost плагин загружен');
    }

    if (window.Lampa) {
        init();
    } else if (window.LampaListener) {
        window.LampaListener.follow('app', function (e) { if (e.type === 'ready') init(); });
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            if (window.Lampa) init();
        });
    }
})();
