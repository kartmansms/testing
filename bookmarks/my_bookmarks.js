(function() {
    'use strict';

    // Инициализация платформы (TV)
    Lampa.Platform.tv();

    // Основные константы
    const SELECTOR_ACTION = 'Действие';
    const SELECTOR_BOOKMARKS = 'Закладки';
    const STORAGE_KEY = 'favorite';
    const CARD_SELECTOR = '.card';
    const SELECTBOX_SELECTOR = 'body > .selectbox';
    const SELECTBOX_ITEM_TITLE = '.selectbox-item__title';
    const SELECTBOX_ITEM_CHECKED = 'selectbox-item--checked';

    // Обработчик события "toggle"
    Lampa.Listener.on('toggle', function(event) {
        if (Lampa.Activity.active().type === 'category_full' || Lampa.Activity.active().type === 'favorite') {
            console.log('Начинаем обработку события toggle с типом select');

            // Обработка долгого нажатия на карточку
            $(CARD_SELECTOR).on('hover:long', function() {
                const cardIndex = $(CARD_SELECTOR).index(this);
                const cardData = $(CARD_SELECTOR).eq(cardIndex).data('card');
                const cardId = cardData.id;

                console.log('Событие hover:long сработало на элементе', this);
                console.log('Долгое нажатие на элемент, id:', cardId, 'и данные карты:', cardData);

                if ($('.selectbox__title').text() === SELECTOR_ACTION) {
                    const storageData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
                    const bookmarks = storageData.registerItems || [];

                    console.log('Избранные элементы:', bookmarks);

                    const bookmarksItem = $(SELECTBOX_SELECTOR).find(SELECTBOX_ITEM_TITLE).filter(function() {
                        return $(this).text() === SELECTOR_BOOKMARKS;
                    });

                    // Добавление элементов в меню
                    bookmarks.forEach(function(bookmarkName) {
                        console.log('Проверяем существование элемента с именем:', bookmarkName);

                        const existingItem = $(SELECTBOX_SELECTOR).find(SELECTBOX_ITEM_TITLE).filter(function() {
                            return $(this).text() === bookmarkName;
                        });

                        if (existingItem.length === 0) {
                            console.log('Элемент не существует, создаем новый:', bookmarkName);

                            const newItem = $(
                                '<div class="selectbox-item selector">' +
                                '<div class="selectbox-item__title">' + bookmarkName + '</div>' +
                                '<div class="selectbox-item__checkbox"></div>' +
                                '</div>'
                            );

                            newItem.insertBefore(bookmarksItem.parent());
                            newItem.on('hover:enter', function() {
                                const itemText = $(this).find(SELECTBOX_ITEM_TITLE).text();
                                const isChecked = $(this).hasClass(SELECTBOX_ITEM_CHECKED);

                                if (isChecked) {
                                    $(this).removeClass(SELECTBOX_ITEM_CHECKED);
                                    removeFromBookmark(itemText, cardId);
                                    decrementCounter(itemText, cardId);
                                } else {
                                    $(this).addClass(SELECTBOX_ITEM_CHECKED);
                                    addToBookmark(itemText, cardId, true);
                                    addToCounter(itemText, cardId, cardData);
                                }

                                console.log('Нажат пункт:', itemText);
                            });

                            // Проверка, был ли элемент уже отмечен
                            const favoriteData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
                            const checkedItems = favoriteData.checkedItems || {};
                            if (checkedItems[bookmarkName] && checkedItems[bookmarkName][cardId]) {
                                newItem.addClass(SELECTBOX_ITEM_CHECKED);
                                console.log('Элемент был отмечен ранее:', bookmarkName);
                            }
                        } else {
                            console.log('Элемент уже существует:', bookmarkName);
                        }
                    });

                    // Установка фокуса на первый элемент
                    const scrollBody = $(SELECTBOX_SELECTOR).find('.scroll__body');
                    Lampa.Controller.collectionSet(scrollBody);

                    setTimeout(function() {
                        const firstSelector = $(SELECTBOX_SELECTOR).find('.selector');
                        if (firstSelector.length > 0) {
                            Lampa.Controller.focus(firstSelector.get(0));
                            Navigator.focus(firstSelector.get(0));
                            console.log('Фокус установлен на первый элемент в селекторе');
                        }
                    }, 10);
                } else {
                    console.log('Заголовок селектора не совпадает с "Действие"');
                }
            });
        }
    });

    // Функция добавления в избранное
    function addToBookmark(bookmarkName, cardId, isChecked) {
        const storageData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        
        if (!storageData.checkedItems) {
            storageData.checkedItems = {};
        }
        
        if (!storageData.checkedItems[bookmarkName]) {
            storageData.checkedItems[bookmarkName] = {};
        }
        
        storageData.checkedItems[bookmarkName][cardId] = isChecked;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
    }

    // Функция удаления из избранного
    function removeFromBookmark(bookmarkName, cardId) {
        const storageData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        
        if (storageData.checkedItems && storageData.checkedItems[bookmarkName]) {
            delete storageData.checkedItems[bookmarkName][cardId];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
        }
    }

    // Функция увеличения счетчика
    function addToCounter(bookmarkName, cardId, cardData) {
        const storageData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        
        if (!storageData.registerItems) {
            storageData.registerItems = [];
        }
        
        if (!storageData.registerItems.includes(bookmarkName)) {
            storageData.registerItems.unshift(bookmarkName);
        }
        
        if (!storageData.counters) {
            storageData.counters = {};
        }
        
        const currentCount = storageData.counters[bookmarkName] || 0;
        storageData.counters[bookmarkName] = currentCount + 1;
        
        if (cardData) {
            if (!storageData.card) {
                storageData.card = [];
            }
            
            const existingCard = storageData.card.some(item => item.id === cardData.id);
            if (!existingCard) {
                storageData.card.push(cardData);
            }
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
        Lampa.Favorite.init();
    }

    // Функция уменьшения счетчика
    function decrementCounter(bookmarkName, cardId) {
        const storageData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        
        if (storageData.counters && storageData.counters[bookmarkName]) {
            const currentCount = storageData.counters[bookmarkName] || 0;
            if (currentCount > 0) {
                storageData.counters[bookmarkName] = currentCount - 1;
            }
        }
        
        if (storageData[bookmarkName]) {
            storageData[bookmarkName] = storageData[bookmarkName].filter(id => id !== cardId);
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
    }

    // Инициализация при готовности приложения
    if (window.appready) {
        initBookmarks();
    } else {
        Lampa.Listener.on('app', function(event) {
            if (event.type === 'ready') {
                initBookmarks();
            }
        });
    }

    function initBookmarks() {
        // Инициализация функционала закладок
        createRegisterSelector();
        loadBookmarks();
        
        Lampa.Storage.collection.on('change', function(event) {
            if (event.name === 'selected_card') {
                createRegisterSelector();
                loadBookmarks();
                Lampa.Controller.toggle('content');
            }
        });
    }

    // Создание селектора регистрации
    function createRegisterSelector() {
        if ($('.register:first').length === 0) {
            const registerSelector = $('<div class="register selector"></div>')
                .append($('<div class="register__name" style="display:flex;justify-content:center;align-items:center;">Создать</div>'))
                .append($('<div class="register__counter" style="display:flex;justify-content:center;align-items:center;">+</div>'));
            
            $('.button--book').after(registerSelector);
            
            registerSelector.on('hover:enter', function() {
                Lampa.Input.edit({
                    title: 'Укажите название',
                    value: '',
                    free: true
                }, function(inputValue) {
                    if (inputValue !== '') {
                        if ($('.register__name:contains("' + inputValue + '")').length === 0) {
                            createBookmarkItem(inputValue);
                            const storageData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
                            storageData.registerItems = storageData.registerItems || [];
                            storageData.registerItems.push(inputValue);
                            storageData.counters = storageData.counters || {};
                            storageData.counters[inputValue] = 0;
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
                            
                            const newItem = $('.register__name:contains("' + inputValue + '")').closest('.register');
                            newItem.find('.register__counter').text('0');
                        }
                    }
                    Lampa.Controller.toggle('content');
                });
            });
        }
    }

    // Загрузка закладок
    function loadBookmarks() {
        const storageData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        const bookmarks = storageData.registerItems || [];
        
        bookmarks.forEach(function(bookmarkName) {
            if ($('.register__name:contains("' + bookmarkName + '")').length === 0) {
                const counterValue = storageData.counters && storageData.counters[bookmarkName] ? storageData.counters[bookmarkName] : 0;
                createBookmarkItem(bookmarkName, counterValue);
            }
        });
    }

    // Создание элемента закладки
    function createBookmarkItem(bookmarkName, counterValue = 0) {
        const bookmarkItem = $('<div class="register selector"></div>')
            .append($('<div class="register__name"></div>').text(bookmarkName))
            .append($('<div class="register__counter"></div>').text(counterValue || '0'));
        
        bookmarkItem.on('hover:long', function() {
            bookmarkItem.remove();
            removeBookmark(bookmarkName);
            
            const storageData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
            if (storageData.counters && storageData.counters[bookmarkName]) {
                delete storageData.counters[bookmarkName];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
            }
            
            Lampa.Controller.toggle('content');
        });
        
        bookmarkItem.on('hover:enter', function() {
            Lampa.Activity.push({
                url: '',
                title: bookmarkName,
                component: 'favorite',
                type: bookmarkName,
                page: 1
            });
        });
        
        $('.button--book').after(bookmarkItem);
    }

    // Удаление закладки
    function removeBookmark(bookmarkName) {
        const storageData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        
        if (storageData.registerItems) {
            storageData.registerItems = storageData.registerItems.filter(item => item !== bookmarkName);
        }
        
        if (storageData.checkedItems && storageData.checkedItems[bookmarkName]) {
            delete storageData.checkedItems[bookmarkName];
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
        Lampa.Favorite.init();
    }
})();
