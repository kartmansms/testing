(function () {
    'use strict';
    Lampa.Platform.tv();

    // Объект для управления данными в localStorage
    const FavoriteStorage = {
        key: 'favorite',
        get() {
            try {
                return JSON.parse(localStorage.getItem(this.key) || '{}');
            } catch (e) {
                console.error('Ошибка при загрузке данных из localStorage:', e);
                return {};
            }
        },
        set(data) {
            try {
                localStorage.setItem(this.key, JSON.stringify(data));
                Lampa.Favorite.init();
            } catch (e) {
                console.error('Ошибка при сохранении данных в localStorage:', e);
            }
        },
        addItem(category, id, cardData) {
            const data = this.get();
            data.registerItems = data.registerItems || [];
            if (!data.registerItems.includes(category)) {
                data.registerItems.unshift(category);
            }
            data.counters = data.counters || {};
            data.counters[category] = (data.counters[category] || 0) + 1;
            if (cardData) {
                data.card = data.card || [];
                if (!data.card.some(card => card.id === cardData.id)) {
                    data.card.push(cardData);
                }
            }
            if (id) {
                data[category] = data[category] || [];
                if (!data[category].includes(id)) {
                    data[category].unshift(id);
                }
            }
            this.set(data);
        },
        removeItem(category, id) {
            const data = this.get();
            if (data.registerItems) {
                data.registerItems = data.registerItems.filter(item => item !== category);
            }
            if (data.checkedItems && data.checkedItems[category]) {
                delete data.checkedItems[category];
            }
            if (data.counters && data.counters[category]) {
                data.counters[category]--;
                if (data.counters[category] <= 0) delete data.counters[category];
            }
            if (id && data[category]) {
                data[category] = data[category].filter(itemId => itemId !== id);
            }
            this.set(data);
        },
        toggleChecked(category, id, isChecked) {
            const data = this.get();
            data.checkedItems = data.checkedItems || {};
            data.checkedItems[category] = data.checkedItems[category] || {};
            data.checkedItems[category][id] = isChecked;
            this.set(data);
        }
    };

    // Кэшированные селекторы
    const $cards = $('.card');
    const $selectbox = $('body > .selectbox');
    const $registerContainer = $('.register:first');

    // Инициализация плагина
    function initializePlugin() {
        setupEventListeners();
        if (window.appready) {
            loadFavorites();
        } else {
            Lampa.Listener.follow('app', e => {
                if (e.type === 'ready') loadFavorites();
            });
        }
    }

    // Настройка слушателей событий
    function setupEventListeners() {
        Lampa.Listener.follow('toggle', handleToggleEvent);
        Lampa.Listener.follow('line', handleLineEvent);
        Lampa.Listener.follow('full', handleFullEvent);
        Lampa.Storage.listener.follow('change', handleStorageChange);
    }

    // Проверка активной категории
    function isActiveCategory(component) {
        const active = Lampa.Activity.active();
        return active.component === component || active.component === 'favorite';
    }

    // Обработка события toggle
    function handleToggleEvent(e) {
        if (!isActiveCategory('category_full')) return;
        console.log('Начинаем обработку события toggle с типом select');
        $cards.on('hover:long', function () {
            const $card = $(this);
            const index = $cards.index($card);
            const id = $cards[index].card_data.id;
            const cardData = $cards[index].card_data;
            console.log('Долгое нажатие на элемент, id:', id, 'и данные карты:', cardData);
            if ($('.selectbox__title').text() === 'Действие') {
                showFavoriteOptions(id, cardData, index);
            } else {
                console.log('Заголовок селектора не совпадает с "Действие"');
            }
        });
    }

    // Обработка события line
    function handleLineEvent(e) {
        if (!e.items) return;
        $cards.on('hover:long', function () {
            const $card = $(this);
            const index = $cards.index($card);
            const id = $cards[index].card_data.id;
            const cardData = $cards[index].card_data;
            if ($('.selectbox__title').text() === 'Действие') {
                showFavoriteOptions(id, cardData, index);
            }
        });
    }

    // Обработка события full
    function handleFullEvent(e) {
        if (e.type !== 'complite') return;
        $('.button--book').on('hover:enter', function () {
            const title = $('.selectbox__title').text();
            if (title === 'Действие' || title === 'Избранное') {
                const cardJson = localStorage.getItem('activity');
                if (cardJson) {
                    const { id, card } = JSON.parse(cardJson);
                    showFavoriteOptions(id, card);
                }
            }
        });
    }

    // Обработка изменения Storage
    function handleStorageChange(e) {
        if (e.name !== 'activity' || !isActiveCategory('bookmarks')) return;
        loadFavorites();
        Lampa.Controller.toggle('content');
    }

    // Показать опции избранного
    function showFavoriteOptions(id, cardData, cardIndex = null) {
        const data = FavoriteStorage.get();
        const items = data.registerItems || [];
        console.log('Избранные элементы:', items);

        const $bookmarkItem = $selectbox.find('.selectbox-item__title').filter((_, el) => $(el).text() === 'Закладки');
        items.forEach(category => {
            const $existingItem = $selectbox.find('.selectbox-item__title').filter((_, el) => $(el).text() === category);
            if ($existingItem.length === 0) {
                console.log('Элемент не существует, создаем новый:', category);
                const $newItem = $(`
                    <div class="selectbox-item selector">
                        <div class="selectbox-item__title">${category}</div>
                        <div class="selectbox-item__checkbox"></div>
                    </div>
                `);
                $newItem.insertBefore($bookmarkItem.parent());
                $newItem.on('hover:enter', () => toggleFavoriteItem(category, id, cardData, $newItem));
                checkIfPreviouslySelected(category, id, $newItem);
            } else {
                console.log('Элемент уже существует:', category);
            }
        });

        const $scrollBody = $selectbox.find('.scroll__body');
        Lampa.Controller.collectionSet($scrollBody);
        setTimeout(() => {
            const $selectors = $selectbox.find('.selector');
            if ($selectors.length > 0) {
                Lampa.Controller.focus($selectors.get(0));
                Navigator.focus($selectors.get(0));
                console.log('Фокус установлен на первый элемент в селекторе');
            }
        }, 10);
    }

    // Проверка, был ли элемент ранее отмечен
    function checkIfPreviouslySelected(category, id, $item) {
        const data = FavoriteStorage.get();
        const checkedItems = data.checkedItems || {};
        if (checkedItems[category] && checkedItems[category][id]) {
            $item.addClass('selectbox-item--checked');
            console.log('Элемент был отмечен ранее:', category);
        }
    }

    // Переключение состояния избранного
    function toggleFavoriteItem(category, id, cardData, $item) {
        const isChecked = !$item.hasClass('selectbox-item--checked');
        if (isChecked) {
            $item.addClass('selectbox-item--checked');
            FavoriteStorage.toggleChecked(category, id, true);
            FavoriteStorage.addItem(category, id, cardData);
        } else {
            $item.removeClass('selectbox-item--checked');
            FavoriteStorage.toggleChecked(category, id, false);
            FavoriteStorage.removeItem(category, id);
        }
        console.log('Нажат пункт:', category);
    }

    // Загрузка избранного
    function loadFavorites() {
        const data = FavoriteStorage.get();
        const items = data.registerItems || [];
        items.forEach(item => renderFavoriteItem(item, data.counters?.[item] || 0));

        if ($('.register__name:contains("Создать")').length === 0) {
            const $createButton = $(`
                <div class="register selector">
                    <div class="register__name" style="display: flex; justify-content: center; align-items: center;">Создать</div>
                    <div class="register__counter" style="display: flex; justify-content: center; align-items: center;">+</div>
                </div>
            `);
            $registerContainer.before($createButton);
            $createButton.on('hover:enter', () => createNewFavorite());
        }
    }

    // Создание нового элемента избранного
    function createNewFavorite() {
        Lampa.Input.edit({ title: 'Укажите название', value: '', free: true }, (newName) => {
            if (newName && $(`.(register__name:contains("${newName}")`).length === 0) {
                renderFavoriteItem(newName, 0);
                FavoriteStorage.addItem(newName);
                const $newItem = $(`.register__name:contains("${newName}")`).closest('.register');
                $newItem.find('.register__counter').text('0');
            }
            Lampa.Controller.toggle('content');
        });
    }

    // Отрисовка элемента избранного
    function renderFavoriteItem(name, count) {
        if ($(`.register__name:contains("${name}")`).length > 0) return;
        const $item = $('<div>', { class: 'register selector' })
            .append(
                $('<div>', { class: 'register__name', text: name }),
                $('<div>', { class: 'register__counter', text: count || '0' })
            );
        $registerContainer.append($item);
        $item.on('hover:long', () => {
            $item.remove();
            FavoriteStorage.removeItem(name);
            Lampa.Controller.toggle('content');
        });
        $item.on('hover:enter', () => {
            Lampa.Activity.push({ url: '', title: name, component: 'favorite', type: name, page: 1 });
        });
    }

    // Инициализация
    initializePlugin();
})();
