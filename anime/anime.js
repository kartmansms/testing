// Основной компонент для отображения каталога
function Component(object) {
    var userLang = Lampa.Storage.field('language');
    var network = new Lampa.Reguest();
    var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
    var items = [];
    var html = $("<div class='TMDBAnime-module'></div>");
    var head = $("<div class='TMDBAnime-head torrent-filter'><div class='TMDBAnime__home simple-button simple-button--filter selector'>Главная</div><div class='TMDBAnime__search simple-button simple-button--filter selector'>Фильтры</div></div>");
    var body = $('<div class="TMDBAnime-catalog--list category-full"></div>');
    var active, last;

    this.create = function () {
        API.main(object, this.build.bind(this), this.empty.bind(this));
    };

    this.build = function (result) {
        var _this = this;
        scroll.minus();
        scroll.onWheel = function (step) {
            if (!Lampa.Controller.own(_this)) _this.start();
            if (step > 0) Navigator.move('down'); else Navigator.move('up');
        };
        if (!object.isTop100) {
            scroll.onEnd = function () {
                object.page++;
                API.main(object, _this.build.bind(_this), _this.empty.bind(_this));
            };
        }

        this.headeraction();
        this.body(result);
        scroll.append(head);
        scroll.append(body);
        html.append(scroll.render(true));
        this.activity.loader(false);
        this.activity.toggle();
    };

    this.headeraction = function () {
        var filters = {};
        $.ajax({
            url: "https://api.themoviedb.org/3/genre/tv/list?api_key=4ef0d7355d9ffb5151e987764708ce96&language=" + Lampa.Storage.field('language'),
            method: "GET"
        }).done(function (response) {
            filters.genre = {
                title: 'Жанр',
                items: response.genres.map(function (item) {
                    return { title: item.name, code: item.id };
                })
            };
        });

        filters.status = {
            title: 'Статус',
            items: [
                { title: "Анонс", code: "In Production" },
                { title: "Онгоинг", code: "Returning Series" },
                { title: "Вышло", code: "Ended" }
            ]
        };

        filters.sort = {
            title: 'Сортировка',
            items: [
                { title: "По рейтингу", code: "vote_average.desc" },
                { title: "По популярности", code: "popularity.desc" },
                { title: "По дате выхода", code: "first_air_date.desc" }
            ]
        };

        function generateYearRanges() {
            var currentYear = new Date().getFullYear();
            var ranges = [];
            for (var year = currentYear; year >= currentYear - 20; year--) {
                ranges.push({ code: `${year}`, title: `${year} год` });
            }
            return ranges;
        }

        filters.seasons = {
            title: 'Год',
            items: generateYearRanges()
        };

        var homeElement = head.find('.TMDBAnime__home');
        homeElement.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '',
                title: 'TMDB Anime',
                component: 'TMDBAnime',
                page: 1
            });
        });

        var serverElement = head.find('.TMDBAnime__search');
        function queryForTMDB() {
            var query = {};
            filters.genre.items.forEach(function (a) { if (a.selected) query.genre = a.code; });
            filters.status.items.forEach(function (a) { if (a.selected) query.status = a.code; });
            filters.sort.items.forEach(function (a) { if (a.selected) query.sort = a.code; });
            filters.seasons.items.forEach(function (a) { if (a.selected) query.seasons = a.code; });
            return query;
        }

        function selected(where) {
            var title = [];
            where.items.forEach(function (a) { if (a.selected) title.push(a.title); });
            where.subtitle = title.length ? title.join(', ') : Lampa.Lang.translate('nochoice');
        }

        function select(where, a) {
            where.forEach(function (element) { element.selected = false; });
            a.selected = true;
        }

        function submenu(item, main) {
            Lampa.Select.show({
                title: item.title,
                items: item.items,
                onBack: main,
                onSelect: function (a) {
                    select(item.items, a);
                    main();
                }
            });
        }

        function mainMenu() {
            for (var i in filters) selected(filters[i]);
            Lampa.Select.show({
                title: 'Фильтры',
                items: [
                    { title: Lampa.Lang.translate('search_start'), searchTMDB: true },
                    filters.status, filters.genre, filters.sort, filters.seasons
                ],
                onBack: function () { Lampa.Controller.toggle("content"); },
                onSelect: function (a) {
                    if (a.searchTMDB) search(); else submenu(a, mainMenu);
                }
            });
        }

        function search() {
            var query = queryForTMDB();
            var params = {
                url: '',
                title: 'TMDB Anime',
                component: 'TMDBAnime',
                page: 1
            };
            if (query.genre) params.genre = query.genre;
            if (query.status) params.status = query.status;
            if (query.sort) params.sort = query.sort;
            if (query.seasons) params.seasons = query.seasons;
            Lampa.Activity.push(params);
        }

        serverElement.on('hover:enter', function () { mainMenu(); });
    };

    this.empty = function () {
        var empty = new Lampa.Empty();
        html.appendChild(empty.render(true));
        this.start = empty.start;
        this.activity.loader(false);
        this.activity.toggle();
    };

    this.body = function (data) {
        data.forEach(function (anime) {
            var item = new Card(anime, userLang);
            item.render(true).on("hover:focus", function () {
                last = item.render()[0];
                active = items.indexOf(item);
                scroll.update(items[active].render(true), true);
            }).on("hover:enter", function () {
                API.search(anime);
            });
            body.append(item.render(true));
            items.push(item);
        });
    };

    this.start = function () {
        if (Lampa.Activity.active().activity !== this.activity) return;
        Lampa.Controller.add("content", {
            toggle: function () {
                Lampa.Controller.collectionSet(scroll.render());
                Lampa.Controller.collectionFocus(last || false, scroll.render());
            },
            left: function () { if (Navigator.canmove("left")) Navigator.move("left"); else Lampa.Controller.toggle("menu"); },
            right: function () { Navigator.move("right"); },
            up: function () { if (Navigator.canmove("up")) Navigator.move("up"); else Lampa.Controller.toggle("head"); },
            down: function () { if (Navigator.canmove("down")) Navigator.move("down"); },
            back: this.back
        });
        Lampa.Controller.toggle("content");
    };

    // Добавляем пустой метод pause, чтобы избежать ошибки
    this.pause = function () {
        // Пустая реализация, если Lampa требует этот метод
    };

    this.stop = function () {
        network.clear();
        Lampa.Arrays.destroy(items);
        scroll.destroy();
        html.remove();
        items = null;
        network = null;
    };

    this.render = function (js) { return js ? html : $(html); };
    this.destroy = function () {
        network.clear();
        Lampa.Arrays.destroy(items);
        scroll.destroy();
        html.remove();
        items = null;
        network = null;
    };
}
