(function () {
  'use strict';

  var BASE = 'https://v13.vost.pw';
  var network = new Lampa.Reguest();

  function createElement(html) {
    var d = document.createElement('div');
    d.innerHTML = html || '';
    return d;
  }

  function qs(root, sel) { return root.querySelector(sel); }
  function qsa(root, sel) { return root.querySelectorAll(sel); }
  function txt(root, sel) { var n = qs(root, sel); return n ? n.textContent.trim() : ''; }
  function href(root, sel) { var n = qs(root, sel); return n ? (n.getAttribute('href') || '').trim() : ''; }
  function attr(root, sel, a) { var n = qs(root, sel); return n ? (n.getAttribute(a) || '').trim() : ''; }

  function fullUrl(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return BASE + (path.charAt(0) === '/' ? '' : '/') + path;
  }

  var GENRE_MAP = {
    'boyevyye-iskusstva': 'Боевые искусства', 'voyna': 'Война', 'drama': 'Драма',
    'detektiv': 'Детектив', 'istoriya': 'История', 'komediya': 'Комедия',
    'mekha': 'Меха', 'mistika': 'Мистика', 'makho-sedze': 'Махо-сёдзё',
    'muzykalnyy': 'Музыкальный', 'povsednevnost': 'Повседневность',
    'priklyucheniya': 'Приключения', 'parodiya': 'Пародия', 'romantika': 'Романтика',
    'senen': 'Сёнэн', 'sedze': 'Сёдзё', 'sport': 'Спорт', 'skazka': 'Сказка',
    'sedze-ay': 'Сёдзё-ай', 'senen-ay': 'Сёнэн-ай', 'samurai': 'Самураи',
    'triller': 'Триллер', 'uzhasy': 'Ужасы', 'fantastika': 'Фантастика',
    'fentezi': 'Фэнтези', 'shkola': 'Школа', 'etti': 'Этти'
  };

  var TYPE_MAP = {
    'tv': 'ТВ', 'tv-speshl': 'ТВ-спэшл', 'ova': 'OVA', 'ona': 'ONA',
    'polnometrazhnyy-film': 'Полнометражный фильм',
    'korotkometrazhnyy-film': 'Короткометражный фильм', 'dunkhua': 'Дунхуа'
  };

  function parseCards(html) {
    var root = createElement(html);
    var items = qsa(root, '.shortstory');
    var cards = [];
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var link = href(el, '.shortstoryHead h2 a');
      if (!link) continue;
      var title = txt(el, '.shortstoryHead h2 a');
      var enTitle = txt(el, '.shortstoryContent h4');
      var poster = attr(el, 'img.imgRadius', 'src');
      var ps = qsa(el, '.shortstoryContent p, .shortstoryContent > p');
      var year = 0, genre = '', type = '', epText = '', desc = '';
      for (var j = 0; j < ps.length; j++) {
        var t = ps[j].textContent.trim();
        if (/^Год выхода/.test(t)) year = parseInt(t.replace(/.*?:\s*/, '')) || 0;
        else if (/^Жанр/.test(t)) genre = t.replace(/.*?:\s*/, '');
        else if (/^Тип/.test(t)) type = t.replace(/.*?:\s*/, '');
        else if (/^Количество серий/.test(t)) epText = t.replace(/.*?:\s*/, '');
        else if (/^Описание/.test(t)) desc = t.replace(/.*?:\s*/, '');
      }
      var catSpans = qsa(el, '.shortstoryFuter span');
      var cats = catSpans.length ? catSpans[catSpans.length - 1].textContent.replace(/.*?:\s*/, '').trim() : '';
      cards.push({
        id: link,
        title: title,
        original_title: enTitle,
        poster: fullUrl(poster),
        img: fullUrl(poster),
        year: year,
        overview: desc,
        genres: genre,
        media_type: /фильм/i.test(type) ? 'movie' : 'tv',
        episodes_text: epText,
        categories: cats,
        source: 'animevost',
        url: fullUrl(link)
      });
    }
    return cards;
  }

  function parsePagination(html) {
    var root = createElement(html);
    var last = qs(root, '.block_4 a:last-child');
    if (!last) return 1;
    var href = last.getAttribute('href') || '';
    var m = href.match(/page\/(\d+)/);
    return m ? parseInt(m[1]) : 1;
  }

  function parseDetail(html, pageUrl) {
    var root = createElement(html);
    var title = txt(root, '.shortstoryHead h2 a') || txt(root, 'title').split('»')[0].trim();
    var enTitle = txt(root, '.shortstoryContent h4');
    var poster = attr(root, 'img.imgRadius', 'src');
    var metaImg = attr(root, 'meta[property="og:image"]', 'content');
    var img = poster || metaImg;
    var ps = qsa(root, '.shortstoryContent p');
    var year = 0, genre = '', type = '', epText = '', desc = '', director = '', ratingText = '';
    for (var i = 0; i < ps.length; i++) {
      var t = ps[i].textContent.trim();
      if (/^Год выхода/.test(t)) year = parseInt(t.replace(/.*?:\s*/, '')) || 0;
      else if (/^Жанр/.test(t)) genre = t.replace(/.*?:\s*/, '');
      else if (/^Тип/.test(t)) type = t.replace(/.*?:\s*/, '');
      else if (/^Количество серий/.test(t)) epText = t.replace(/.*?:\s*/, '');
      else if (/^Описание/.test(t)) desc = t.replace(/.*?:\s*/, '');
      else if (/^Режиссёр/.test(t)) director = t.replace(/.*?:\s*/, '');
    }
    var ratingEl = qs(root, '.current-rating');
    if (ratingEl) ratingText = ratingEl.textContent.trim();
    var voteEl = qs(root, '[id^="vote-num-id-"]');
    var votes = voteEl ? parseInt(voteEl.textContent.trim()) || 0 : 0;

    var epCount = parseInt(epText) || 0;
    var durationMatch = epText.match(/\((\d+)\s*мин/);
    var duration = durationMatch ? parseInt(durationMatch[1]) : 0;

    var mediaType = /фильм/i.test(type) ? 'movie' : 'tv';

    var episodes = [];
    var playIds = [];
    var serialBlock = qs(root, '#serial');
    if (serialBlock) {
      var epLinks = qsa(serialBlock, '[onclick*="ajax("]');
      for (var k = 0; k < epLinks.length; k++) {
        var onclick = epLinks[k].getAttribute('onclick') || '';
        var match = onclick.match(/ajax\((\d+)/);
        if (match) playIds.push(parseInt(match[1]));
        var epLabel = epLinks[k].textContent.trim() || 'Серия ' + (k + 1);
        episodes.push({ number: k + 1, title: epLabel, playId: match ? parseInt(match[1]) : 0 });
      }
    }
    if (!playIds.length) {
      var allOnclick = qsa(root, '[onclick*="ajax("]');
      for (var m = 0; m < allOnclick.length; m++) {
        var oc = allOnclick[m].getAttribute('onclick') || '';
        var pm = oc.match(/ajax\((\d+)/);
        if (pm) playIds.push(parseInt(pm[1]));
      }
    }
    if (!episodes.length && epCount > 0) {
      for (var n = 1; n <= epCount; n++) {
        episodes.push({ number: n, title: 'Серия ' + n, playId: 0 });
      }
    }

    return {
      title: title,
      original_title: enTitle,
      poster: fullUrl(img),
      img: fullUrl(img),
      year: year,
      overview: desc,
      genres: genre,
      media_type: mediaType,
      episodes_text: epText,
      director: director,
      rating: ratingText,
      votes: votes,
      ep_count: epCount || episodes.length,
      duration: duration,
      episodes: episodes,
      playIds: playIds,
      source: 'animevost',
      url: pageUrl || ''
    };
  }

  var Cache = {};
  function cacheGet(k) { return Cache[k] || null; }
  function cacheSet(k, v) { Cache[k] = v; }

  var Api = {
    fetch: function (url, success, error) {
      network["native"](url, function (data) {
        success(typeof data === 'string' ? data : String(data || ''));
      }, function (e) {
        console.log('[AnimeVost] fetch error:', url, e);
        error && error(e);
      }, false, {});
    },

    getCatalog: function (page, success, error) {
      var url = page > 1 ? BASE + '/page/' + page + '/' : BASE;
      Api.fetch(url, function (html) {
        var cards = parseCards(html);
        var total = parsePagination(html);
        success({ results: cards, page: page, total_pages: total });
      }, error);
    },

    getOngoing: function (page, success, error) {
      var url = page > 1 ? BASE + '/ongoing/page/' + page + '/' : BASE + '/ongoing/';
      Api.fetch(url, function (html) {
        var cards = parseCards(html);
        var total = parsePagination(html);
        success({ results: cards, page: page, total_pages: total });
      }, error);
    },

    getCategory: function (slug, page, success, error) {
      var base = '/' + slug + '/';
      var url = page > 1 ? BASE + base + 'page/' + page + '/' : BASE + base;
      Api.fetch(url, function (html) {
        var cards = parseCards(html);
        var total = parsePagination(html);
        success({ results: cards, page: page, total_pages: total });
      }, error);
    },

    search: function (query, success, error) {
      var url = BASE + '/index.php?do=search&subaction=search&story=' + encodeURIComponent(query) + '&full_search=1&result_from=1';
      Api.fetch(url, function (html) {
        var cards = parseCards(html);
        success({ results: cards });
      }, error);
    },

    getDetail: function (pageUrl, success, error) {
      if (cacheGet(pageUrl)) return success(cacheGet(pageUrl));
      Api.fetch(pageUrl, function (html) {
        var detail = parseDetail(html, pageUrl);
        cacheSet(pageUrl, detail);
        success(detail);
      }, error);
    },

    getFrame: function (playId, success, error) {
      var url = BASE + '/frame.php?play=' + playId;
      Api.fetch(url, function (html) {
        var videoUrl = '';
        var m3u8 = html.match(/(?:file|src)\s*[:=]\s*["']([^"']*\.m3u8[^"']*)/i);
        if (m3u8) { videoUrl = m3u8[1]; }
        if (!videoUrl) {
          var mp4 = html.match(/(?:file|src)\s*[:=]\s*["']([^"']*\.mp4[^"']*)/i);
          if (mp4) videoUrl = mp4[1];
        }
        if (!videoUrl) {
          var anyFile = html.match(/["'](https?:\/\/[^"']*\.(m3u8|mp4|mpd)[^"']*)/i);
          if (anyFile) videoUrl = anyFile[1];
        }
        if (!videoUrl) {
          var cdnmatch = html.match(/(?:cdn|video|file|source|url)\s*[:=]\s*["']([^"']+)/i);
          if (cdnmatch) videoUrl = cdnmatch[1];
        }
        console.log('[AnimeVost] frame resolved:', videoUrl ? videoUrl.substring(0, 80) : 'EMPTY');
        success(videoUrl);
      }, error);
    }
  };

  function buildCard(item) {
    return {
      id: item.id || item.url,
      title: item.title || '',
      name: item.media_type !== 'movie' ? item.title : undefined,
      original_title: item.original_title || '',
      original_name: item.media_type !== 'movie' ? item.original_title : null,
      poster: item.poster || null,
      img: item.img || item.poster || null,
      poster_path: null,
      backdrop_path: null,
      year: item.year || 0,
      release_date: item.year ? item.year + '-01-01' : undefined,
      first_air_date: item.media_type !== 'movie' && item.year ? item.year + '-01-01' : undefined,
      vote_average: parseFloat(item.rating) || 0,
      overview: item.overview || '',
      media_type: item.media_type || 'tv',
      source: 'animevost',
      animevost_url: item.url || item.id || '',
      animevost_detail: item
    };
  }

  function buildFullPayload(detail) {
    var isMovie = detail.media_type === 'movie';
    var genres = detail.genres ? detail.genres.split(',').map(function (g) {
      return { id: g.trim(), name: g.trim() };
    }).filter(function (g) { return g.name; }) : [];

    var episodes = null;
    if (detail.episodes && detail.episodes.length) {
      episodes = {
        name: 'Сезон 1',
        episodes: detail.episodes.map(function (ep) {
          return {
            id: 'av_ep_' + ep.number,
            episode_number: ep.number,
            season_number: 1,
            name: ep.title || 'Серия ' + ep.number,
            air_date: '',
            overview: ''
          };
        })
      };
    }

    return {
      card: {
        id: detail.url || detail.title,
        title: detail.title || '',
        name: !isMovie ? detail.title : undefined,
        original_title: detail.original_title || '',
        original_name: !isMovie ? detail.original_title : null,
        poster: detail.poster || null,
        img: detail.img || detail.poster || null,
        poster_path: null,
        backdrop_path: null,
        year: detail.year || 0,
        release_date: detail.year ? detail.year + '-01-01' : undefined,
        first_air_date: !isMovie && detail.year ? detail.year + '-01-01' : undefined,
        vote_average: parseFloat(detail.rating) || 0,
        overview: detail.overview || '',
        media_type: detail.media_type,
        number_of_episodes: detail.ep_count || (detail.episodes ? detail.episodes.length : 0),
        episode_run_time: detail.duration ? [detail.duration] : undefined,
        runtime: detail.duration || undefined,
        genres: genres,
        source: 'animevost',
        animevost_url: detail.url,
        animevost_detail: detail
      },
      episodes: episodes,
      method: isMovie ? 'movie' : 'tv',
      id: detail.url
    };
  }

  var VideoPlayer = {
    play: function (playId, episodeNumber, onSuccess, onError) {
      if (!playId) {
        onError && onError('No play ID for episode ' + episodeNumber);
        return;
      }
      Api.getFrame(playId, function (url) {
        if (!url) {
          onError && onError('Could not extract video URL');
          return;
        }
        if (/^https?:\/\//.test(url)) {
          var qualities = {};
          qualities['720'] = url;
          qualities['default'] = url;
          onSuccess({ url: url, quality: qualities });
        } else {
          onError && onError('Invalid video URL');
        }
      }, function (e) {
        onError && onError('Frame fetch failed: ' + e);
      });
    }
  };

  function addMenuItem() {
    Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
    Lampa.Manifest.plugins.name = 'AnimeVost';
    Lampa.Manifest.plugins.version = '1.0.0';

    Lampa.Manifest.plugins = {
      name: 'AnimeVost',
      version: '1.0.0'
    };

    var item = {
      title: 'AnimeVost',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
      component: 'category_full',
      source: 'animevost',
      params: { url: '', title: 'AnimeVost' }
    };

    try {
      if (Lampa.Menu && Lampa.Menu.add) {
        Lampa.Menu.add(item);
        console.log('[AnimeVost] Menu item added');
      }
    } catch (e) {
      console.warn('[AnimeVost] Menu add failed:', e);
    }
  }

  var AnimeVostSource = {
    get: function (params, oncomplite, onerror) {
      var page = params.page || 1;
      var url = params.url || '';
      var search = params.search || '';

      if (search) {
        Api.search(search, function (data) {
          var cards = (data.results || []).map(buildCard);
          oncomplite({ results: cards, total_results: cards.length });
        }, onerror);
        return;
      }

      if (/\/ongoing/.test(url)) {
        Api.getOngoing(page, function (data) {
          var cards = (data.results || []).map(buildCard);
          oncomplite({ results: cards, total_results: cards.length, page: data.page });
        }, onerror);
        return;
      }

      if (/\/zhanr\//.test(url) || /\/tip\//.test(url) || /\/god\//.test(url)) {
        var path = url.replace(BASE, '');
        Api.getCategory(path, page, function (data) {
          var cards = (data.results || []).map(buildCard);
          oncomplite({ results: cards, total_results: cards.length, page: data.page });
        }, onerror);
        return;
      }

      Api.getCatalog(page, function (data) {
        var cards = (data.results || []).map(buildCard);
        oncomplite({ results: cards, total_results: cards.length, page: data.page, total_pages: data.total_pages });
      }, onerror);
    },

    full: function (params, oncomplite, onerror) {
      var movieUrl = params.movie && params.movie.animevost_url;
      if (!movieUrl) {
        onerror && onerror('No animevost URL');
        return;
      }
      Api.getDetail(movieUrl, function (detail) {
        var payload = buildFullPayload(detail);
        oncomplite(payload);
      }, onerror);
    },

    episodes: function (params, oncomplite, onerror) {
      var movie = params.movie || {};
      var detailUrl = movie.animevost_url || movie.id || '';
      Api.getDetail(detailUrl, function (detail) {
        var seasons = [{
          id: 'season_1',
          number: 1,
          name: 'Сезон 1',
          episode_count: detail.episodes ? detail.episodes.length : 0
        }];
        var episodes = (detail.episodes || []).map(function (ep) {
          return {
            id: 'av_ep_' + ep.number,
            season_number: 1,
            episode_number: ep.number,
            name: ep.title || 'Серия ' + ep.number,
            overview: '',
            air_date: ''
          };
        });
        oncomplite({ seasons: seasons, episodes: episodes, detail: detail });
      }, onerror);
    }
  };

  function init() {
    Lampa.Template.add('animevost_style', '<style>.animevost-quality{font-size:11px;padding:2px 6px;background:rgba(255,255,255,0.15);border-radius:3px;position:absolute;top:8px;left:8px;z-index:2}</style>');
    try { $('body').append(Lampa.Template.get('animevost_style')); } catch (e) {}

    addMenuItem();

    try {
      if (Lampa.Api) {
        Lampa.Api.sources = Lampa.Api.sources || {};
        if (!Lampa.Api.sources.animevost) {
          Lampa.Api.sources.animevost = AnimeVostSource;
          console.log('[AnimeVost] Source provider registered');
        }
      }
    } catch (e) {
      console.warn('[AnimeVost] Source registration failed:', e);
    }

    try {
      if (!Lampa.__animevostPatchedPush) {
        Lampa.__animevostPatchedPush = true;
        var origPush = Lampa.Activity.push;
        Lampa.Activity.push = function (obj) {
          try {
            var source = obj && (obj.source || (obj.card && obj.card.source) || (obj.movie && obj.movie.source));
            if (source === 'animevost') {
              if (obj.component === 'episodes' && obj.card) {
                var card = Object.assign({}, obj.card);
                if (card.img) card.poster_path = null;
                return origPush(Object.assign({}, obj, { card: card }));
              }
            }
          } catch (e) {}
          return origPush(obj);
        };
      }
    } catch (e) {}

    try {
      if (!Lampa.__animevostPatchedTmdbImage && Lampa.TMDB && typeof Lampa.TMDB.image === 'function') {
        var origTmdbImg = Lampa.TMDB.image;
        Lampa.TMDB.image = function (path) {
          var v = String(path || '');
          if (v.indexOf('animevost') !== -1) return v;
          return origTmdbImg.apply(this, arguments);
        };
        Lampa.__animevostPatchedTmdbImage = true;
      }
    } catch (e) {}

    console.log('[AnimeVost] Plugin initialized');
  }

  if (!window.plugin_animevost_ready) {
    window.plugin_animevost_ready = true;
    if (window.appready) {
      init();
    } else {
      Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') init();
      });
    }
  }
})();
