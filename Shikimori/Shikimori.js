function Component$1(object) {
    var userLang = Lampa.Storage.field('language');
    var network = new Lampa.Reguest();
    var scroll = new Lampa.Scroll({
        mask: true,
        over: true,
        step: 250
    });
    var items = [];
    var html = $("<div class='Shikimori-module'></div>");
    var head = $("<div class='Shikimori-head torrent-filter'><div class='Shikimori__home simple-button simple-button--filter selector'>Главная</div><div class='Shikimori__search simple-button simple-button--filter selector'>Фильтр</div></div>");
    var body = $('<div class="Shikimori-catalog--list category-full"></div>');
    var active, last;

    this.create = function () {
        API.main(object, this.build.bind(this), this.empty.bind(this));
    };

    this.build = function (result) {
        var _this = this;
        scroll.minus();
        scroll.onWheel = function (step) {
            if (!Lampa.Controller.own(_this)) _this.start();
            if (step > 0) Navigator.move('down');else Navigator.move('up');
        };
        scroll.onEnd = function () {
            object.page++;
            API.main(object, _this.build.bind(_this), _this.empty.bind(_this));
        };
        this.headeraction();
        this.body(result);
        scroll.append(head);
        scroll.append(body);
        html.append(scroll.render(true));
        this.activity.loader(false);
        this.activity.toggle();
    };

    this.headeraction = function () {
        var settings = {
            "url": "https://shikimori.one/api/genres",
            "method": "GET",
            "timeout": 0
        };
        var filters = {};
        $.ajax(settings).done(function (response) {
            var filteredResponse = response.filter(function (item) {
                return item.entry_type === "Anime";
            });
            var modifiedResponse = filteredResponse.map(function (item) {
                return _objectSpread2(_objectSpread2({}, item), {}, {
                    title: item.name,
                    name: undefined
                });
            });
            filters.kind = {
                title: 'Жанр',
                items: modifiedResponse
            };
        });
        filters.AnimeKindEnum = {
            title: 'Тип',
            items: [{
                title: "TV Сериал",
                code: "tv"
            }, {
                title: "Фильм",
                code: "movie"
            }, {
                title: "OVA",
                code: "ova"
            }, {
                title: "ONA",
                code: "ona"
            }, {
                title: "Спешл",
                code: "special"
            }, {
                title: "TV Спешл",
                code: "tv_special"
            }, {
                title: "Музыка",
                code: "music"
            }, {
                title: "PV",
                code: "pv"
            }, {
                title: "CM",
                code: "cm"
            }]
        };
        filters.status = {
            title: 'Статус',
            items: [{
                title: "Анонс",
                code: "anons"
            }, {
                title: "Онгоиг",
                code: "ongoing"
            }, {
                title: "Вышло",
                code: "released"
            }]
        };
        filters.sort = {
            title: 'Сортировка',
            items: [{
                title: "По рейтингу",
                code: "ranked"
            }, {
                title: "По популярности",
                code: "popularity"
            }, {
                title: "По алфавиту",
                code: "name"
            }, {
                title: "По дате выхода",
                code: "aired_on"
            }, {
                title: "По типу",
                code: "kind"
            }, {
                title: "По количеству эпизодов",
                code: "episodes"
            }, {
                title: "По статусу",
                code: "status"
            }, {
                title: "По рейтингу Shikimori",
                code: "ranked_shiki"
            }]
        };
        filters.seasons = {
            title: 'Сезон',
            items: generateSeasonJSON()
        };
        var serverElement = head.find('.Shikimori__search');
        function queryForShikimori() {
            var query = {};
            filters.AnimeKindEnum.items.forEach(function (a) {
                if (a.selected) query.kind = a.code;
            });
            filters.status.items.forEach(function (a) {
                if (a.selected) query.status = a.code;
            });
            filters.kind.items.forEach(function (a) {
                if (a.selected) query.genre = a.id;
            });
            filters.sort.items.forEach(function (a) {
                if (a.selected) query.sort = a.code;
            });
            filters.seasons.items.forEach(function (a) {
                if (a.selected) query.seasons = a.code;
            });
            return query;
        }
        function selected(where) {
            var title = [];
            where.items.forEach(function (a) {
                if (a.selected || a.checked) title.push(a.title);
            });
            where.subtitle = title.length ? title.join(', ') : Lampa.Lang.translate('nochoice');
        }
        function select(where, a) {
            where.forEach(function (element) {
                element.selected = false;
            });
            a.selected = true;
        }
        function submenu(item, main) {
            Lampa.Select.show({
                title: item.title,
                items: item.items,
                onBack: main,
                onSelect: function onSelect(a) {
                    select(item.items, a);
                    main();
                }
            });
        }
        function mainMenu() {
            for (var i in filters) selected(filters[i]);
            Lampa.Select.show({
                title: 'Фильтры',
                items: [{
                    title: Lampa.Lang.translate('search_start'),
                    searchShikimori: true
                }, filters.status, filters.AnimeKindEnum, filters.kind, filters.sort, filters.seasons],
                onBack: function onBack() {
                    Lampa.Controller.toggle("content");
                },
                onSelect: function onSelect(a) {
                    if (a.searchShikimori) {
                        search();
                    } else submenu(a, mainMenu);
                }
            });
        }
        function search() {
            var query = queryForShikimori();
            var params = {
                url: '',
                title: 'Shikimori',
                component: 'Shikimori',
                page: 1
            };
            if (query.kind) {
                params.kind = query.kind;
            }
            if (query.status) {
                params.status = query.status;
            }
            if (query.genre) {
                params.genre = query.genre;
            }
            if (query.sort) {
                params.sort = query.sort;
            }
            if (query.seasons) {
                params.seasons = query.seasons;
            }
            Lampa.Activity.push(params);
        }
        serverElement.on('hover:enter', function () {
            mainMenu();
        });
        var homeElement = head.find('.Shikimori__home');
        homeElement.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '',
                title: 'Shikimori',
                component: 'Shikimori',
                page: 1
            });
        });
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
            }).on("hover:enter", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
                return _regeneratorRuntime().wrap(function _callee$(_context) {
                    while (1) switch (_context.prev = _context.next) {
                        case 0:
                            API.search(anime);
                        case 1:
                        case "end":
                            return _context.stop();
                    }
                }, _callee);
            })));
            body.append(item.render(true));
            items.push(item);
        });
    };
    this.start = function () {
        if (Lampa.Activity.active().activity !== this.activity) return;
        Lampa.Controller.add("content", {
            toggle: function toggle() {
                Lampa.Controller.collectionSet(scroll.render());
                Lampa.Controller.collectionFocus(last || false, scroll.render());
            },
            left: function left() {
                if (Navigator.canmove("left")) Navigator.move("left");else Lampa.Controller.toggle("menu");
            },
            right: function right() {
                Navigator.move("right");
            },
            up: function up() {
                if (Navigator.canmove("up")) Navigator.move("up");else Lampa.Controller.toggle("head");
            },
            down: function down() {
                if (Navigator.canmove("down")) Navigator.move("down");
            },
            back: this.back
        });
        Lampa.Controller.toggle("content");
    };
    this.pause = function () {};
    this.stop = function () {};
    this.render = function (js) {
        return js ? html : $(html);
    };
    this.destroy = function () {
        network.clear();
        Lampa.Arrays.destroy(items);
        scroll.destroy();
        html.remove();
        items = null;
        network = null;
    };
}