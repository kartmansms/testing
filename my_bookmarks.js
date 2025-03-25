(function () {
    'use strict';
    Lampa.Platform.tv();

    // Черный список доменов
    const BLACKLISTED_DOMAINS = [
        'lampa.line.pm', 'xabb.ru/h.js', 'ebu.land', 'abu.land', 'lampa32.github.io/torrserverjs',
        'abmsx.tech/torrserver.js', 'cxlampa.github.io/cub_off.js', 'lampatv.fun', 'xiaomishka.github.io',
        'uspeh.sbs/app.js', 'andreyrul54.github.io', 'lpp.xyz', 'llpp.xyz', 'scabrum.github.io',
        'bylampa.github.io', 'tinyurl.com', 't.me', '4pd.a', 'teletype.in', 'youtube.com'
    ];

    // Объект для управления данными в localStorage
    const FavoriteStorage = {
        key: 'favorite',
        get() {
            try {
                return JSON.parse(localStorage.getItem(this.key) || '{}');
            } catch (e) {
                console.error('[MyBookmarks] Ошибка при загрузке данных из localStorage:', e);
                return {};
            }
        },
        set(data) {
            try {
                localStorage.setItem(this.key, JSON.stringify(data));
                Lampa.Favorite.init();
                console.log('[MyBookmarks] Данные успешно сохранены в localStorage');
            } catch (e) {
                console.error('[MyBookmarks] Ошибка при сохранении данных в localStorage:', e);
            }
        },
        addItem(category, id, cardData) {
            const data = this.get();
            data.registerItems = data.registerItems || [];
            if (!data.registerItems.includes(category)) {
                data.registerItems.unshift(category);
                console.log(`[MyBookmarks] Добавлена новая категория: ${category}`);
            }
            data.counters = data.counters || {};
            data.counters[category] = (data.counters[category] || 0) + 1;
            if (cardData) {
                data.card = data.card || [];
                if (!data.card.some(card => card.id === cardData.id)) {
                    data.card.push(cardData);
                    console.log(`[MyBookmarks] Добавлена карточка с ID: ${cardData.id}`);
                }
            }
            if (id) {
                data[category] = data[category] || [];
                if (!data[category].includes(id)) {
                    data[category].unshift(id);
                    console.log(`[MyBookmarks] Добавлен ID ${id} в категорию ${category}`);
                }
            }
            this.set(data);
        },
        removeItem(category, id) {
            const data = this.get();
            if (data.registerItems) {
                data.registerItems = data.registerItems.filter(item => item !== category);
                console.log(`[MyBookmarks] Удалена категория: ${category}`);
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
                console.log(`[MyBookmarks] Удален ID ${id} из категории ${category}`);
            }
            this.set(data);
        },
        toggleChecked(category, id, isChecked) {
            const data = this.get();
            data.checkedItems = data.checkedItems || {};
            data.checkedItems[category] = data.checkedItems[category] || {};
            data.checkedItems[category][id] = isChecked;
            this.set(data);
        },
        clearCache() {
            localStorage.removeItem(this.key);
            console.log('[MyBookmarks] Кэш плагина очищен');
        }
    };

    // Проверка URL на черный список
    function isBlacklisted(url) {
        return BLACKLISTED_DOMAINS.some(domain => url.includes(domain));
    }

    // Проверка URL плагина
    const PLUGIN_URL = 'https://kartmansms.github.io/testing/my_bookmarks.js';
    if (isBlacklisted(PLUGIN_URL)) {
        console.error('[MyBookmarks] Плагин загружается из черного списка доменов. Загрузка отменена.');
        return;
    } else {
        console.log('[MyBookmarks] Плагин успешно прошел проверку черного списка');
    }

    // Кэшированные селекторы
    const $cards = $('.card');
    const $selectbox = $('body > .selectbox');
    const $registerContainer = $('.register:first');

    // Проверка доступности Lampa.Listener
    function waitForLampaListener(callback) {
        if (typeof Lampa !== 'undefined' && Lampa.Listener) {
            console.log('[MyBookmarks] Lampa.Listener доступен, продолжаем инициализацию');
            callback();
        } else {
            console.warn('[MyBookmarks] Lampa.Listener недоступен, ждем инициализации...');
            const interval = setInterval(() => {
                if (typeof Lampa !== 'undefined' && Lampa.Listener) {
                    clearInterval(interval);
                    console.log('[MyBookmarks] Lampa.Listener стал доступен, продолжаем инициализацию');
                    callback();
                }
            }, 100);
            // Таймаут на случай, если Lampa так и не загрузится
            setTimeout(() => {
                if (!Lampa?.Listener) {
                    clearInterval(interval);
                    console.error('[MyBookmarks] Lampa.Listener так и не стал доступен. Плагин не может быть инициализирован.');
                }
            }, 10000); // 10 секунд ожидания
        }
    }

    // Инициализация плагина
    function initializePlugin() {
        console.log('[MyBookmarks] Инициализация плагина...');
        waitForLampaListener(() => {
            try {
                setupEventListeners();
                if (window.appready) {
                    loadFavorites();
                } else {
                    Lampa.Listener.follow('app', e => {
                        if (e.type === 'ready') loadFavorites();
                    });
                }
            } catch (e) {
                console.error('[MyBookmarks] Ошибка при инициализации плагина:', e);
            }
        });
    }

    // Настройка слушателей событий с проверкой на конфликты
    function setupEventListeners() {
        const events = ['toggle', 'line', 'full', 'app', 'modify', 'clear'];
        events.forEach(event => {
            if (Lampa.Listener._events?.[event]?.length > 0) {
                console.warn(`[MyBookmarks] Обнаружены существующие обработчики для события ${event}. Возможны конфликты.`);
            }
        });

        try {
            Lampa.Listener.follow('toggle', handleToggleEvent);
            Lampa.Listener.follow('line', handleLineEvent);
            Lampa.Listener.follow('full', handleFullEvent);
            Lampa.Storage.listener.follow('change', handleStorageChange);
            // Добавление команды очистки кэша
            Lampa.Listener.follow('clear', () => {
                FavoriteStorage.clearCache();
            });
            // Поддержка модификации плагина
            Lampa.Listener.follow('modify', (e) => {
                if (e.url === PLUGIN_URL) {
                    console.log('[MyBookmarks] Плагин модифицирован:', e);
                    e.status = 1; // Устанавливаем статус модификации
                }
            });
            console.log('[MyBookmarks] Слушатели событий успешно установлены');
        } catch (e) {
            console.error('[MyBookmarks] Ошибка при установке слушателей событий:', e);
        }
    }

    // Проверка активной категории
    function isActiveCategory(component) {
        const active = Lampa.Activity.active();
        return active.component === component || active.component === 'favorite';
    }

    // Обработка события toggle
    function handleToggleEvent(e) {
        if (!isActiveCategory('category_full')) return;
        console.log('[MyBookmarks] Начинаем обработку события toggle с типом select');
        $cards.off('hover:long').on('hover:long', function () {
            const $card = $(this);
            const index = $cards.index($card);
            const id = $cards[index].card_data.id;
            const cardData = $cards[index].card_data;
            console.log(`[MyBookmarks] Долгое нажатие на элемент, id: ${id}, данные карты:`, cardData);
            if ($('.selectbox__title').text() === 'Действие') {
                showFavoriteOptions(id, cardData, index);
            } else {
                console.log('[MyBookmarks] Заголовок селектора не совпадает с "Действие"');
            }
        });
    }

    // Обработка события line
    function handleLineEvent(e) {
        if (!e.items) return;
        console.log('[MyBookmarks] Обработка события line');
        $cards.off('hover:long').on('hover:long', function () {
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
        console.log('[MyBookmarks] Обработка события full');
        $('.button--book').off('hover:enter').on('hover:enter', function () {
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
        console.log('[MyBookmarks] Обнаружено изменение в Storage, обновляем избранное');
        loadFavorites();
        Lampa.Controller.toggle('content');
    }

    // Показать опции избранного
    function showFavoriteOptions(id, cardData, cardIndex = null) {
        const data = FavoriteStorage.get();
        const items = data.registerItems || [];
        console.log('[MyBookmarks] Избранные элементы:', items);

        const $bookmarkItem = $selectbox.find('.selectbox-item__title').filter((_, el) => $(el).text() === 'Закладки');
        items.forEach(category => {
            const $existingItem = $selectbox.find('.selectbox-item__title').filter((_, el) => $(el).text() === category);
            if ($existingItem.length === 0) {
                console.log(`[MyBookmarks] Элемент не существует, создаем новый: ${category}`);
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
                console.log(`[MyBookmarks] Элемент уже существует: ${category}`);
            }
        });

        const $scrollBody = $selectbox.find('.scroll__body');
        Lampa.Controller.collectionSet($scrollBody);
        setTimeout(() => {
            const $selectors = $selectbox.find('.selector');
            if ($selectors.length > 0) {
                Lampa.Controller.focus($selectors.get(0));
                Navigator.focus($selectors.get(0));
                console.log('[MyBookmarks] Фокус установлен на первый элемент в селекторе');
            }
        }, 10);
    }

    // Проверка, был ли элемент ранее отмечен
    function checkIfPreviouslySelected(category, id, $item) {
        const data = FavoriteStorage.get();
        const checkedItems = data.checkedItems || {};
        if (checkedItems[category] && checkedItems[category][id]) {
            $item.addClass('selectbox-item--checked');
            console.log(`[MyBookmarks] Элемент был отмечен ранее: ${category}`);
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
        console.log(`[MyBookmarks] Нажат пункт: ${category}`);
    }

    // Загрузка избранного
    function loadFavorites() {
        console.log('[MyBookmarks] Загрузка избранного...');
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
        console.log('[MyBookmarks] Создание новой категории...');
        Lampa.Input.edit({ title: 'Укажите название', value: '', free: true }, (newName) => {
            if (newName && $(`.register__name:contains("${newName}")`).length === 0) {
                renderFavoriteItem(newName, 0);
                FavoriteStorage.addItem(newName);
                const $newItem = $(`.register__name:contains("${newName}")`).closest('.register');
                $newItem.find('.register__counter').text('0');
                console.log(`[MyBookmarks] Создана новая категория: ${newName}`);
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
            console.log(`[MyBookmarks] Удалена категория: ${name}`);
        });
        $item.on('hover:enter', () => {
            Lampa.Activity.push({ url: '', title: name, component: 'favorite', type: name, page: 1 });
            console.log(`[MyBookmarks] Открыта категория: ${name}`);
        });
    }

    // Инициализация
    initializePlugin();
})();