(function() {
    'use strict';
    
    Lampa.Platform.tv();
    
    function decodeFunction(strSeed, numOffset) {
        var arrDictionary = getDictionary();
        return decodeFunction = function(strKey, numPos) {
            strKey = strKey - 0x6d;
            var strValue = arrDictionary[strKey];
            return strValue;
        }, decodeFunction(strSeed, numOffset);
    }
    
    function getDictionary() {
        var arrValues = [
            'bind', 'push', 'info', 'trace', 'Аниме', '.menu .menu__list', 
            '2679rioYDH', '7670113ccmYNY', 'append', 'category_full', 
            'prototype', '928390fdGVpz', 'log', '(((.+)+)+)+$', 'Activity', 
            'table', 'Listener', '862970ddcJQT', 'bylampa', '7NQbEXp', 
            '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><path fill="currentColor" fill-rule="evenodd" d="m368.256 214.573l-102.627 187.35c40.554 71.844 73.647 97.07 138.664 94.503c63.67-2.514 136.974-89.127 95.694-163.243L397.205 150.94c-3.676 12.266-25.16 55.748-28.95 63.634M216.393 440.625C104.077 583.676-57.957 425.793 20.85 302.892c0 0 83.895-147.024 116.521-204.303c25.3-44.418 53.644-72.37 90.497-81.33c44.94-10.926 97.565 12.834 125.62 56.167c19.497 30.113 36.752 57.676 6.343 109.738c-3.613 6.184-136.326 248.402-143.438 257.46m8.014-264.595c-30.696-17.696-30.696-62.177 0-79.873s69.273 4.544 69.273 39.936s-38.578 57.633-69.273 39.937" clip-rule="evenodd"/></svg>',
            'apply', '2678706QNniho', 'return (function() ', 'toString', 'tmdb', 
            'ready', 'exception', '9LsvRWR', 'length', '2380fnBJzm', '330728ppUshb', 
            'origin', 'console', '<li class="menu__item selector" data-action="anime_tmdb"><div class="menu__ico">', 
            'Noty', 'constructor', 
            'discover/tv?vote_average.gte=6.5&vote_average.lte=9.5&first_air_date.lte=2026-12-31&first_air_date.gte=2020-01-01&with_original_language=ja', 
            '__proto__', 'error', 'search', 'Manifest', 'appready', '1wMPSpO', '572828ylXGPs'
        ];
        getDictionary = function() { return arrValues; };
        return getDictionary();
    }

    // Деобфускация и инициализация
    (function(provider, validator) {
        var decode = decodeFunction;
        var result = provider();
        while (!![]) {
            try {
                var checkValue = 
                    parseInt(decode(0x87)) / 0x1 * (parseInt(decode(0x88)) / 0x2) +
                    -parseInt(decode(0x8f)) / 0x3 * (-parseInt(decode(0x7a)) / 0x4) +
                    -parseInt(decode(0x94)) / 0x5 +
                    -parseInt(decode(0x72)) / 0x6 * (-parseInt(decode(0x6f)) / 0x7) +
                    -parseInt(decode(0x7b)) / 0x8 * (-parseInt(decode(0x78)) / 0x9) +
                    -parseInt(decode(0x6d)) / 0xa +
                    -parseInt(decode(0x90)) / 0xb;
                if (checkValue === validator) break;
                else result.push(result.shift());
            } catch (error) {
                result.push(result.shift());
            }
        }
    })(getDictionary, 0x5219b);

    // Основная логика
    (function() {
        var mainDecoder = decodeFunction;
        var sandboxA = (function() {
            var isActive = !![];
            return function(context, callback) {
                var wrapper = isActive ? function() {
                    if (callback) {
                        var result = callback.apply(context, arguments);
                        callback = null;
                        return result;
                    }
                } : function() {};
                isActive = ![];
                return wrapper;
            };
        })();

        var sandboxB = (function() {
            var isActive = !![];
            return function(context, callback) {
                var wrapper = isActive ? function() {
                    var decoder = decodeFunction;
                    if (callback) {
                        var result = callback[decoder(0x71)](context, arguments);
                        callback = null;
                        return result;
                    }
                } : function() {};
                isActive = ![];
                return wrapper;
            };
        })();

        'use strict';

        function initModule() {
            var decoder = decodeFunction;
            var selfCheckA = sandboxA(this, function() {
                var localDecoder = decodeFunction;
                return selfCheckA[localDecoder(0x74)]()
                    [localDecoder(0x84)](localDecoder(0x96))
                    [localDecoder(0x74)]()
                    [localDecoder(0x80)](selfCheckA)
                    [localDecoder(0x84)](localDecoder(0x96));
            });
            selfCheckA();

            var selfCheckB = sandboxB(this, function() {
                var localDecoder = decodeFunction;
                var getGlobal = function() {
                    var localDecoder = decodeFunction;
                    var globalObj;
                    try {
                        globalObj = Function(localDecoder(0x73) + '{}.constructor("return this")( )')();
                    } catch (e) {
                        globalObj = window;
                    }
                    return globalObj;
                };

                var global = getGlobal();
                var consoleProxy = global.console = global.console || {};
                var methods = [
                    localDecoder(0x95), 'warn', localDecoder(0x8b),
                    localDecoder(0x83), localDecoder(0x77),
                    localDecoder(0x98), localDecoder(0x8c)
                ];

                for (var i = 0; i < methods.length; i++) {
                    var originalMethod = sandboxB.constructor.prototype.bind(sandboxB);
                    var methodName = methods[i];
                    var originalConsoleMethod = consoleProxy[methodName] || originalMethod;
                    originalMethod.toString = originalConsoleMethod.toString.bind(originalConsoleMethod);
                    consoleProxy[methodName] = originalMethod;
                }
            });
            selfCheckB();

            if (Lampa.Manifest.source !== 'bylampa') {
                Lampa.Noty.show('Ошибка доступа');
                return;
            }

            var svgIcon = decoder(0x70);
            var menuItem = $(
                decoder(0x7e) + 
                svgIcon + 
                '</div><div class="menu__text">Аниме</div></li>'
            );

            menuItem.on('hover:enter', function() {
                var localDecoder = decodeFunction;
                Lampa.Activity.push({
                    url: localDecoder(0x81),
                    title: localDecoder(0x8d),
                    component: localDecoder(0x92),
                    source: localDecoder(0x75),
                    card_type: 'true',
                    page: 1
                });
            });

            $(decoder(0x8e)).eq(0).append(menuItem);
        }

        if (window.appready) initModule();
        else Lampa.Listener.follow('app', function(event) {
            var localDecoder = decodeFunction;
            if (event.type === localDecoder(0x76)) initModule();
        });
    })();
})();
