(function () {
    'use strict';

    // Вспомогательная функция для получения всех ключей объекта, включая символические
    function ownKeys(object, enumerableOnly) {
        var keys = Object.keys(object);
        if (Object.getOwnPropertySymbols) {
            var symbols = Object.getOwnPropertySymbols(object);
            if (enumerableOnly) {
                symbols = symbols.filter(function (symbol) {
                    return Object.getOwnPropertyDescriptor(object, symbol).enumerable;
                });
            }
            keys.push.apply(keys, symbols);
        }
        return keys;
    }

    // Полифил для Object.assign с поддержкой символических ключей
    function _objectSpread2(target) {
        for (var index = 1; index < arguments.length; index++) {
            var source = arguments[index] !== null ? arguments[index] : {};
            if (index % 2) {
                ownKeys(Object(source), true).forEach(function (key) {
                    _defineProperty(target, key, source[key]);
                });
            } else if (Object.getOwnPropertyDescriptors) {
                Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
            } else {
                ownKeys(Object(source)).forEach(function (key) {
                    Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
                });
            }
        }
        return target;
    }

    // Полифил для работы с генераторами (Regenerator Runtime)
    function _regeneratorRuntime() {
        _regeneratorRuntime = function () {
            return runtime;
        };
        var runtime = {},
            objectPrototype = Object.prototype,
            hasOwnProperty = objectPrototype.hasOwnProperty,
            defineProperty = Object.defineProperty || function (object, key, descriptor) {
                object[key] = descriptor.value;
            },
            symbol = typeof Symbol === 'function' ? Symbol : {},
            iteratorSymbol = symbol.iterator || '@@iterator',
            asyncIteratorSymbol = symbol.asyncIterator || '@@asyncIterator',
            toStringTagSymbol = symbol.toStringTag || '@@toStringTag';

        function define(object, key, value) {
            Object.defineProperty(object, key, {
                value: value,
                enumerable: true,
                configurable: true,
                writable: true
            });
            return object[key];
        }

        try {
            define({}, '');
        } catch (error) {
            define = function (object, key, value) {
                object[key] = value;
            };
        }

        function wrap(innerFunction, outerFunction, self, tryList) {
            var generatorPrototype = outerFunction && outerFunction.prototype instanceof Generator ? outerFunction : Generator,
                context = Object.create(generatorPrototype.prototype),
                invokeMethod = makeInvokeMethod(innerFunction, self, tryList);

            defineProperty(context, '_invoke', { value: invokeMethod });
            return context;
        }

        function tryCatch(tryFunction, thisArg, argument) {
            try {
                return { type: 'normal', argument: tryFunction.call(thisArg, argument) };
            } catch (error) {
                return { type: 'throw', argument: error };
            }
        }

        runtime.wrap = wrap;

        var suspendedStart = 'suspendedStart',
            suspendedYield = 'suspendedYield',
            executing = 'executing',
            completed = 'completed',
            generatorState = {};

        function Generator() { }

        function GeneratorFunction() { }

        function GeneratorFunctionPrototype() { }

        var generatorFunctionPrototype = {};
        define(generatorFunctionPrototype, iteratorSymbol, function () {
            return this;
        });

        var objectGetPrototypeOf = Object.getPrototypeOf,
            prototypeOfPrototype = objectGetPrototypeOf && objectGetPrototypeOf(objectGetPrototypeOf([]));
        if (prototypeOfPrototype && prototypeOfPrototype !== objectPrototype && hasOwnProperty.call(prototypeOfPrototype, iteratorSymbol)) {
            generatorFunctionPrototype = prototypeOfPrototype;
        }

        var generatorPrototype = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(generatorFunctionPrototype);

        function defineIteratorMethods(prototype) {
            ['next', 'throw', 'return'].forEach(function (methodName) {
                define(prototype, methodName, function (argument) {
                    return this._invoke(methodName, argument);
                });
            });
        }

        function AsyncIterator(innerIterator, promiseConstructor) {
            function invoke(method, argument, resolve, reject) {
                var result = tryCatch(innerIterator[method], innerIterator, argument);
                if (result.type !== 'throw') {
                    var value = result.argument,
                        isAwait = value && typeof value === 'object' && hasOwnProperty.call(value, '__await');
                    if (isAwait) {
                        return promiseConstructor.resolve(value.__await).then(function (resolvedValue) {
                            invoke('next', resolvedValue, resolve, reject);
                        }, function (error) {
                            invoke('throw', error, resolve, reject);
                        });
                    }
                    return promiseConstructor.resolve(value).then(function (resolvedValue) {
                        result.argument = resolvedValue;
                        resolve(result);
                    }, function (error) {
                        invoke('throw', error, resolve, reject);
                    });
                }
                reject(result.argument);
            }

            var currentPromise;
            defineProperty(this, '_invoke', {
                value: function (method, argument) {
                    function callInvokeWithMethodAndArgument() {
                        return new promiseConstructor(function (resolve, reject) {
                            invoke(method, argument, resolve, reject);
                        });
                    }
                    return currentPromise = currentPromise ? currentPromise.then(callInvokeWithMethodAndArgument, callInvokeWithMethodAndArgument) : callInvokeWithMethodAndArgument();
                }
            });
        }

        function makeInvokeMethod(generator, self, context) {
            var state = suspendedStart;
            return function (method, argument) {
                if (state === executing) {
                    throw new Error('Генератор уже запущен');
                }
                if (state === completed) {
                    if (method === 'throw') {
                        throw argument;
                    }
                    return { value: undefined, done: true };
                }

                context.method = method;
                context.arg = argument;

                while (true) {
                    var delegate = context.delegate;
                    if (delegate) {
                        var delegateResult = maybeInvokeDelegate(delegate, context);
                        if (delegateResult) {
                            if (delegateResult === generatorState) continue;
                            return delegateResult;
                        }
                    }

                    if (method === 'next') {
                        context.sent = context._sent = context.arg;
                    } else if (method === 'throw') {
                        if (state === suspendedStart) {
                            state = completed;
                            throw context.arg;
                        }
                        context.dispatchException(context.arg);
                    } else if (method === 'return') {
                        context.abrupt('return', context.arg);
                    }

                    state = executing;
                    var generatorResult = tryCatch(generator, self, context);
                    if (generatorResult.type === 'normal') {
                        state = context.done ? completed : suspendedYield;
                        if (generatorResult.arg === generatorState) continue;
                        return { value: generatorResult.arg, done: context.done };
                    }

                    if (generatorResult.type === 'throw') {
                        state = completed;
                        context.method = 'throw';
                        context.arg = generatorResult.arg;
                    }
                }
            };
        }

        function maybeInvokeDelegate(delegate, context) {
            var method = context.method,
                iterator = delegate.iterator[method];
            if (iterator === undefined) {
                context.delegate = null;
                if (method === 'throw' && delegate.iterator.return) {
                    context.method = 'return';
                    context.arg = undefined;
                    maybeInvokeDelegate(delegate, context);
                    if (context.method === 'throw') return generatorState;
                } else if (method !== 'return') {
                    context.method = 'throw';
                    context.arg = new TypeError('Итератор не предоставляет метод "' + method + '"');
                    return generatorState;
                }
            }

            var result = tryCatch(iterator, delegate.iterator, context.arg);
            if (result.type === 'throw') {
                context.method = 'throw';
                context.arg = result.arg;
                context.delegate = null;
                return generatorState;
            }

            var returnValue = result.arg;
            if (returnValue) {
                if (returnValue.done) {
                    context[delegate.resultName] = returnValue.value;
                    context.next = delegate.nextLoc;
                    if (context.method !== 'return') {
                        context.method = 'next';
                        context.arg = undefined;
                    }
                    context.delegate = null;
                    return generatorState;
                }
                return returnValue;
            }

            context.method = 'throw';
            context.arg = new TypeError('Результат итератора не является объектом');
            context.delegate = null;
            return generatorState;
        }

        function pushTryEntry(tryEntry) {
            var entry = { tryLoc: tryEntry[0] };
            if (tryEntry.length > 1) entry.catchLoc = tryEntry[1];
            if (tryEntry.length > 2) {
                entry.finallyLoc = tryEntry[2];
                entry.afterLoc = tryEntry[3];
            }
            this.tryEntries.push(entry);
        }

        function resetTryEntry(tryEntry) {
            var completion = tryEntry.completion || {};
            completion.type = 'normal';
            delete completion.arg;
            tryEntry.completion = completion;
        }

        function Context(tryList) {
            this.tryEntries = [{ tryLoc: 'root' }];
            tryList.forEach(pushTryEntry, this);
            this.reset(true);
        }

        function values(iterable) {
            if (iterable || iterable === '') {
                var iterator = iterable[iteratorSymbol];
                if (iterator) return iterator.call(iterable);
                if (typeof iterable.next === 'function') return iterable;
                if (!isNaN(iterable.length)) {
                    var index = -1,
                        next = function () {
                            while (++index < iterable.length) {
                                if (hasOwnProperty.call(iterable, index)) {
                                    next.value = iterable[index];
                                    next.done = false;
                                    return next;
                                }
                            }
                            next.value = undefined;
                            next.done = true;
                            return next;
                        };
                    next.next = next;
                    return next;
                }
            }
            throw new TypeError(typeof iterable + ' не является итерируемым');
        }

        GeneratorFunctionPrototype.prototype = GeneratorFunctionPrototype;
        defineProperty(GeneratorFunctionPrototype, 'constructor', { value: GeneratorFunctionPrototype, configurable: true });
        defineProperty(GeneratorFunction, 'constructor', { value: GeneratorFunction, configurable: true });
        GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, 'GeneratorFunction');

        runtime.isGeneratorFunction = function (functionObject) {
            var constructor = typeof functionObject === 'function' && functionObject.constructor;
            return !!constructor && (constructor === GeneratorFunction || (constructor.displayName || constructor.name) === 'GeneratorFunction');
        };

        runtime.mark = function (generatorFunction) {
            if (Object.setPrototypeOf) {
                Object.setPrototypeOf(generatorFunction, GeneratorFunctionPrototype);
            } else {
                generatorFunction.__proto__ = GeneratorFunctionPrototype;
                define(generatorFunction, toStringTagSymbol, 'GeneratorFunction');
            }
            generatorFunction.prototype = Object.create(generatorPrototype);
            return generatorFunction;
        };

        runtime.awrap = function (argument) {
            return { __await: argument };
        };

        defineIteratorMethods(AsyncIterator.prototype);
        define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
            return this;
        });
        runtime.AsyncIterator = AsyncIterator;

        runtime.async = function (innerFunction, outerFunction, errorCallback, successCallback, promiseConstructor) {
            if (promiseConstructor === undefined) promiseConstructor = Promise;
            var iterator = new AsyncIterator(wrap(innerFunction, outerFunction, errorCallback, successCallback), promiseConstructor);
            return runtime.isGeneratorFunction(outerFunction) ? iterator : iterator.next().then(function (result) {
                return result.done ? result.value : iterator.next();
            });
        };

        defineIteratorMethods(generatorPrototype);
        define(generatorPrototype, toStringTagSymbol, 'Generator');
        define(generatorPrototype, iteratorSymbol, function () {
            return this;
        });
        define(generatorPrototype, 'toString', function () {
            return '[object Generator]';
        });

        runtime.keys = function (object) {
            var keys = Object.keys(object),
                reversedKeys = [];
            for (var key in keys) reversedKeys.push(key);
            reversedKeys.reverse();
            return function next() {
                while (reversedKeys.length) {
                    var key = reversedKeys.pop();
                    if (key in object) {
                        next.value = key;
                        next.done = false;
                        return next;
                    }
                }
                next.done = true;
                return next;
            };
        };

        runtime.values = values;

        Context.prototype = {
            constructor: Context,
            reset: function (resetAll) {
                this.prev = 0;
                this.next = 0;
                this.sent = this._sent = undefined;
                this.done = false;
                this.delegate = null;
                this.method = 'next';
                this.arg = undefined;
                this.tryEntries.forEach(resetTryEntry);
                if (!resetAll) {
                    for (var property in this) {
                        if (property.charAt(0) === 't' && hasOwnProperty.call(this, property) && !isNaN(+property.slice(1))) {
                            this[property] = undefined;
                        }
                    }
                }
            },
            stop: function () {
                this.done = true;
                var completion = this.tryEntries[0].completion;
                if (completion.type === 'throw') {
                    throw completion.arg;
                }
                return this.rval;
            },
            dispatchException: function (exception) {
                if (this.done) {
                    throw exception;
                }
                var context = this;
                function handle(location, hasCatch) {
                    completion.type = 'throw';
                    completion.arg = exception;
                    context.next = location;
                    if (hasCatch) {
                        context.method = 'next';
                        context.arg = undefined;
                    }
                    return !!hasCatch;
                }
                for (var index = this.tryEntries.length - 1; index >= 0; index--) {
                    var tryEntry = this.tryEntries[index],
                        completion = tryEntry.completion;
                    if (tryEntry.tryLoc === 'root') {
                        return handle('end');
                    }
                    if (tryEntry.tryLoc <= this.prev) {
                        var hasCatch = hasOwnProperty.call(tryEntry, 'catchLoc'),
                            hasFinally = hasOwnProperty.call(tryEntry, 'finallyLoc');
                        if (hasCatch && hasFinally) {
                            if (this.prev < tryEntry.catchLoc) {
                                return handle(tryEntry.catchLoc, true);
                            }
                            if (this.prev < tryEntry.finallyLoc) {
                                return handle(tryEntry.finallyLoc);
                            }
                        } else if (hasCatch) {
                            if (this.prev < tryEntry.catchLoc) {
                                return handle(tryEntry.catchLoc, true);
                            }
                        } else if (hasFinally) {
                            if (this.prev < tryEntry.finallyLoc) {
                                return handle(tryEntry.finallyLoc);
                            }
                        } else {
                            throw new Error('Оператор try без catch или finally');
                        }
                    }
                }
            },
            abrupt: function (type, argument) {
                for (var index = this.tryEntries.length - 1; index >= 0; index--) {
                    var tryEntry = this.tryEntries[index];
                    if (tryEntry.tryLoc <= this.prev && hasOwnProperty.call(tryEntry, 'finallyLoc') && this.prev < tryEntry.finallyLoc) {
                        var finallyEntry = tryEntry;
                        break;
                    }
                }
                if (finallyEntry && (type === 'break' || type === 'continue') && finallyEntry.tryLoc <= argument && argument <= finallyEntry.finallyLoc) {
                    finallyEntry = null;
                }
                var completion = finallyEntry ? finallyEntry.completion : {};
                completion.type = type;
                completion.arg = argument;
                if (finallyEntry) {
                    this.method = 'next';
                    this.next = finallyEntry.finallyLoc;
                    return generatorState;
                }
                return this.complete(completion);
            },
            complete: function (completion, afterLoc) {
                if (completion.type === 'throw') {
                    throw completion.arg;
                }
                if (completion.type === 'break' || completion.type === 'continue') {
                    this.next = completion.arg;
                } else if (completion.type === 'return') {
                    this.rval = this.arg = completion.arg;
                    this.method = 'return';
                    this.next = 'end';
                } else if (completion.type === 'normal' && afterLoc) {
                    this.next = afterLoc;
                }
                return generatorState;
            },
            finish: function (finallyLoc) {
                for (var index = this.tryEntries.length - 1; index >= 0; index--) {
                    var tryEntry = this.tryEntries[index];
                    if (tryEntry.finallyLoc === finallyLoc) {
                        this.complete(tryEntry.completion, tryEntry.afterLoc);
                        resetTryEntry(tryEntry);
                        return generatorState;
                    }
                }
            },
            catch: function (tryLoc) {
                for (var index = this.tryEntries.length - 1; index >= 0; index--) {
                    var tryEntry = this.tryEntries[index];
                    if (tryEntry.tryLoc === tryLoc) {
                        var completion = tryEntry.completion;
                        if (completion.type === 'throw') {
                            var exception = completion.arg;
                            resetTryEntry(tryEntry);
                        }
                        return exception;
                    }
                }
                throw new Error('Незаконная попытка catch');
            },
            delegateYield: function (iterable, resultName, nextLoc) {
                this.delegate = {
                    iterator: values(iterable),
                    resultName: resultName,
                    nextLoc: nextLoc
                };
                if (this.method === 'next') {
                    this.arg = undefined;
                }
                return generatorState;
            }
        };
        return runtime;
    }

    // Преобразование значения к примитивному типу
    function _toPrimitive(input, hint) {
        if (typeof input !== 'object' || input === null) {
            return input;
        }
        var toPrimitive = input[Symbol.toPrimitive];
        if (toPrimitive !== undefined) {
            var result = toPrimitive.call(input, hint || 'default');
            if (typeof result !== 'object') {
                return result;
            }
            throw new TypeError('@@toPrimitive должен возвращать примитивное значение.');
        }
        return hint === 'string' ? String(input) : Number(input);
    }

    // Преобразование ключа свойства в строку или символ
    function _toPropertyKey(key) {
        var primitive = _toPrimitive(key, 'string');
        return typeof primitive === 'symbol' ? primitive : String(primitive);
    }

    // Создание или обновление свойства объекта
    function _defineProperty(object, key, value) {
        key = _toPropertyKey(key);
        if (key in object) {
            Object.defineProperty(object, key, {
                value: value,
                enumerable: true,
                configurable: true,
                writable: true
            });
        } else {
            object[key] = value;
        }
        return object;
    }

    // Основная функция для выполнения GraphQL-запроса к Shikimori API
    function main(params, oncomplite, onerror) {
        $(document).ready(function () {
            var limit = params.isTop100 ? 50 : (params.limit || 36);
            var query = `\n\tquery Animes {\n\tanimes(limit: ${limit}, order: ${params.sort || 'aired_on'}, page: ${params.page}\n\t`;
            if (params.kind) query += `, kind: "${params.kind}"`;
            if (params.status) query += `, status: "${params.status}"`;
            if (params.genre) query += `, genre: "${params.genre}"`;
            if (params.seasons) query += `, season: "${params.seasons}"`;
            query += `) {\n                    id\n                    name\n                    russian\n                    licenseNameRu\n                    english\n                    japanese\n                    kind\n                    score\n                    status\n                    season\n                    airedOn { year }\n                    poster {\n                        originalUrl\n                    }\n                }\n            }\n        `;

            if (params.isTop100) {
                var requests = [
                    $.ajax({
                        url: 'https://shikimori.one/api/graphql',
                        method: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({ query: query.replace(`page: ${params.page}`, "page: 1") })
                    }),
                    $.ajax({
                        url: 'https://shikimori.one/api/graphql',
                        method: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({ query: query.replace(`page: ${params.page}`, "page: 2") })
                    })
                ];
                Promise.all(requests).then(function (responses) {
                    var allAnimes = responses[0].data.animes.concat(responses[1].data.animes);
                    oncomplite(allAnimes);
                }).catch(function (error) {
                    Lampa.Noty.show(`Ошибка при запросе к Shikimori API: ${error.message || 'Неизвестная ошибка'}`);
                    onerror(error);
                });
            } else {
                $.ajax({
                    url: 'https://shikimori.one/api/graphql',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({ query: query }),
                    success: function (response) {
                        oncomplite(response.data.animes);
                    },
                    error: function (_error) {
                        Lampa.Noty.show(`Ошибка при запросе к Shikimori API: ${_error.statusText || _error.message || 'Неизвестная ошибка'}`);
                        onerror(_error);
                    }
                });
            }
        });
    }

    // Поиск информации об аниме через внешние API
    function search(animeData) {
        function cleanName(name) {
            var regex = /\b(Season|Part)\s*\d*\.?\d*\b/gi;
            var cleanedName = name.replace(regex, '').trim();
            cleanedName = cleanedName.replace(/\s{2,}/g, ' ');
            return cleanedName;
        }
        $.get("https://arm.haglund.dev/api/v2/ids?source=myanimelist&id=".concat(animeData.id), function (response) {
            if (response === null) {
                searchTmdb(animeData.name, function (tmdbResponse) {
                    handleTmdbResponse(tmdbResponse, animeData.japanese);
                });
            } else if (response.themoviedb === null) {
                searchTmdb(animeData.name, function (tmdbResponse) {
                    handleTmdbResponse(tmdbResponse, animeData.japanese);
                });
            } else {
                getTmdb(response.themoviedb, animeData.kind, processResults);
            }
        }).fail(function (jqXHR) {
            if (jqXHR.status === 404) {
                searchTmdb(animeData.name, function (tmdbResponse) {
                    handleTmdbResponse(tmdbResponse, animeData.japanese);
                });
            } else {
                console.error('Ошибка при получении данных с animeapi.my.id:', jqXHR.status);
            }
        });

        function searchTmdb(query, callback) {
            var apiKey = "4ef0d7355d9ffb5151e987764708ce96";
            var apiUrlTMDB = 'https://api.themoviedb.org/3/';
            var apiUrlProxy = 'apitmdb.' + (Lampa.Manifest && Lampa.Manifest.cub_domain ? Lampa.Manifest.cub_domain : 'cub.red') + '/3/';
            var request = "search/multi?api_key=".concat(apiKey, "&language=").concat(Lampa.Storage.field('language'), "&include_adult=true&query=").concat(cleanName(query));
            $.get(Lampa.Storage.field('proxy_tmdb') ? Lampa.Utils.protocol() + apiUrlProxy + request : apiUrlTMDB + request, callback);
        }

        function getTmdb(id) {
            var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'movie';
            var callback = arguments.length > 2 ? arguments[2] : undefined;
            var apiKey = "4ef0d7355d9ffb5151e987764708ce96";
            var apiUrlTMDB = 'https://api.themoviedb.org/3/';
            var apiUrlProxy = 'apitmdb.' + (Lampa.Manifest && Lampa.Manifest.cub_domain ? Lampa.Manifest.cub_domain : 'cub.red') + '/3/';
            var request = "".concat(type, "/").concat(id, "?api_key=").concat(apiKey, "&language=").concat(Lampa.Storage.field('language'));
            $.get(Lampa.Storage.field('proxy_tmdb') ? Lampa.Utils.protocol() + apiUrlProxy + request : apiUrlTMDB + request, callback);
        }

        function handleTmdbResponse(tmdbResponse, fallbackQuery) {
            if (tmdbResponse.total_results === 0) {
                searchTmdb(fallbackQuery, handleFallbackResponse);
            } else {
                processResults(tmdbResponse);
            }
        }
        function handleFallbackResponse(fallbackResponse) {
            processResults(fallbackResponse);
        }
        function processResults(response) {
            var menu = [];
            if (response.total_results !== undefined) {
                if (response.total_results === 0) {
                    Lampa.Noty.show('Не смог победить!!!');
                } else if (response.total_results === 1) {
                    Lampa.Activity.push({
                        url: '',
                        component: 'full',
                        id: response.results[0].id,
                        method: response.results[0].media_type,
                        card: response.results[0]
                    });
                } else if (response.total_results > 1) {
                    response.results.forEach(function (animeItem) {
                        menu.push({
                            title: "[".concat(animeItem.media_type.toUpperCase(), "] ").concat(animeItem.name ? animeItem.name : animeItem.title),
                            card: animeItem
                        });
                    });
                    Lampa.Select.show({
                        title: 'Найти',
                        items: menu,
                        onBack: function onBack() {
                            Lampa.Controller.toggle("content");
                        },
                        onSelect: function onSelect(a) {
                            Lampa.Activity.push({
                                url: '',
                                component: 'full',
                                id: a.card.id,
                                method: a.card.media_type,
                                card: a.card
                            });
                        }
                    });
                }
            } else {
                Lampa.Activity.push({
                    url: '',
                    component: 'full',
                    id: response.id,
                    method: response.number_of_episodes ? 'tv' : 'movie',
                    card: response
                });
            }
        }
    }

    var API = {
        main: main,
        search: search
    };

    // Класс для создания карточки аниме
    function Card(data, userLang) {
        var typeTranslations = {
            'tv': 'ТВ',
            'movie': 'Фильм',
            'ova': 'OVA',
            'ona': 'ONA',
            'special': 'Спешл',
            'tv_special': 'ТВ Спешл',
            'music': 'Музыка',
            'pv': 'PV',
            'cm': 'CM'
        };

        var statusTranslations = {
            'anons': 'Анонс',
            'ongoing': 'Онгоинг',
            'released': 'Вышло'
        };

        var formattedSeason = data.season ? data.season.replace(/_/g, ' ')
            .replace(/^\w/, function (c) { return c.toUpperCase(); })
            .replace(/(winter|spring|summer|fall)/gi, function (match) {
                return {
                    'winter': 'Зима',
                    'spring': 'Весна',
                    'summer': 'Лето',
                    'fall': 'Осень'
                }[match.toLowerCase()];
            }) : '';

        function capitalizeFirstLetter(string) {
            if (!string) return string;
            return string.charAt(0).toUpperCase() + string.slice(1);
        }

        var item = Lampa.Template.get("Shikimori-Card", {
            img: data.poster.originalUrl,
            type: typeTranslations[data.kind] || data.kind.toUpperCase(),
            status: statusTranslations[data.status] || capitalizeFirstLetter(data.status),
            rate: data.score,
            title: userLang === 'ru' ? data.russian || data.name || data.japanese : data.name || data.japanese,
            season: data.season !== null ? formattedSeason : data.airedOn.year
        });

        this.render = function () {
            return item;
        };
        this.destroy = function () {
            item.remove();
        };
    }

    // Основной компонент для отображения каталога
    function Component$1(object) {
        var userLang = Lampa.Storage.field('language') || 'en';
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true,
            step: 250
        });
        var items = [];
        var html = $("<div class='Shikimori-module'></div>");
        var head = $("<div class='Shikimori-head torrent-filter'><div class='Shikimori__home simple-button simple-button--filter selector'>Главная</div><div class='Shikimori__top100_tv simple-button simple-button--filter selector'>Топ100_ТВ</div><div class='Shikimori__top100_movies simple-button simple-button--filter selector'>Топ100_Фильмы</div><div class='Shikimori__top100_ona simple-button simple-button--filter selector'>Топ100_ONA</div><div class='Shikimori__search simple-button simple-button--filter selector'>Фильтр</div></div>");
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
                if (step > 0) Navigator.move('down'); else Navigator.move('up');
            };
            if (!object.isTop100) {
                scroll.onEnd = function () {
                    object.page++;
                    API.main(object, _this.build.bind(_this), _this.empty.bind(this));
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
            var settings = {
                "url": "https://shikimori.one/api/genres",
                "method": "GET",
                "timeout": 0
            };
            var filters = {};
            $.ajax(settings).done(function (response) {
                var genreTranslations = {
                    "Action": "Экшен",
                    "Adventure": "Приключения",
                    "Cars": "Машины",
                    "Comedy": "Комедия",
                    "Dementia": "Деменция",
                    "Demons": "Демоны",
                    "Drama": "Драма",
                    "Ecchi": "Этти",
                    "Fantasy": "Фэнтези",
                    "Game": "Игра",
                    "Harem": "Гарем",
                    "Historical": "Исторический",
                    "Horror": "Ужасы",
                    "Josei": "Дзёсей",
                    "Kids": "Детский",
                    "Magic": "Магия",
                    "Martial Arts": "Боевые искусства",
                    "Mecha": "Меха",
                    "Military": "Военный",
                    "Music": "Музыка",
                    "Mystery": "Мистика",
                    "Parody": "Пародия",
                    "Police": "Полиция",
                    "Psychological": "Психологический",
                    "Romance": "Романтика",
                    "Samurai": "Самурайский",
                    "School": "Школьный",
                    "Sci-Fi": "Научная фантастика",
                    "Seinen": "Сейнэн",
                    "Shoujo": "Сёдзё",
                    "Shoujo Ai": "Сёдзё-ай",
                    "Shounen": "Сёнэн",
                    "Shounen Ai": "Сёнэн-ай",
                    "Slice of Life": "Повседневность",
                    "Space": "Космос",
                    "Sports": "Спорт",
                    "Super Power": "Суперсила",
                    "Supernatural": "Сверхъестественное",
                    "Thriller": "Триллер",
                    "Erotica": "Эротика",
                    "Hentai": "Хентай",
                    "Yaoi": "Яой",
                    "Yuri": "Юри",
                    "Gourmet": "Гурман",
                    "Work Life": "Трудяги",
                    "Vampire": "Вампиры"
                };

                var filteredResponse = response.filter(function (item) {
                    return item.entry_type === "Anime";
                }).map(function (item) {
                    return _objectSpread2(_objectSpread2({}, item), {}, {
                        title: genreTranslations[item.name] || item.name,
                        name: undefined
                    });
                });
                filters.kind = {
                    title: 'Жанр',
                    items: filteredResponse
                };
            });
            filters.AnimeKindEnum = {
                title: 'Тип',
                items: [{
                    title: "ТВ Сериал",
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
                    title: "ТВ Спешл",
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
                    title: "Онгоинг",
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

            function getCurrentSeason(date) {
                var month = date.getMonth();
                var year = date.getFullYear();
                var seasons = ['winter', 'spring', 'summer', 'fall'];
                var seasonTitles = ['Зима', 'Весна', 'Лето', 'Осень'];
                var seasonIndex = Math.floor((month + 1) / 3) % 4;
                return {
                    code: `${seasons[seasonIndex]}_${year}`,
                    title: `${seasonTitles[seasonIndex]} ${year}`
                };
            }

            function generateDynamicSeasons() {
                var now = new Date();
                var seasons = [];
                for (var i = 1; i >= -3; i--) {
                    var nextDate = new Date(now);
                    nextDate.setMonth(now.getMonth() + 3 * i);
                    seasons.push(getCurrentSeason(nextDate));
                }
                return seasons;
            }

            function generateYearRanges() {
                var currentYear = new Date().getFullYear();
                var ranges = [];
                for (var year = currentYear; year >= currentYear - 3; year--) {
                    ranges.push({
                        code: `${year}`,
                        title: `${year} год`
                    });
                }
                for (var startYear = currentYear; startYear >= currentYear - 20; startYear -= 5) {
                    var endYear = startYear - 5;
                    if (endYear <= startYear) {
                        ranges.push({
                            code: `${endYear}_${startYear}`,
                            title: `${startYear}–${endYear} год`
                        });
                    }
                    if (endYear === currentYear - 20) break;
                }
                return ranges;
            }

            function generateSeasonJSON() {
                var dynamicSeasons = generateDynamicSeasons();
                var yearRanges = generateYearRanges();
                return dynamicSeasons.concat(yearRanges);
            }

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
                    items: [{
                        title: Lampa.Lang.translate('search_start'),
                        searchShikimori: true
                    }, filters.status, filters.AnimeKindEnum, filters.kind, filters.sort, filters.seasons],
                    onBack: function () {
                        Lampa.Controller.toggle("content");
                    },
                    onSelect: function (a) {
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
                if (query.kind) params.kind = query.kind;
                if (query.status) params.status = query.status;
                if (query.genre) params.genre = query.genre;
                if (query.sort) params.sort = query.sort;
                if (query.seasons) params.seasons = query.seasons;
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

            var top100TvElement = head.find('.Shikimori__top100_tv');
            top100TvElement.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'Shikimori Топ100_ТВ',
                    component: 'Shikimori',
                    page: 1,
                    sort: 'ranked',
                    kind: 'tv',
                    status: 'released',
                    isTop100: true
                });
            });

            var top100MoviesElement = head.find('.Shikimori__top100_movies');
            top100MoviesElement.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'Shikimori Топ100_Фильмы',
                    component: 'Shikimori',
                    page: 1,
                    sort: 'ranked',
                    kind: 'movie',
                    status: 'released',
                    isTop100: true
                });
            });

            var top100OnaElement = head.find('.Shikimori__top100_ona');
            top100OnaElement.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'Shikimori Топ100_ONA',
                    component: 'Shikimori',
                    page: 1,
                    sort: 'ranked',
                    kind: 'ona',
                    status: 'released',
                    isTop100: true
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
                if (!anime || !anime.id || !anime.name || !anime.kind) {
                    Lampa.Noty.show('Некорректные данные аниме: отсутствуют обязательные поля.');
                    return;
                }

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
                left: function () {
                    if (Navigator.canmove("left")) Navigator.move("left"); else Lampa.Controller.toggle("menu");
                },
                right: function () {
                    Navigator.move("right");
                },
                up: function () {
                    if (Navigator.canmove("up")) Navigator.move("up"); else Lampa.Controller.toggle("head");
                },
                down: function () {
                    if (Navigator.canmove("down")) Navigator.move("down");
                },
                back: this.back
            });
            Lampa.Controller.toggle("content");
        };

        this.pause = function () { };
        this.stop = function () { };
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

    // Компонент для расширения информации в карточке
    function Component() {
        Lampa.Listener.follow("full", _asyncToGenerator(_regeneratorRuntime().mark(function _callee(e) {
            var response, dubbers, subbers, shikimoriRates;
            return _regeneratorRuntime().wrap(function _callee$(_context) {
                while (1) switch (_context.prev = _context.next) {
                    case 0:
                        if (!(e.type === "complite")) {
                            _context.next = 7;
                            break;
                        }
                        _context.prev = 1;
                        Lampa.Noty.show("Попытка получить дополнительные данные для аниме...");
                        _context.next = 5;
                        return $.ajax({
                            url: "https://shikimori.one/api/animes/".concat(e.object.id),
                            method: "GET",
                            timeout: 0
                        });

                    case 5:
                        response = _context.sent;
                        dubbers = "\n                    <div class=\"full-descr__info\">\n                        <div class=\"full-descr__info-name\">Фандабберы</div>\n                        <div class=\"full-descr__text\">".concat(response.fandubbers.join(', '), "</div>\n                    </div>");
                        subbers = "\n                    <div class=\"full-descr__info\">\n                        <div class=\"full-descr__info-name\">Фансабберы</div>\n                        <div class=\"full-descr__text\">".concat(response.fansubbers.join(', '), "</div>\n                    </div>");
                        e.object.activity.render().find(".full-descr__right").append(dubber, subbers);
                        shikimoriRates = "<div class=\"full-start__rate rate--shikimori\"><div>".concat(response.score, "</div><div>Shikimori</div></div>");
                        e.object.activity.render().find(".full-start-new__rate-line").prepend(shikimoriRates);
                        _context.next = 7;
                        break;

                    case 8:
                        _context.prev = 8;
                        _context.t0 = _context["catch"](1);
                        Lampa.Noty.show("Ошибка при получении данных: " + _context.t0.message || 'Неизвестная ошибка');
                    case 11:
                    case "end":
                        return _context.stop();
                }
            }, _callee, null, [[1, 8]]);
        })));
    }

    // Функция для добавления кнопки Shikimori в меню приложения
    function add() {
        var button = $("<li class=\"menu__item selector\">\n            <div class=\"menu__ico\">\n                <img src=\"https://kartmansms.github.io/testing/Shikimori/icons/shikimori-icon.svg\" alt=\"Shikimori icon\" class=\"menu-icon\" />\n            </div>\n            <div class=\"menu__text\">Shikimori</div>\n        </li>");

        button.on("hover:enter", function () {
            Lampa.Noty.show('Переход в каталог Shikimori');
            Lampa.Activity.push({
                url: '',
                title: 'Shikimori',
                component: 'Shikimori',
                page: 1
            });
        });

        $(".menu .menu__list").eq(0).append(button);
        Lampa.Noty.show('Кнопка Shikimori успешно добавлена в меню');
    }

    // Функция инициализации плагина с проверкой готовности Lampa
    function startPlugin() {
        if (!window.Lampa || !window.Lampa.Storage) {
            Lampa.Noty.show('Lampa еще не готова, повторная проверка через 100 мс');
            setTimeout(startPlugin, 100);
            return;
        }
        window.plugin_shikimori_ready = true;

        var manifest = {
            type: "other",
            version: "1.0",
            name: "LKE Shikimori",
            description: "Добавляет каталог Shikimori",
            component: "Shikimori"
        };

        Lampa.Manifest.plugins = manifest;
        Lampa.Noty.show('Плагин Shikimori зарегистрирован в системе Lampa');

        Lampa.Template.add('ShikimoriStyle', "<style>\n            .Shikimori-catalog--list.category-full{-webkit-box-pack:justify !important;-webkit-justify-content:space-between !important;-ms-flex-pack:justify !important;justify-content:space-between !important}.Shikimori-head.torrent-filter{margin-left:1.5em}.Shikimori.card__type{background:#ff4242;color:#fff}.Shikimori .card__season{position:absolute;left:-0.8em;top:3.4em;padding:.4em .4em;background:#05f;color:#fff;font-size:.8em;-webkit-border-radius:.3em;border-radius:.3em}.Shikimori .card__status{position:absolute;left:-0.8em;bottom:1em;padding:.4em .4em;background:#ffe216;color:#000;font-size:.8em;-webkit-border-radius:.3em;border-radius:.3em}.Shikimori.card__season.no-season{display:none}.menu-icon{width:24px;height:24px;fill:currentColor;}\n        </style>");

        Lampa.Template.add("Shikimori-Card", "<div class=\"Shikimori card selector layer--visible layer--render\">\n                <div class=\"Shikimori card__view\">\n                    <img src=\"{img}\" class=\"Shikimori card__img\" />\n                    <div class=\"Shikimori card__type\">{type}</div>\n                    <div class=\"Shikimori card__vote\">{rate}</div>\n                    <div class=\"Shikimori card__season\">{season}</div>\n                    <div class=\"Shikimori card__status\">{status}</div>\n                </div>\n                <div class=\"Shikimori card__title\">{title}</div>\n            </div>");

        Lampa.Component.add(manifest.component, Component$1);
        Lampa.Noty.show('Компонент Shikimori зарегистрирован');

        Component();
        Lampa.Noty.show('Компонент для расширения информации зарегистрирован');

        $('body').append(Lampa.Template.get('ShikimoriStyle', {}, true));
        Lampa.Noty.show('Стили Shikimori добавлены в документ');

        if (window.appready) {
            add();
        } else {
            Lampa.Listener.follow("app", function (event) {
                if (event.type === "ready") {
                    Lampa.Noty.show('Приложение готово, добавляем кнопку Shikimori');
                    add();
                }
            });
        }
    }

    if (!window.plugin_shikimori_ready) {
        Lampa.Noty.show('Запуск инициализации плагина Shikimori');
        startPlugin();
    }
})();