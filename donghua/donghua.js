(function () {
    'use strict';

    // =================================================================
    // ЛОКАЛИЗАЦИЯ
    // =================================================================

    var TRANSLATIONS = {
        'ru': {
            title: 'Дунхуа',
            categories: {
                popular: 'Популярные дунхуа сейчас',
                new_releases: 'Новые дунхуа',
                top_rated: 'Лучшие дунхуа (высокий рейтинг)',
                completed: 'Завершённые дунхуа',
                ongoing: 'Выходящие дунхуа',
                fantasy: 'Фэнтези дунхуа',
                action: 'Экшн дунхуа',
                romance: 'Романтические дунхуа',
                cultivation: 'Культивация (Xianxia)',
                martial_arts: 'Боевые искусства (Wuxia)',
                modern: 'Современные дунхуа',
                historical: 'Исторические дунхуа',
                comedy: 'Комедийные дунхуа',
                scifi: 'Научная фантастика',
                anilist_trending: 'В тренде на AniList',
                anilist_top_all: 'Топ донхуа за все время (AniList)',
                anilist_top_year: 'Топ донхуа ' + new Date().getFullYear() + ' (AniList)',
                anilist_popular: 'Популярные на AniList',

            },
            recommendations: 'Рекомендации',
            continue_watching: 'Продолжить просмотр',
            empty: 'Ничего не найдено',
            search_hint: 'Поиск китайских комиксов и анимации...',
            years: 'По годам',
            all: 'Все',
            episodes: 'серий',
            season: 'Сезон',
            seasons: 'Сезоны',
            rating: 'Рейтинг',
            status: 'Статус',
            airing: 'Выходит',
            ended: 'Завершён',
            planned: 'Запланирован'
        },
        'uk': {
            title: 'Дунхуа',
            categories: {
                popular: 'Популярні дунхуа зараз',
                new_releases: 'Нові дунхуа',
                top_rated: 'Найкращі дунхуа (високий рейтинг)',
                completed: 'Завершені дунхуа',
                ongoing: 'Вихідні дунхуа',
                fantasy: 'Фентезі дунхуа',
                action: 'Екшн дунхуа',
                romance: 'Романтичні дунхуа',
                cultivation: 'Культивація (Xianxia)',
                martial_arts: 'Бойові мистецтва (Wuxia)',
                modern: 'Сучасні дунхуа',
                historical: 'Історичні дунхуа',
                comedy: 'Комедійні дунхуа',
                scifi: 'Наукова фантастика',
                anilist_trending: 'У тренді на AniList',
                anilist_top_all: 'Топ донхуа за весь час (AniList)',
                anilist_top_year: 'Топ донхуа ' + new Date().getFullYear() + ' (AniList)',
                anilist_popular: 'Популярні на AniList',

            },
            recommendations: 'Рекомендації',
            continue_watching: 'Продовжити перегляд',
            empty: 'Нічого не знайдено',
            search_hint: 'Пошук китайських коміксів та анімації...',
            years: 'По роках',
            all: 'Усі',
            episodes: 'серій',
            season: 'Сезон',
            seasons: 'Сезони',
            rating: 'Рейтинг',
            status: 'Статус',
            airing: 'Виходить',
            ended: 'Завершений',
            planned: 'Запланований'
        },
        'en': {
            title: 'Donghua',
            categories: {
                popular: 'Popular Donghua Now',
                new_releases: 'New Donghua Releases',
                top_rated: 'Top Rated Donghua',
                completed: 'Completed Donghua',
                ongoing: 'Ongoing Donghua',
                fantasy: 'Fantasy Donghua',
                action: 'Action Donghua',
                romance: 'Romantic Donghua',
                cultivation: 'Cultivation (Xianxia)',
                martial_arts: 'Martial Arts (Wuxia)',
                modern: 'Modern Donghua',
                historical: 'Historical Donghua',
                comedy: 'Comedy Donghua',
                scifi: 'Sci-Fi Donghua',
                anilist_trending: 'Trending on AniList',
                anilist_top_all: 'Top Donghua All Time (AniList)',
                anilist_top_year: 'Top Donghua ' + new Date().getFullYear() + ' (AniList)',
                anilist_popular: 'Popular on AniList',

            },
            recommendations: 'Recommendations',
            continue_watching: 'Continue Watching',
            empty: 'Nothing found',
            search_hint: 'Search Chinese comics and animation...',
            years: 'By years',
            all: 'All',
            episodes: 'episodes',
            season: 'Season',
            seasons: 'Seasons',
            rating: 'Rating',
            status: 'Status',
            airing: 'Airing',
            ended: 'Ended',
            planned: 'Planned'
        }
    };

    function t(key) {
        var lang = (Lampa.Storage.get('language', 'ru') || 'ru').toLowerCase();
        if (lang === 'ua') lang = 'uk';
        if (!TRANSLATIONS[lang]) lang = 'ru';

        var keys = key.split('.');
        var val = TRANSLATIONS[lang];
        for (var i = 0; i < keys.length; i++) {
            if (val && val[keys[i]] !== undefined) {
                val = val[keys[i]];
            } else {
                val = TRANSLATIONS['ru'];
                for (var j = 0; j < keys.length; j++) {
                    if (val && val[keys[j]] !== undefined) val = val[keys[j]];
                    else return key;
                }
                break;
            }
        }
        return val;
    }

    // =================================================================
    // КОНСТАНТЫ
    // =================================================================

    var ICON_DONGHUA = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15l3.5-4.5 2.5 3.01L14.5 9l4.5 6H5z"/></svg>';

    var TMDB_GENRES = {
        16: 'Мультфильм', 10759: 'Боевик', 10765: 'Фантастика', 10768: 'Война',
        10749: 'Мелодрама', 18: 'Драма', 35: 'Комедия', 9648: 'Детектив',
        10764: 'Реалити', 10767: 'Ток-шоу', 10762: 'Детский'
    };

    var TMDB_GENRES_EN = {
        16: 'Animation', 10759: 'Action', 10765: 'Sci-Fi', 10768: 'War',
        10749: 'Romance', 18: 'Drama', 35: 'Comedy', 9648: 'Mystery',
        10764: 'Reality', 10767: 'Talk', 10762: 'Kids'
    };

    // =================================================================
    // AniList GraphQL API
    // =================================================================

    var ANILIST_URL = 'https://graphql.anilist.co';

    function anilistQuery(query, variables, callback, error) {
        $.ajax({
            url: ANILIST_URL,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ query: query, variables: variables || {} }),
            success: function (res) {
                if (res && res.data) callback(res.data);
                else if (error) error('No data');
            },
            error: function (err) {
                if (error) error(err);
            }
        });
    }

    function anilistToLampa(items) {
        return items.filter(function (m) { return m && m.id; }).map(function (m) {
            var title = m.title || {};
            return {
                id: m.id,
                tmdb_id: m.idMal || null,
                name: title.romaji || title.english || title.native || '',
                original_name: title.native || title.romaji || '',
                title: title.english || title.romaji || title.native || '',
                overview: m.description ? m.description.replace(/<[^>]+>/g, '') : '',
                poster_path: m.coverImage && m.coverImage.large ? m.coverImage.large : (m.coverImage && m.coverImage.medium ? m.coverImage.medium : ''),
                backdrop_path: m.bannerImage || '',
                vote_average: m.averageScore ? m.averageScore / 10 : 0,
                vote_count: m.popularity || 0,
                first_air_date: m.startDate ? (m.startDate.year + '-' + String(m.startDate.month || 1).padStart(2, '0') + '-' + String(m.startDate.day || 1).padStart(2, '0')) : '',
                original_language: 'zh',
                genre_ids: (m.genres || []).map(function () { return 16; }),
                media_type: 'tv',
                source: 'anilist',
                anilist_id: m.id,
                status: m.status || 'RELEASING',
                episodes: m.episodes || 0,
                format: m.format || 'TV'
            };
        });
    }

    // Тренды AniList
    function anilistTrending(page, callback, error) {
        var query = 'query($page:Int,$perpage:Int){Page(page:$page,perPage:$perpage){media(type:ANIME,countryOfOrigin:CN,sort:TRENDING_DESC,formatIn:[TV,TV_SHORT,ONA]){id title{romaji english native}coverImage{large medium}bannerImage averageScore popularity description startDate{year month day}status episodes format genres}}}';
        anilistQuery(query, { page: page || 1, perpage: 20 }, function (data) {
            callback(anilistToLampa(data.Page.media || []));
        }, error);
    }

    // Топ за все время
    function anilistTopAll(page, callback, error) {
        var query = 'query($page:Int,$perpage:Int){Page(page:$page,perPage:$perpage){media(type:ANIME,countryOfOrigin:CN,sort:SCORE_DESC,formatIn:[TV,TV_SHORT,ONA]){id title{romaji english native}coverImage{large medium}bannerImage averageScore popularity description startDate{year month day}status episodes format genres}}}';
        anilistQuery(query, { page: page || 1, perpage: 20 }, function (data) {
            callback(anilistToLampa(data.Page.media || []));
        }, error);
    }

    // Топ по году
    function anilistTopYear(year, page, callback, error) {
        var query = 'query($page:Int,$perpage:Int,$year:Int){Page(page:$page,perPage:$perpage){media(type:ANIME,countryOfOrigin:CN,sort:SCORE_DESC,formatIn:[TV,TV_SHORT,ONA],startDate_greater:$year0000,startDate_lesser:$year1331){id title{romaji english native}coverImage{large medium}bannerImage averageScore popularity description startDate{year month day}status episodes format genres}}}';
        var yearStart = year + '0000';
        var yearEnd = year + '1331';
        anilistQuery(query.replace('$year0000', yearStart).replace('$year1331', yearEnd), { page: page || 1, perpage: 20, year: year }, function (data) {
            callback(anilistToLampa(data.Page.media || []));
        }, error);
    }

    // Популярные
    function anilistPopular(page, callback, error) {
        var query = 'query($page:Int,$perpage:Int){Page(page:$page,perPage:$perpage){media(type:ANIME,countryOfOrigin:CN,sort:POPULARITY_DESC,formatIn:[TV,TV_SHORT,ONA]){id title{romaji english native}coverImage{large medium}bannerImage averageScore popularity description startDate{year month day}status episodes format genres}}}';
        anilistQuery(query, { page: page || 1, perpage: 20 }, function (data) {
            callback(anilistToLampa(data.Page.media || []));
        }, error);
    }

    // Рекомендации AniList
    function anilistRecommendations(anilistId, callback, error) {
        var query = 'query($id:Int){Media(id:$id,type:ANIME){recommendations{edges{node{id mediaRecommendation{id title{romaji english native}coverImage{large medium}averageScore popularity startDate{year month day}}}}}}}';
        anilistQuery(query, { id: anilistId }, function (data) {
            if (data && data.Media && data.Media.recommendations && data.Media.recommendations.edges) {
                var recs = data.Media.recommendations.edges
                    .map(function (e) { return e.node && e.node.mediaRecommendation; })
                    .filter(function (m) { return m && m.id; });
                callback(anilistToLampa(recs));
            } else {
                callback([]);
            }
        }, error);
    }

    // Поиск AniList
    function anilistSearch(query, page, callback, error) {
        var gql = 'query($search:String,$page:Int,$perpage:Int){Page(page:$page,perPage:$perpage){media(type:ANIME,countryOfOrigin:CN,search:$search,formatIn:[TV,TV_SHORT,ONA]){id title{romaji english native}coverImage{large medium}bannerImage averageScore popularity description startDate{year month day}status episodes format genres}}}';
        anilistQuery(gql, { search: query, page: page || 1, perpage: 20 }, function (data) {
            callback(anilistToLampa(data.Page.media || []));
        }, error);
    }

    // =================================================================
    // КАТЕГОРИИ TMDB
    // =================================================================

    var DONGHUA_CATEGORIES = [
        {
            key: 'popular',
            url: 'discover/tv',
            params: { with_original_language: 'zh', with_genres: '16', sort_by: 'popularity.desc', vote_count_gte: '10' }
        },
        {
            key: 'new_releases',
            url: 'discover/tv',
            params: { with_original_language: 'zh', with_genres: '16', sort_by: 'first_air_date.desc', vote_count_gte: '3' }
        },
        {
            key: 'top_rated',
            url: 'discover/tv',
            params: { with_original_language: 'zh', with_genres: '16', sort_by: 'vote_average.desc', vote_average_gte: '7.0', vote_count_gte: '100' }
        },
        {
            key: 'completed',
            url: 'discover/tv',
            params: { with_original_language: 'zh', with_genres: '16', sort_by: 'vote_average.desc', with_status: '0', vote_count_gte: '20' }
        },
        {
            key: 'ongoing',
            url: 'discover/tv',
            params: { with_original_language: 'zh', with_genres: '16', sort_by: 'popularity.desc', with_status: '0', vote_count_gte: '5' }
        },
        {
            key: 'fantasy',
            url: 'discover/tv',
            params: { with_original_language: 'zh', with_genres: '16,10765', sort_by: 'popularity.desc', vote_count_gte: '10' }
        },
        {
            key: 'action',
            url: 'discover/tv',
            params: { with_original_language: 'zh', with_genres: '16,10759', sort_by: 'popularity.desc', vote_count_gte: '10' }
        },
        {
            key: 'romance',
            url: 'discover/tv',
            params: { with_original_language: 'zh', with_genres: '16,10749', sort_by: 'popularity.desc', vote_count_gte: '10' }
        },
        {
            key: 'cultivation',
            url: 'discover/tv',
            params: { with_original_language: 'zh', with_genres: '16,10765,10768', sort_by: 'popularity.desc', vote_count_gte: '10' }
        },
        {
            key: 'martial_arts',
            url: 'discover/tv',
            params: { with_original_language: 'zh', with_genres: '16,10759,10768', sort_by: 'popularity.desc', vote_count_gte: '10' }
        },
        {
            key: 'modern',
            url: 'discover/tv',
            params: { with_original_language: 'zh', with_genres: '16', sort_by: 'popularity.desc', without_genres: '10765,10768', vote_count_gte: '10' }
        },
        {
            key: 'historical',
            url: 'discover/tv',
            params: { with_original_language: 'zh', with_genres: '16,18', sort_by: 'popularity.desc', vote_count_gte: '10' }
        },
        {
            key: 'comedy',
            url: 'discover/tv',
            params: { with_original_language: 'zh', with_genres: '16,35', sort_by: 'popularity.desc', vote_count_gte: '10' }
        }
    ];

    // =================================================================
    // УТИЛИТЫ
    // =================================================================

    function buildTmdbUrl(endpoint, extraParams) {
        var params = [];
        params.push('api_key=' + Lampa.TMDB.key());
        params.push('language=' + (Lampa.Storage.get('language', 'ru') || 'ru'));

        if (extraParams) {
            for (var key in extraParams) {
                var val = extraParams[key];
                if (key === 'vote_count_gte') params.push('vote_count.gte=' + val);
                else if (key === 'vote_average_gte') params.push('vote_average.gte=' + val);
                else if (key === 'with_status') params.push('with_status=' + val);
                else params.push(key + '=' + val);
            }
        }

        return Lampa.TMDB.api(endpoint + '?' + params.join('&'));
    }

    function getStorage(key, def) {
        try { return Lampa.Storage.get(key, def); } catch (e) { return def; }
    }

    function setStorage(key, val) {
        try { Lampa.Storage.set(key, val); } catch (e) {}
    }

    function getWatchProgress(tvId) {
        var progress = getStorage('donghua_progress', {});
        return progress[tvId] || null;
    }

    function setWatchProgress(tvId, data) {
        var progress = getStorage('donghua_progress', {});
        progress[tvId] = {
            episode: data.episode || 0,
            season: data.season || 1,
            time: data.time || 0,
            duration: data.duration || 0,
            timestamp: Date.now()
        };
        setStorage('donghua_progress', progress);
    }

    // =================================================================
    // КОМПОНЕНТЫ
    // =================================================================

    function DonghuaMain(object) {
        var comp = new Lampa.InteractionMain(object);

        comp.create = function () {
            var _this = this;
            this.activity.loader(true);

            var categories = DONGHUA_CATEGORIES;
            var network = new Lampa.Reguest();
            var status = new Lampa.Status(categories.length + 4);

            status.onComplite = function () {
                var fulldata = [];
                var keys = Object.keys(status.data).sort(function (a, b) { return a - b; });

                for (var i = 0; i < keys.length; i++) {
                    var data = status.data[keys[i]];
                    if (data && data.results && data.results.length) {
                        var catIndex = parseInt(keys[i]);
                        var title = '';

                        if (catIndex < categories.length) {
                            title = t('categories.' + categories[catIndex].key);
                        } else if (catIndex === categories.length) {
                            title = t('categories.anilist_trending');
                        } else if (catIndex === categories.length + 1) {
                            title = t('categories.anilist_top_all');
                        } else if (catIndex === categories.length + 2) {
                            title = t('categories.anilist_top_year');
                        } else if (catIndex === categories.length + 3) {
                            title = t('categories.anilist_popular');
                        }

                        Lampa.Utils.extendItemsParams(data.results, { style: { name: 'wide' } });
                        fulldata.push({
                            title: title,
                            results: data.results,
                            service_id: object.service_id
                        });
                    }
                }

                if (fulldata.length) {
                    _this.build(fulldata);
                    _this.activity.loader(false);
                } else {
                    _this.empty();
                }
            };

            categories.forEach(function (cat, index) {
                var url = buildTmdbUrl(cat.url, cat.params);
                network.silent(url, function (json) {
                    status.append(index.toString(), json);
                }, function () {
                    status.error();
                });
            });

            var baseIndex = categories.length;

            anilistTrending(1, function (items) {
                status.append(baseIndex.toString(), { results: items });
            }, function () { status.error(); });

            anilistTopAll(1, function (items) {
                status.append((baseIndex + 1).toString(), { results: items });
            }, function () { status.error(); });

            anilistTopYear(new Date().getFullYear(), 1, function (items) {
                status.append((baseIndex + 2).toString(), { results: items });
            }, function () { status.error(); });

            anilistPopular(1, function (items) {
                status.append((baseIndex + 3).toString(), { results: items });
            }, function () { status.error(); });

            return this.render();
        };

        comp.onMore = function (data) {
            Lampa.Activity.push({
                title: data.title,
                component: 'donghua_view',
                page: 1,
                anilist: data.anilist || false,
                anilist_type: data.anilist_type || ''
            });
        };

        return comp;
    }

    function DonghuaView(object) {
        var comp = new Lampa.InteractionCategory(object);
        var network = new Lampa.Reguest();

        comp.create = function () {
            var _this = this;

            if (object.results && object.results.length) {
                _this.build({ results: object.results });
                return;
            }

            if (object.anilist) {
                var handlers = {
                    trending: anilistTrending,
                    top_all: anilistTopAll,
                    top_year: function (p, cb, err) { anilistTopYear(object.year || new Date().getFullYear(), p, cb, err); },
                    popular: anilistPopular
                };
                var handler = handlers[object.anilist_type] || anilistPopular;

                handler(1, function (items) {
                    _this.build({ results: items });
                }, _this.empty.bind(_this));
            } else {
                network.silent(buildUrl(1), function (json) {
                    _this.build(json);
                }, _this.empty.bind(_this));
            }
        };

        function buildUrl(page) {
            var params = {};
            if (object.params) {
                for (var key in object.params) {
                    params[key] = object.params[key];
                }
            }
            params.page = page;
            return buildTmdbUrl(object.url, params);
        }

        comp.nextPageReuest = function (object, resolve, reject) {
            network.silent(buildUrl(object.page), resolve, reject);
        };

        return comp;
    }

    function DonghuaYears(object) {
        var comp = new Lampa.InteractionCategory(object);
        var network = new Lampa.Reguest();

        function buildUrl(page) {
            var year = object.year || new Date().getFullYear();
            return buildTmdbUrl('discover/tv', {
                with_original_language: 'zh',
                with_genres: '16',
                sort_by: 'popularity.desc',
                first_air_date_year: year,
                vote_count_gte: '3',
                page: page
            });
        }

        comp.create = function () {
            var _this = this;
            network.silent(buildUrl(1), function (json) {
                _this.build(json);
            }, this.empty.bind(this));
        };

        comp.nextPageReuest = function (object, resolve, reject) {
            network.silent(buildUrl(object.page), resolve, reject);
        };

        return comp;
    }

    // =================================================================
    // РЕКОМЕНДАЦИИ (TMDB + AniList)
    // =================================================================

    function initFullCardEnhancements() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;

            var movie = e.data && e.data.movie;
            if (!movie) return;

            var isChinese = movie.original_language === 'zh';
            if (!isChinese) return;

            var activity = e.object && e.object.activity;
            if (!activity || !activity.render) return;
            var render = activity.render();
            if (!render || !render.length) return;

            addRecommendations(render, movie);
        });
    }

    function addRecommendations(render, movie) {
        if (render.find('.donghua-recommendations').length) return;

        var network = new Lampa.Reguest();
        var url = buildTmdbUrl('tv/' + movie.id + '/recommendations', { page: 1 });

        network.silent(url, function (json) {
            if (!json || !json.results || !json.results.length) return;

            var items = json.results.slice(0, 10);
            Lampa.Utils.extendItemsParams(items, { style: { name: 'wide' } });

            renderRecommendations(render, items, t('recommendations'));
        });
    }

    function renderRecommendations(render, items, title) {
        var html = '<div class="donghua-recommendations" style="margin-top: 1.5em;">' +
            '<div class="items-line__head">' +
            '<div class="items-line__title">' + title + '</div>' +
            '</div>' +
            '<div class="items-line__body" style="display: flex; gap: 10px; overflow-x: auto; padding: 10px 0;">';

        items.forEach(function (item) {
            var poster = '';
            if (item.poster_path) {
                poster = item.source === 'anilist' ? item.poster_path : Lampa.TMDB.image('/t/p/w200' + item.poster_path);
            }
            var itemTitle = item.name || item.original_name || item.title || '';
            var year = (item.first_air_date || '').substring(0, 4);

            var genres = [];
            if (item.genres && item.genres.length) {
                genres = item.genres.map(function (g) { return g.name || g; }).filter(Boolean).slice(0, 2);
            } else if (item.genre_ids && item.genre_ids.length) {
                var lang = (Lampa.Storage.get('language', 'ru') || 'ru');
                var genreMap = lang === 'en' ? TMDB_GENRES_EN : TMDB_GENRES;
                genres = item.genre_ids.slice(0, 2).map(function (id) { return genreMap[id] || ''; }).filter(Boolean);
            }

            html += '<div class="selector donghua-rec-item" data-id="' + item.id + '" data-source="' + (item.source || 'tmdb') + '" style="' +
                'min-width: 120px; max-width: 120px; cursor: pointer; border-radius: 8px; overflow: hidden; background: #222;">' +
                '<div style="width: 100%; height: 140px; overflow: hidden; position: relative;">' +
                (poster ? '<img src="' + poster + '" style="width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block;" />' : '') +
                '</div>' +
                '<div style="padding: 6px 8px;">' +
                '<div style="font-size: 0.75em; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + itemTitle + '</div>' +
                (year ? '<div style="font-size: 0.65em; color: rgba(255,255,255,0.5);">' + year + '</div>' : '') +
                (genres.length ? '<div style="font-size: 0.6em; color: rgba(255,255,255,0.4); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + genres.join(' · ') + '</div>' : '') +
                '</div>' +
                '</div>';
        });

        html += '</div></div>';

        render.find('.full-start-new__right, .full-start__right').first().append(html);

        render.find('.donghua-rec-item').on('hover:enter click', function () {
            var id = $(this).data('id');
            var source = $(this).data('source');
            if (id) {
                if (source === 'anilist') {
                    Lampa.Noty.show('AniList ID: ' + id);
                } else {
                    Lampa.Activity.push({
                        component: 'full',
                        id: id,
                        method: 'tv',
                        source: 'tmdb'
                    });
                }
            }
        });
    }

    // =================================================================
    // ПРОДОЛЖИТЬ ПРОСМОТР
    // =================================================================

    function initProgressTracking() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;

            var movie = e.data && e.data.movie;
            if (!movie || movie.original_language !== 'zh') return;

            var progress = getWatchProgress(movie.id);
            if (!progress) return;

            var activity = e.object && e.object.activity;
            if (!activity || !activity.render) return;
            var render = activity.render();
            if (!render || !render.length) return;

            if (render.find('.donghua-progress-badge').length) return;

            var badge = '<div class="donghua-progress-badge" style="' +
                'position: absolute; top: 10px; left: 10px; z-index: 10; ' +
                'padding: 4px 10px; background: rgba(0,150,255,0.85); border-radius: 12px; ' +
                'color: #fff; font-size: 0.8em; backdrop-filter: blur(4px);">' +
                t('continue_watching') + ': S' + progress.season + 'E' + progress.episode +
                '</div>';

            render.find('.full--poster, .full-start__poster').first().css('position', 'relative').append(badge);
        });
    }

    // =================================================================
    // ТАЙМЛАЙН ВЫХОДА СЕРИЙ
    // =================================================================

    function initTimeline() {
        if (!Lampa.TimeTable || typeof Lampa.TimeTable.follow !== 'function') return;

        Lampa.TimeTable.follow('new_episode', function (e) {
            if (!e || !e.movie || e.movie.original_language !== 'zh') return;
            if (e.movie.genres && e.movie.genres.some(function (g) { return g.id === 16; })) {
                Lampa.Noty.show('Дунхуа: ' + (e.movie.name || e.movie.title) + ' — новая серия!');
            }
        });
    }

    // =================================================================
    // ПОИСК (TMDB + AniList)
    // =================================================================

    function addSearchSource() {
        Lampa.Search.addSource({
            search: function () {
                return t('search_hint');
            },
            onStart: function (onComplite) {
                onComplite();
            },
            onSearch: function (query, onComplite) {
                var url = Lampa.TMDB.api('search/tv?api_key=' + Lampa.TMDB.key() +
                    '&language=' + (Lampa.Storage.get('language', 'ru') || 'ru') +
                    '&query=' + encodeURIComponent(query) +
                    '&with_original_language=zh' +
                    '&page=1');

                var network = new Lampa.Reguest();
                network.silent(url, function (json) {
                    if (json && json.results) {
                        var items = json.results.map(function (item) {
                            item.title = item.name || item.original_name || item.title;
                            item.search_after = true;
                            item.component = 'full_torrent';
                            item.source = 'tmdb';
                            return item;
                        });
                        onComplite(items);
                    } else {
                        onComplite([]);
                    }
                }, function () {
                    onComplite([]);
                });
            },
            cancel: function () {}
        });
    }

    // =================================================================
    // МЕНЮ
    // =================================================================

    function injectMenu() {
        var menu = $('.menu .menu__list').eq(0);
        if (!menu.length) return;
        if (menu.find('.menu__item[data-sid="donghua"]').length) return;

        var btn = $('<li class="menu__item selector" data-action="donghua_action" data-sid="donghua">' +
            '<div class="menu__ico">' + ICON_DONGHUA + '</div>' +
            '<div class="menu__text">' + t('title') + '</div>' +
            '</li>');

        btn.on('hover:enter', function () {
            Lampa.Activity.push({
                title: t('title'),
                component: 'donghua_main',
                service_id: 'donghua',
                page: 1
            });
        });

        var animeBtn = menu.find('.menu__item[data-sid="anime"]');
        if (animeBtn.length) {
            btn.insertAfter(animeBtn);
        } else {
            menu.append(btn);
        }
    }

    // =================================================================
    // СТИЛИ
    // =================================================================

    function addStyles() {
        if ($('#donghua-css').length) return;

        var css = '' +
            '.donghua_main .card--wide { width: 18.3em !important; }' +
            '.donghua_view .card--wide { width: 18.3em !important; }' +
            '.donghua_view .category-full { padding-top: 1em; }' +
            '.menu__ico svg { width: 1.4em; height: 1.4em; }' +
            '.donghua-recommendations .items-line__body::-webkit-scrollbar { height: 4px; }' +
            '.donghua-recommendations .items-line__body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }' +
            '.donghua-progress-badge { animation: donghuaPulse 2s ease-in-out infinite; }' +
            '@keyframes donghuaPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }' +
            '.donghua-rec-item { transition: transform 0.15s; }' +
            '.donghua-rec-item:hover { transform: scale(1.05); }' +
            '.donghua-rec-item img { object-position: top center !important; }' +
            '';

        $('head').append('<style id="donghua-css">' + css + '</style>');
    }

    // =================================================================
    // ЗАПУСК
    // =================================================================

    function startPlugin() {
        if (window.plugin_donghua_ready) return;
        window.plugin_donghua_ready = true;

        Lampa.Component.add('donghua_main', DonghuaMain);
        Lampa.Component.add('donghua_view', DonghuaView);
        Lampa.Component.add('donghua_years', DonghuaYears);

        addStyles();
        addSearchSource();

        initFullCardEnhancements();
        initProgressTracking();
        initTimeline();

        injectMenu();

        setInterval(function () {
            if (window.appready && $('.menu .menu__list').eq(0).length) {
                injectMenu();
            }
        }, 4000);
    }

    if (window.appready) {
        startPlugin();
    } else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();
