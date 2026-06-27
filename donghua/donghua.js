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
                by_studio: 'По студиям',
                bilibili: 'Bilibili',
                tencent: 'Tencent Video',
                youku: 'Youku Animation',
                haoliners: 'Haoliners',
                bcm: 'B.CM Times',
                wawayu: 'Wawayu Animation',
                pickles: 'Pickles Studio',
                cg_year: 'CG Year'
            },
            studios: 'Студии',
            studio: 'Студия',
            streaming: 'Стриминг',
            on_bilibili: 'На Bilibili',
            on_tencent: 'На Tencent Video',
            on_youku: 'На Youku',
            similar: 'Похожие дунхуа',
            recommendations: 'Рекомендации',
            new_episodes: 'Новые серии',
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
                by_studio: 'За студіями',
                bilibili: 'Bilibili',
                tencent: 'Tencent Video',
                youku: 'Youku Animation',
                haoliners: 'Haoliners',
                bcm: 'B.CM Times',
                wawayu: 'Wawayu Animation',
                pickles: 'Pickles Studio',
                cg_year: 'CG Year'
            },
            studios: 'Студії',
            studio: 'Студія',
            streaming: 'Стрімінг',
            on_bilibili: 'На Bilibili',
            on_tencent: 'На Tencent Video',
            on_youku: 'На Youku',
            similar: 'Схожі дунхуа',
            recommendations: 'Рекомендації',
            new_episodes: 'Нові серії',
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
                by_studio: 'By Studios',
                bilibili: 'Bilibili',
                tencent: 'Tencent Video',
                youku: 'Youku Animation',
                haoliners: 'Haoliners',
                bcm: 'B.CM Times',
                wawayu: 'Wawayu Animation',
                pickles: 'Pickles Studio',
                cg_year: 'CG Year'
            },
            studios: 'Studios',
            studio: 'Studio',
            streaming: 'Streaming',
            on_bilibili: 'On Bilibili',
            on_tencent: 'On Tencent Video',
            on_youku: 'On Youku',
            similar: 'Similar Donghua',
            recommendations: 'Recommendations',
            new_episodes: 'New Episodes',
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

    var STUDIO_DATA = {
        bilibili: {
            name: 'Bilibili',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906L17.813 4.653zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773H5.333zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z"/></svg>',
            colors: { bg: '#fb7299', text: '#fff' }
        },
        tencent: {
            name: 'Tencent Video',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>',
            colors: { bg: '#ff6a00', text: '#fff' }
        },
        youku: {
            name: 'Youku Animation',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>',
            colors: { bg: '#1eb8e0', text: '#fff' }
        },
        haoliners: {
            name: 'Haoliners',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
            colors: { bg: '#7c4dff', text: '#fff' }
        },
        bcm: {
            name: 'B.CM Times',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>',
            colors: { bg: '#00bfa5', text: '#fff' }
        },
        wawayu: {
            name: 'Wawayu Animation',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
            colors: { bg: '#ff5252', text: '#fff' }
        },
        pickles: {
            name: 'Pickles Studio',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93s3.06-7.44 7-7.93V17.93zm2-13.86c3.94.49 7 3.85 7 7.93s-3.06 7.44-7 7.93V4.07z"/></svg>',
            colors: { bg: '#4caf50', text: '#fff' }
        },
        cg_year: {
            name: 'CG Year',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>',
            colors: { bg: '#ff9800', text: '#fff' }
        }
    };

    // Studio TMDB company IDs (известные китайские студии анимации)
    var STUDIO_TMDB_IDS = {
        bilibili: [102207, 210360, 197532],
        tencent: [109864, 197532],
        youku: [102207],
        haoliners: [210360],
        bcm: [197532],
        wawayu: [],
        pickles: [],
        cg_year: []
    };

    // =================================================================
    // КАТЕГОРИИ
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
    // ПОСТЕР: ЦЕПОЧКА FALLBACK (TMDB → AniList → MyAnimeList)
    // =================================================================

    function getPosterUrl(movie, size) {
        size = size || 'w500';

        if (movie.poster_path) {
            return Lampa.TMDB.image('/t/p/' + size + movie.poster_path);
        }

        var title = movie.original_name || movie.name || '';
        if (!title) return '';

        var anilistUrl = 'https://graphql.anilist.co';
        var query = 'query{Media(search:"' + title.replace(/"/g, '\\"') + '",type:ANIME){coverImage{large}}}';

        return new Promise(function (resolve) {
            $.ajax({
                url: anilistUrl,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ query: query }),
                success: function (res) {
                    if (res && res.data && res.data.Media && res.data.Media.coverImage && res.data.Media.coverImage.large) {
                        resolve(res.data.Media.coverImage.large);
                    } else {
                        resolve('');
                    }
                },
                error: function () { resolve(''); }
            });
        });
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
            var status = new Lampa.Status(categories.length);

            status.onComplite = function () {
                var fulldata = [];
                var keys = Object.keys(status.data).sort(function (a, b) { return a - b; });

                for (var i = 0; i < keys.length; i++) {
                    var data = status.data[keys[i]];
                    if (data && data.results && data.results.length) {
                        var cat = categories[parseInt(keys[i])];
                        Lampa.Utils.extendItemsParams(data.results, { style: { name: 'wide' } });
                        fulldata.push({
                            title: t('categories.' + cat.key),
                            results: data.results,
                            url: cat.url,
                            params: cat.params,
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

            return this.render();
        };

        comp.onMore = function (data) {
            Lampa.Activity.push({
                url: data.url,
                params: data.params,
                title: data.title,
                component: 'donghua_view',
                page: 1
            });
        };

        return comp;
    }

    function DonghuaView(object) {
        var comp = new Lampa.InteractionCategory(object);
        var network = new Lampa.Reguest();

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

    function DonghuaStudioView(object) {
        var comp = new Lampa.InteractionCategory(object);
        var network = new Lampa.Reguest();

        function buildUrl(page) {
            var studioKey = object.studio_key || 'bilibili';
            var companyIds = STUDIO_TMDB_IDS[studioKey] || [];
            var params = {
                with_original_language: 'zh',
                with_genres: '16',
                sort_by: 'popularity.desc',
                with_companies: companyIds.join('|'),
                vote_count_gte: '5',
                page: page
            };
            return buildTmdbUrl('discover/tv', params);
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
    // РЕКОМЕНДАЦИИ И ПОХОЖИЕ
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

            // Добавляем метаданные студии
            addStudioInfo(render, movie);

            // Добавляем ссылки на стриминг
            addStreamingLinks(render, movie);

            // Добавляем рекомендации
            addRecommendations(render, movie);
        });
    }

    function addStudioInfo(render, movie) {
        if (render.find('.donghua-studio-info').length) return;

        var studios = movie.production_companies || [];
        if (!studios.length) return;

        var studioHtml = '<div class="donghua-studio-info" style="margin-top: 1em; padding: 12px 16px; background: rgba(255,255,255,0.05); border-radius: 8px;">' +
            '<div style="font-size: 0.9em; color: rgba(255,255,255,0.5); margin-bottom: 8px;">' + t('studio') + '</div>' +
            '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';

        studios.forEach(function (studio) {
            var studioData = findStudioByKey(studio.id, studio.name);
            var bgColor = studioData ? STUDIO_DATA[studioData].colors.bg : 'rgba(255,255,255,0.1)';
            var textColor = studioData ? STUDIO_DATA[studioData].colors.text : '#fff';

            studioHtml += '<div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: ' + bgColor + '; border-radius: 20px; color: ' + textColor + '; font-size: 0.85em;">' +
                '<span>' + studio.name + '</span>' +
                '</div>';
        });

        studioHtml += '</div></div>';

        var infoBlock = render.find('.full-start-new__right, .full-start__right').first();
        if (infoBlock.length) {
            infoBlock.append(studioHtml);
        }
    }

    function findStudioByKey(companyId, companyName) {
        var name = (companyName || '').toLowerCase();
        if (name.indexOf('bilibili') !== -1) return 'bilibili';
        if (name.indexOf('tencent') !== -1) return 'tencent';
        if (name.indexOf('youku') !== -1) return 'youku';
        if (name.indexOf('haoliners') !== -1) return 'haoliners';
        if (name.indexOf('wawayu') !== -1) return 'wawayu';
        if (name.indexOf('pickles') !== -1) return 'pickles';

        for (var key in STUDIO_TMDB_IDS) {
            if (STUDIO_TMDB_IDS[key].indexOf(companyId) !== -1) return key;
        }
        return null;
    }

    function addStreamingLinks(render, movie) {
        if (render.find('.donghua-streaming-links').length) return;

        var title = movie.original_name || movie.name || '';
        var encodedTitle = encodeURIComponent(title);

        var links = [
            { name: 'Bilibili', url: 'https://search.bilibili.com/all?keyword=' + encodedTitle, color: '#fb7299' },
            { name: 'Youku', url: 'https://so.youku.com/search_video/q_' + encodedTitle, color: '#1eb8e0' },
            { name: 'Tencent', url: 'https://v.qq.com/x/search/?q=' + encodedTitle, color: '#ff6a00' }
        ];

        var html = '<div class="donghua-streaming-links" style="margin-top: 1em; padding: 12px 16px; background: rgba(255,255,255,0.05); border-radius: 8px;">' +
            '<div style="font-size: 0.9em; color: rgba(255,255,255,0.5); margin-bottom: 8px;">' + t('streaming') + '</div>' +
            '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';

        links.forEach(function (link) {
            html += '<div class="selector donghua-stream-link" data-url="' + link.url + '" style="' +
                'display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; ' +
                'background: ' + link.color + '; border-radius: 20px; color: #fff; ' +
                'font-size: 0.85em; cursor: pointer; transition: transform 0.15s;">' +
                '<span>' + link.name + '</span>' +
                '</div>';
        });

        html += '</div></div>';

        var infoBlock = render.find('.full-start-new__right, .full-start__right').first();
        if (infoBlock.length) {
            infoBlock.append(html);

            render.find('.donghua-stream-link').on('hover:enter click', function () {
                var url = $(this).data('url');
                if (url) window.open(url, '_blank');
            });
        }
    }

    function addRecommendations(render, movie) {
        if (render.find('.donghua-recommendations').length) return;

        var network = new Lampa.Reguest();
        var url = buildTmdbUrl('tv/' + movie.id + '/recommendations', { page: 1 });

        network.silent(url, function (json) {
            if (!json || !json.results || !json.results.length) return;

            var items = json.results.slice(0, 10);
            Lampa.Utils.extendItemsParams(items, { style: { name: 'wide' } });

            var html = '<div class="donghua-recommendations" style="margin-top: 1.5em;">' +
                '<div class="items-line__head">' +
                '<div class="items-line__title">' + t('recommendations') + '</div>' +
                '</div>' +
                '<div class="items-line__body" style="display: flex; gap: 10px; overflow-x: auto; padding: 10px 0;">';

            items.forEach(function (item) {
                var poster = item.poster_path ? Lampa.TMDB.image('/t/p/w200' + item.poster_path) : '';
                var title = item.name || item.original_name || '';
                var year = (item.first_air_date || '').substring(0, 4);

                html += '<div class="selector donghua-rec-item" data-id="' + item.id + '" style="' +
                    'min-width: 120px; max-width: 120px; cursor: pointer; border-radius: 8px; overflow: hidden; background: rgba(255,255,255,0.05);">' +
                    '<div style="position: relative; padding-top: 150%; background: #222;">' +
                    (poster ? '<img src="' + poster + '" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" />' : '') +
                    '</div>' +
                    '<div style="padding: 6px 8px;">' +
                    '<div style="font-size: 0.75em; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + title + '</div>' +
                    (year ? '<div style="font-size: 0.65em; color: rgba(255,255,255,0.5);">' + year + '</div>' : '') +
                    '</div>' +
                    '</div>';
            });

            html += '</div></div>';

            render.find('.full-start-new__right, .full-start__right').first().append(html);

            render.find('.donghua-rec-item').on('hover:enter click', function () {
                var id = $(this).data('id');
                if (id) {
                    Lampa.Activity.push({
                        component: 'full',
                        id: id,
                        method: 'tv',
                        source: 'tmdb'
                    });
                }
            });
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

    function addContinueWatchingRow() {
        var progress = getStorage('donghua_progress', {});
        var keys = Object.keys(progress);
        if (!keys.length) return;

        var sorted = keys.sort(function (a, b) {
            return (progress[b].timestamp || 0) - (progress[a].timestamp || 0);
        }).slice(0, 20);

        var network = new Lampa.Reguest();
        var ids = sorted.join(',');

        var url = Lampa.TMDB.api('tv?api_key=' + Lampa.TMDB.key() +
            '&language=' + (Lampa.Storage.get('language', 'ru') || 'ru') +
            '&id=' + ids);

        network.silent(url, function (json) {
            if (!json || !json.results || !json.results.length) return;

            Lampa.Utils.extendItemsParams(json.results, { style: { name: 'wide' } });

            Lampa.Activity.push({
                title: t('continue_watching'),
                component: 'donghua_view',
                results: json.results
            });
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
    // ПОИСК
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

            // Анимация для кнопок стриминга
            '.donghua-stream-link:hover { transform: scale(1.05); }' +
            '.donghua-stream-link:active { transform: scale(0.98); }' +

            // Прокрутка рекомендаций
            '.donghua-recommendations .items-line__body::-webkit-scrollbar { height: 4px; }' +
            '.donghua-recommendations .items-line__body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }' +

            // Бейдж прогресса
            '.donghua-progress-badge { animation: donghuaPulse 2s ease-in-out infinite; }' +
            '@keyframes donghuaPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }' +

            // Студийные бейджи
            '.donghua-studio-info > div > div > div { transition: transform 0.15s; }' +
            '.donghua-studio-info > div > div > div:hover { transform: scale(1.05); }' +

            // Рекомендации hover
            '.donghua-rec-item { transition: transform 0.15s; }' +
            '.donghua-rec-item:hover { transform: scale(1.05); }' +
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
        Lampa.Component.add('donghua_studio', DonghuaStudioView);

        addStyles();
        addSearchSource();

        // Карточка: студии, стриминг, рекомендации
        initFullCardEnhancements();

        // Прогресс просмотра
        initProgressTracking();

        // Таймлайн
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
