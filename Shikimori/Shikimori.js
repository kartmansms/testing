// Начало выполнения функции, которая запускает плагин
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

    // Шаг выполнения асинхронного генератора
    function asyncGeneratorStep(generator, resolve, reject, nextFunction, throwFunction, key, argument) {
        try {
            var information = generator[key](argument);
            var value = information.value;
        } catch (error) {
            reject(error);
            return;
        }
        if (information.done) {
            resolve(value);
        } else {
            Promise.resolve(value).then(nextFunction, throwFunction);
        }
    }

    // Преобразование функции с генератором в асинхронную
    function _asyncToGenerator(functionToTransform) {
        return function () {
            var self = this,
                argumentsArray = arguments;
            return new Promise(function (resolve, reject) {
                var generator = functionToTransform.apply(self, argumentsArray);
                function next(value) {
                    asyncGeneratorStep(generator, resolve, reject, next, throwError, 'next', value);
                }
                function throwError(error) {
                    asyncGeneratorStep(generator, resolve, reject, next, throwError, 'throw', error);
                }
                next(undefined);
            });
        };
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

    // Преобразование массиво-подобных структур в массив
    function _toConsumableArray(array) {
        return _arrayWithoutHoles(array) || _iterableToArray(array) || _unsupportedIterableToArray(array) || _nonIterableSpread();
    }

    function _arrayWithoutHoles(array) {
        if (Array.isArray(array)) return _arrayLikeToArray(array);
    }

    function _iterableToArray(iterable) {
        if (typeof Symbol !== 'undefined' && iterable[Symbol.iterator] != null || iterable['@@iterator'] != null) {
            return Array.from(iterable);
        }
    }

    function _unsupportedIterableToArray(object, minimumLength) {
        if (!object) return;
        if (typeof object === 'string') return _arrayLikeToArray(object, minimumLength);
        var name = Object.prototype.toString.call(object).slice(8, -1);
        if (name === 'Object' && object.constructor) name = object.constructor.name;
        if (name === 'Map' || name === 'Set') return Array.from(object);
        if (name === 'Arguments' || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(name)) return _arrayLikeToArray(object, minimumLength);
    }

    function _arrayLikeToArray(array, length) {
        if (length == null || length > array.length) length = array.length;
        for (var index = 0, newArray = new Array(length); index < length; index++) {
            newArray[index] = array[index];
        }
        return newArray;
    }

    function _nonIterableSpread() {
        throw new TypeError('Неверная попытка распространить неитерируемый экземпляр.\nДля того чтобы быть итерируемым, не-массивные объекты должны иметь метод [Symbol.iterator]().');
    }

    // Новая функция нормализации имени
    function normalizeName(name) {
        if (!name) return '';
        return name
            .toLowerCase()
            .replace(/\b(season|part|episode)\s*\d*\.?\d*\b/gi, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Алгоритм Левенштейна для сравнения строк
    function getLevenshteinDistance(stringA, stringB) {
        const matrix = Array(stringB.length + 1).fill(null).map(() => Array(stringA.length + 1).fill(null));
        for (let i = 0; i <= stringA.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= stringB.length; j++) matrix[j][0] = j;
        for (let j = 1; j <= stringB.length; j++) {
            for (let i = 1; i <= stringA.length; i++) {
                const indicator = stringA[i - 1] === stringB[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j - 1][i] + 1, // Удаление
                    matrix[j][i - 1] + 1, // Вставка
                    matrix[j - 1][i - 1] + indicator // Замена
                );
            }
        }
        return matrix[stringB.length][stringA.length];
    }

    // Транслитерация японских названий (требуется wanakana)
    function transliterateJapanese(japaneseName) {
        if (typeof wanakana !== 'undefined' && japaneseName) {
            return wanakana.toRomaji(japaneseName).toLowerCase();
        }
        return '';
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

    // Переписанная функция поиска с выводом ошибок через Lampa.Noty.show
    function search(animeData) {
        return new Promise(function (resolve, reject) {
            // Формируем список вариантов названий для поиска
            const nameVariants = [
                normalizeName(animeData.name),
                normalizeName(animeData.russian),
                normalizeName(animeData.english),
                normalizeName(animeData.licenseNameRu),
                transliterateJapanese(animeData.japanese)
            ].filter(function (variant) {
                return variant !== '';
            });
            // Получаем год выпуска аниме, если он есть
            const releaseYear = animeData.airedOn ? animeData.airedOn.year : undefined;

            // Шаг 1: Проверка через animeapi.my.id
            $.get(`https://arm.haglund.dev/api/v2/ids?source=myanimelist&id=${animeData.id}`)
                .done(function (response) {
                    if (response && response.themoviedb) {
                        getTmdb(response.themoviedb, animeData.kind, function (tmdbResponse) {
                            console.log('Ответ от getTmdb:', tmdbResponse); // Логирование ответа перед processResults
                            processResults(tmdbResponse);
                            resolve(tmdbResponse); // Успешное завершение
                        });
                    } else {
                        searchWithFallback(nameVariants, releaseYear, animeData.kind);
                    }
                })
                .fail(function (jqXHR) {
                    Lampa.Noty.show(`Ошибка при запросе к animeapi.my.id: Статус ${jqXHR.status}, ${jqXHR.statusText || 'Неизвестная ошибка'}`);
                    if (jqXHR.status === 404) {
                        searchWithFallback(nameVariants, releaseYear, animeData.kind);
                    } else {
                        reject(new Error(`Ошибка при запросе к animeapi.my.id: Статус ${jqXHR.status}`));
                    }
                });

            // Внутренняя функция для последовательного поиска через запасные источники
            function searchWithFallback(names, year, kind) {
                let found = false;

                // Поиск через TMDB
                searchTmdb(names, year, kind, function (response) {
                    if (response.total_results > 0) {
                        found = true;
                        const filteredResults = filterAndRankResults(response.results, names[0], kind, year);
                        console.log('Ответ от searchTmdb:', { total_results: response.total_results, results: filteredResults }); // Логирование ответа перед processResults
                        processResults({ total_results: response.total_results, results: filteredResults });
                        resolve({ total_results: response.total_results, results: filteredResults }); // Успешное завершение
                    }
                    if (!found) {
                        searchAniList(names, year, kind); // Переход к AniList, если TMDB не дал результатов
                    }
                });
            }

            // Поиск через TMDB
            function searchTmdb(names, year, kind, callback) {
                const apiKey = '4ef0d7355d9ffb5151e987764708ce96';
                const apiUrlTMDB = 'https://api.themoviedb.org/3/';
                const apiUrlProxy = 'apitmdb.' + (Lampa.Manifest && Lampa.Manifest.cub_domain ? Lampa.Manifest.cub_domain : 'cub.red') + '/3/';
                const lang = Lampa.Storage.field('language');
                const baseUrl = Lampa.Storage.field('proxy_tmdb') ? Lampa.Utils.protocol() + apiUrlProxy : apiUrlTMDB;

                function tryNextName(index) {
                    if (index >= names.length) {
                        callback({ total_results: 0 });
                        reject(new Error('Не удалось найти совпадений в TMDB для всех вариантов названий.'));
                        return;
                    }
                    const query = encodeURIComponent(names[index]);
                    const request = `search/multi?api_key=${apiKey}&language=${lang}&include_adult=true&query=${query}`;
                    $.get(baseUrl + request)
                        .done(function (response) {
                            if (response.total_results > 0) {
                                callback(response);
                            } else {
                                tryNextName(index + 1);
                            }
                        })
                        .fail(function (error) {
                            Lampa.Noty.show(`Ошибка при запросе к TMDB: ${error.statusText || 'Неизвестная ошибка'}`);
                            tryNextName(index + 1);
                        });
                }
                tryNextName(0);
            }

            // Поиск через AniList
            function searchAniList(names, year, kind) {
                const query = `
                    query ($search: String) {
                        Media(search: $search, type: ANIME) {
                            id
                            title { romaji english native }
                            startDate { year }
                            format
                        }
                    }
                `;
                const url = 'https://graphql.anilist.co';

                function tryNextName(index) {
                    if (index >= names.length) {
                        processResults({ total_results: 0 });
                        reject(new Error('Не удалось найти совпадений в AniList для всех вариантов названий.'));
                        return;
                    }
                    $.ajax({
                        url: url,
                        method: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            query: query,
                            variables: { search: names[index] }
                        })
                    }).done(function (response) {
                        const media = response.data ? response.data.Media : null;
                        if (media) {
                            const tmdbResult = mapAniListToTmdb(media, kind, year);
                            if (tmdbResult) {
                                console.log('Ответ от searchAniList:', tmdbResult); // Логирование ответа перед processResults
                                processResults(tmdbResult);
                                resolve(tmdbResult); // Успешное завершение
                            } else {
                                Lampa.Noty.show(`Не найдено совпадений в AniList для "${names[index]}"`);
                                tryNextName(index + 1);
                            }
                        } else {
                            Lampa.Noty.show(`Не найдено совпадений в AniList для "${names[index]}"`);
                            tryNextName(index + 1);
                        }
                    }).fail(function (error) {
                        Lampa.Noty.show(`Ошибка при запросе к AniList: ${error.statusText || 'Неизвестная ошибка'}`);
                        tryNextName(index + 1);
                    });
                }
                tryNextName(0);
            }

            // Запрос данных по TMDB ID
            function getTmdb(id, type, callback) {
                const apiKey = '4ef0d7355d9ffb5151e987764708ce96';
                const apiUrlTMDB = 'https://api.themoviedb.org/3/';
                const apiUrlProxy = 'apitmdb.' + (Lampa.Manifest && Lampa.Manifest.cub_domain ? Lampa.Manifest.cub_domain : 'cub.red') + '/3/';
                const lang = Lampa.Storage.field('language');
                const baseUrl = Lampa.Storage.field('proxy_tmdb') ? Lampa.Utils.protocol() + apiUrlProxy : apiUrlTMDB;
                const request = `${type}/${id}?api_key=${apiKey}&language=${lang}`;
                $.get(baseUrl + request)
                    .done(function (response) {
                        console.log('Ответ от getTmdb:', response); // Логирование ответа перед callback
                        callback(response);
                    })
                    .fail(function (error) {
                        Lampa.Noty.show(`Ошибка при запросе данных TMDB для ID ${id}: ${error.statusText || 'Неизвестная ошибка'}`);
                        reject(new Error(`Ошибка при запросе данных TMDB для ID ${id}`));
                    });
            }
        });
    }

    var API = {
        main: main,
        search: search
    };

    // Обновленная функция processResults с выводом ошибок через Lampa.Noty.show
    function processResults(response) {
        const menu = [];
        if (response && typeof response.total_results !== 'undefined') {
            if (response.total_results === 0) {
                Lampa.Noty.show('Не удалось найти совпадений.');
            } else if (response.total_results >= 1 && response.results && Array.isArray(response.results)) {
                if (response.total_results === 1) {
                    const result = response.results[0];
                    if (result && result.id && result.media_type) {
                        Lampa.Activity.push({
                            url: '',
                            component: 'full',
                            id: result.id,
                            method: result.media_type,
                            card: result
                        });
                    } else {
                        Lampa.Noty.show('Данные результата некорректны.');
                    }
                } else if (response.total_results > 1) {
                    response.results.forEach(function (item) {
                        if (item && item.id && (item.name || item.title) && item.media_type) {
                            const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
                            menu.push({
                                title: `[${item.media_type.toUpperCase()}] ${item.name || item.title} (${year || 'N/A'})`,
                                card: item
                            });
                        }
                    });
                    if (menu.length > 0) {
                        Lampa.Select.show({
                            title: 'Найти',
                            items: menu,
                            onBack: function () {
                                Lampa.Controller.toggle('content');
                            },
                            onSelect: function (a) {
                                if (a.card && a.card.id && a.card.media_type) {
                                    Lampa.Activity.push({
                                        url: '',
                                        component: 'full',
                                        id: a.card.id,
                                        method: a.card.media_type,
                                        card: a.card
                                    });
                                } else {
                                    Lampa.Noty.show('Выбранный элемент некорректен.');
                                }
                            }
                        });
                    } else {
                        Lampa.Noty.show('Не найдено подходящих результатов для отображения.');
                    }
                }
            } else {
                Lampa.Noty.show('Получены некорректные данные от API.');
            }
        } else {
            Lampa.Noty.show('Ответ от API отсутствует или некорректен.');
        }
    }

    // Обновленная функция filterAndRankResults с выводом ошибок через Lampa.Noty.show
    function filterAndRankResults(results, query, kind, year) {
        if (!results || !Array.isArray(results)) {
            Lampa.Noty.show('Результаты поиска некорректны или отсутствуют.');
            return [];
        }
        const mediaTypeMap = { 'tv': ['tv', 'ona', 'ova'], 'movie': ['movie'] };
        return results
            .filter(function (item) {
                if (!item || !item.name && !item.title) {
                    Lampa.Noty.show(`Некорректный элемент в результатах: ${JSON.stringify(item)}`);
                    return false;
                }
                const normalizedTitle = normalizeName(item.name || item.title);
                const distance = getLevenshteinDistance(normalizedTitle, query);
                const typeMatch = mediaTypeMap[item.media_type] ? mediaTypeMap[item.media_type].includes(kind) : false;
                const releaseDate = item.release_date || item.first_air_date;
                const itemYear = releaseDate ? new Date(releaseDate).getFullYear() : null;
                const yearMatch = !year || !itemYear || Math.abs(itemYear - year) <= 1;
                return distance < 5 && typeMatch && yearMatch;
            })
            .sort(function (a, b) {
                const distA = getLevenshteinDistance(normalizeName(a.name || a.title), query);
                const distB = getLevenshteinDistance(normalizeName(b.name || b.title), query);
                return distA - distB;
            });
    }

    // Обновленная функция mapAniListToTmdb с выводом ошибок через Lampa.Noty.show
    function mapAniListToTmdb(media, kind, year) {
        if (!media || !media.title || !media.format) {
            Lampa.Noty.show('Данные из AniList некорректны или отсутствуют.');
            return null;
        }
        const formatMap = {
            'TV': 'tv',
            'MOVIE': 'movie',
            'OVA': 'tv',
            'ONA': 'tv',
            'SPECIAL': 'tv'
        };
        if (year && media.startDate && media.startDate.year && Math.abs(media.startDate.year - year) > 1) {
            Lampa.Noty.show(`Год выпуска (${media.startDate.year}) не соответствует ожидаемому (${year}).`);
            return null;
        }
        if (!formatMap[media.format] || !formatMap[media.format].includes(kind)) {
            Lampa.Noty.show(`Формат ${media.format} не соответствует типу ${kind}.`);
            return null;
        }

        return {
            total_results: 1,
            results: [{
                id: media.id,
                media_type: formatMap[media.format] || 'tv',
                name: media.title.english || media.title.romaji || media.title.native,
                title: media.title.english || media.title.romaji || media.title.native,
                release_date: media.startDate && media.startDate.year ? `${media.startDate.year}-01-01` : ''
            }]
        };
    }

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

    // Основной компонент для отображения каталога с исправлением userLang
    function Component$1(object) {
        // Проверяем и получаем язык пользователя, с резервным значением 'en' (английский) по умолчанию
        var userLang = Lampa.Storage ? Lampa.Storage.field('language') || 'en' : 'en';
        // Логируем значение userLang для отладки
        console.log('Значение userLang:', userLang);

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
                // Проверяем, что anime содержит необходимые поля
                if (!anime || !anime.id || !anime.name || !anime.kind) {
                    Lampa.Noty.show('Некорректные данные аниме: отсутствуют обязательные поля.');
                    return;
                }

                // Логируем данные аниме перед вызовом API.search
                console.log('Данные аниме перед вызовом API.search:', anime);

                var item = new Card(anime, userLang);
                item.render(true).on("hover:focus", function () {
                    last = item.render()[0];
                    active = items.indexOf(item);
                    scroll.update(items[active].render(true), true);
                }).on("hover:enter", function () {
                    // Логируем начало обработки события hover:enter
                    console.log('Начало обработки события hover:enter для аниме:', anime);

                    // Вызываем API.search с обработкой результата
                    API.search(anime)
                        .then(function (result) {
                            // Логируем успешный результат поиска
                            console.log('Успешный результат поиска после hover:enter:', result);
                        })
                        .catch(function (error) {
                            // Выводим ошибку пользователю через Lampa.Noty.show
                            Lampa.Noty.show(`Ошибка при открытии карточки аниме: ${error.message || 'Неизвестная ошибка'}`);
                            console.log('Ошибка при вызове API.search:', error);
                        })
                        .finally(function () {
                            // Логируем завершение обработки события
                            console.log('Завершение обработки события hover:enter');
                        });
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
            var getMAL, response, dubbers, subbers, shikimoriRates;
            return _regeneratorRuntime().wrap(function _callee$(_context) {
                while (1) switch (_context.prev = _context.next) {
                    case 0:
                        if (!(e.type === "complite")) {
                            _context.next = 21;
                            break;
                        }
                        _context.prev = 1;
                        _context.next = 4;
                        return $.ajax({
                            url: "https://arm.haglund.dev/api/v2/themoviedb?id=".concat(e.object.id),
                            method: "GET",
                            timeout: 0
                        });
                    case 4:
                        getMAL = _context.sent;
                        if (getMAL.length) {
                            _context.next = 8;
                            break;
                        }
                        Lampa.Noty.show("Данные для предоставленного ID не найдены.");
                        return _context.abrupt("return");
                    case 8:
                        _context.next = 10;
                        return $.ajax({
                            url: "https://shikimori.one/api/animes/".concat(getMAL[0].myanimelist),
                            method: "GET",
                            timeout: 0
                        });
                    case 10:
                        response = _context.sent;
                        dubbers = "\n                    <div class=\"full-descr__info\">\n                        <div class=\"full-descr__info-name\">Фандабберы</div>\n                        <div class=\"full-descr__text\">".concat(response.fandubbers.join(', '), "</div>\n                    </div>");
                        subbers = "\n                    <div class=\"full-descr__info\">\n                        <div class=\"full-descr__info-name\">Фансабберы</div>\n                        <div class=\"full-descr__text\">".concat(response.fansubbers.join(', '), "</div>\n                    </div>");
                        e.object.activity.render().find(".full-descr__right").append(dubbers, subbers);
                        shikimoriRates = "<div class=\"full-start__rate rate--shikimori\"><div>".concat(response.score, "</div><div>Shikimori</div></div>");
                        e.object.activity.render().find(".full-start-new__rate-line").prepend(shikimoriRates);
                        _context.next = 21;
                        break;
                    case 18:
                        _context.prev = 18;
                        _context.t0 = _context["catch"](1);
                        Lampa.Noty.show("Ошибка при получении данных: " + _context.t0.message || 'Неизвестная ошибка');
                    case 21:
                    case "end":
                        return _context.stop();
                }
            }, _callee, null, [[1, 18]]);
        })));
    }

    // Функция для добавления кнопки Shikimori в меню приложения
    function add() {
        // Создаем элемент кнопки с иконкой и текстом для меню
        var button = $("<li class=\"menu__item selector\">\n            <div class=\"menu__ico\">\n                <svg fill=\"currentColor\" viewBox=\"0 0 24 24\" role=\"img\" xmlns=\"http://www.w3.org/2000/svg\" stroke=\"\"><g id=\"SVGRepo_bgCarrier\" stroke-width=\"0\"></g><g id=\"SVGRepo_tracerCarrier\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></g><g id=\"SVGRepo_iconCarrier\"><title>Shikimori icon</title><path d=\"M2.8025.0025C2.7779.03 2.8332.1223 2.9834.3c.0981.1134.1594.2328.233.4444.0551.1594.1198.3157.1443.3464.0368.049.0396.037.0427-.1102V.8181l.218.3004c.331.4568.5365.6992.6744.7973.0706.046.1136.0919.0952.098-.049.0153-.4785-.2208-.6778-.374-.1012-.0767-.196-.1411-.2114-.1411-.0153 0-.0644-.0461-.1073-.1013-.0399-.0552-.1348-.1408-.2053-.1898-.1717-.1196-.3527-.2913-.3957-.374C2.763.7721 2.668.7323 2.668.7814c0 .049.245.377.435.5793.5825.6224 1.1776.932 2.7688 1.4287.3373.1043.6347.2085.6623.233.0246.0215.0737.0398.1074.0398.0306 0 .0795.0152.104.0305.0399.0245.0367.031-.0093.031-.0368 0-.0521.018-.046.0548.0092.0552.1595.1045.4477.1444.1287.0184.1593.0124.1593-.0244 0-.049-.0889-.083-.2207-.083-.049 0-.0858-.0151-.0858-.0304 0-.0184.031-.025.0708-.0188.0368.0092.1652.0306.2817.052.276.046.353.0768.353.135 0 .0644.0826.092.1377.046.0307-.0276.046-.0274.046-.0028 0 .0183.0151.0337.0304.0337.0184 0 .031-.0214.031-.046 0-.0582-.0309-.0586.4842.0212.3066.046.42.0778.374.0923-.098.0368-.0428.0858.0952.0858.0705 0 .1195.0153.1195.0337 0 .0276.0704.0306.2452.0183.1594-.0123.2516-.0093.2639.0122.0122.0184.0643.0275.1195.0183.0521-.0092.1961.0034.3126.0248.3066.0583 1.1313.1044 2.977.1688 2.983.1042 5.157.3277 5.9726.6159.3617.1287.9075.4048 1.0087.509.1594.1686.2082.3066.1898.5334-.0092.1135-.0092.2149 0 .2241.089.089.2855-.0859.2855-.2545 0-.0338.0639-.1165.1467-.187.331-.2913.3803-.454.3436-1.1194-.0246-.4476-.031-.4782-.2302-1.1343-.2606-.8585-.3215-.9903-.6342-1.3214-.3679-.3863-.7023-.6072-1.1592-.7635-.1103-.0368-.3434-.1224-.5212-.1899-.2483-.098-.4262-.141-.788-.1931-.512-.0736-1.6126-.1256-1.956-.0919-.1226.0123-.6132 0-1.1498-.0337-.61-.0337-.984-.046-1.0729-.0277-.0766.0154-.2085.0274-.2944.0305-.1257 0-.1837.0187-.291.0984-.1257.092-.2149.1194-.5644.1777-.5641.092-.929.1653-1.0823.2175-.1196.0429-.3157.0706-.6192.089-.8309.0521-1.3029.0952-1.4071.129-.0706.0214-.3406.0274-.7913.0182-.5488-.0123-.6895-.006-.7171.0277-.0276.0306-.0155.0398.0581.0398.1809 0 1.7968.1258 1.8121.141.0154.0154-.273.003-1.0977-.0491-.2423-.0154-.4567-.0186-.472-.0094-.0583.0368-.4939.0307-.9108-.0122-.515-.0521-1.0115-.138-1.4714-.2545-.2146-.0521-.4662-.0916-.644-.1008-.328-.0153-.6778-.129-1.1714-.3773-.325-.1625-.3614-.1684-.3614-.0366v.1008L3.244.5331c-.0552-.0644-.1224-.1689-.15-.2302-.0552-.1165-.2609-.328-.2915-.3004zm.4584 3.1887c-.5697.0269-1.0938.4707-1.47 1.2628-.2238.4752-.2635.6593-.2789 1.291-.0122.4966-.0063.598.0642 1.0119.1503.8615.19.9625.5058 1.2721.3342.3312 1.1654.785 1.6284.8892.1594.0338.3464.0768.4139.0952.2575.0644.61.0885 1.4868.1008.8431.0153.9136.0125 1.027-.0427.0797-.0398.2486-.0707.4908-.089.2023-.0184.4165-.0459.4748-.0643.0582-.0153.1841-.0309.276-.0309.0951 0 .1903-.0182.2087-.0366.0735-.0735.4228-.1503.757-.1687.187-.0092.3621-.0273.3928-.0427.1011-.0551.052-.0859-.1135-.0675-.095.0092-.187.003-.2207-.0154-.0491-.0307-.034-.0335.0825-.0366.0766 0 .2269-.0093.3342-.0216.1655-.0153.1842-.0248.1382-.0585-.1134-.0828-.0153-.1041.4936-.1041.4568 0 .5886-.0215.4537-.0736-.0275-.0092-.1413-.0216-.2517-.0216-.1134-.003-.1624-.0119-.1134-.015.0521-.006.1628-.0277.2517-.043.0859-.0185.6255-.0399 1.1958-.046.5702-.0061 1.0542-.0124 1.0757-.0155.0276 0 .0338-.0215.0216-.0614-.0123-.043-.0061-.061.0276-.061.0245 0 .083-.049.129-.1073.0919-.1195.1161-.1137.156.0427l.0277.1012.2207.0094c.1748.0061.2333-.003.2916-.046.0398-.0306.1224-.0645.1837-.0768l.1135-.0216-.0183.1782c-.0184.144-.0152.1716.0215.1593.0246-.0092.1222-.0338.2203-.0553l.1749-.0337-.0675-.089c-.043-.0491-.1226-.098-.1931-.1163l-.1224-.031.1838-.006a4.812 4.812 0 0 1 .3004 0c.0644.003.1135-.0089.1135-.0272 0-.0184-.0182-.034-.0366-.037-.0215-.0031-.089-.0064-.1472-.0095-.0582-.006-.1564-.0398-.2147-.0735-.0582-.0368-.1317-.067-.1593-.067-.0307 0-.0553-.0157-.0553-.031 0-.0215.092-.0305.2545-.0244.2483.0092.2514.0091.2606.0919.0123.095.0122.095.0797.0675a.0498.0498 0 0 0 .0305-.0581c-.0184-.049.037-.0893.083-.0586.0183.0092.0918.0215.1593.0276.1655.0092.9718.0737 1.1803.0952.1103.0122.1593.0307.1593.0614 0 .0521.037.0549.083.0089.0245-.0245.1442-.021.4354.0066.3557.0337.4017.0425.4017.0946 0 .0368.0213.0556.0704.0586.0368 0 .1656.0121.2821.0244.1196.0123.2329.0181.2513.009.0214-.0062.0891-.0979.1504-.2021.1196-.1993.2208-.3253.2607-.3253.0153 0 .018.0219.0089.0464-.0123.0245-.003.046.0154.046.0215 0 .0338.0244.0277.052-.0061.0367.0213.0582.0919.0735.1134.0246.1657.0582.089.0582-.0276 0-.0525.0183-.0525.0398 0 .0215.1812.0984.4448.1842.2821.095.4444.1623.4444.1899 0 .0306-.095.0092-.3586-.0797-.6254-.2146-.898-.2606-.898-.1533 0 .046.0488.0676.285.1228.1532.0368.3002.0642.3248.0642.0214 0 .0798.0338.1289.0736.049.043.294.144.5638.233.273.092.5153.19.5644.233.049.0398.1349.0952.1931.1166.1932.0828.4693.3309.6778.6099.3005.4047.2973.3895.1317.3895-.0766 0-.2946-.0214-.4847-.046-.19-.0245-.429-.0461-.53-.0492-.2147-.0061-1.9684.0278-2.6245.0493l-.4449.0154-.0703-.1504c-.0398-.0828-.1533-.2298-.2545-.331-.1747-.1717-.1837-.175-.2236-.1167-.0245.0337-.1168.1626-.2057.2822l-.1622.2236-.1992.0065c-.1104 0-.2242.0031-.2517 0-.0675-.006-.0703.0305-.009.144l.0427.0857-.3126.0216c-.8524.0582-2.661.282-3.268.4078-.135.0276-.4203.049-.6778.052-.46.0061-.5028.0184-.794.187-.0522.0276-.0922.0339-.129.0155-.0337-.0215-.0643-.0154-.0858.0122-.0337.0398-.144.058-.9534.1439-.1778.0184-.475.0584-.665.089-.3312.0552-.3499.0552-.5246 0-.184-.0582-.7572-.135-1.2478-.1687l-.276-.0216-.1622.1472c-.092.0797-.218.2177-.2855.3066-.092.1257-.141.166-.1992.166-.1257 0-1.2448.1743-2.0573.3215-.8768.1594-1.2077.1904-1.4652.1382-.2668-.0551-.2701-.0583-.2578-.3956.0122-.2851.0093-.2941-.0643-.3309-.1686-.0858-.331-.0371-.5517.1622-.052.046-.1133.0675-.1992.0675-.0705-.003-.1993.0306-.3004.0797l-.181.083.009.1593c.006.0858-.0032.1868-.0216.2175-.0245.0368-.0306.1994-.0183.4692.0123.328.003.4476-.0398.607l-.052.1964.1471.2086c.2943.4139.503.7294.503.763 0 .0185.0916.1169.208.218.506.4446.7207.5642 1.2174.6685.5273.1134.6131.1072.9412-.0675.1502-.0828.3251-.1965.3895-.2578.0797-.0736.3067-.1931.742-.3863.6776-.3004.7631-.3342.7631-.2943 0 .0122.043.426.0952.9135.1073 1.024.1411 2.0052.0951 2.7595-.0368.5917-.0644.6743-.4814 1.4591-.6469 1.2172-1.4224 2.3947-2.008 3.0477-.1043.1196-.2636.325-.3525.4599-.1686.2544-.4815.595-.871.9445-.1317.1195-.2177.2206-.2085.2451.0092.0245.1046.0734.2119.1102.1042.0398.2052.083.2236.0984.049.049.1101.0303.337-.0924l.2207-.1223.0891.0614c.1073.0705.3006.0763.4631.015.0644-.0245.1932-.052.2883-.0581.19-.0184.3126-.0703.5118-.2236.0736-.0552.1687-.1073.2147-.1195.089-.0184.8585-.7976 1.2694-1.2881.1287-.1502.4506-.4905.7204-.7542.3771-.374.5457-.5148.7603-.6436.3096-.184.5548-.4076.5854-.5395.0123-.046.052-.1413.0919-.2118.095-.1625.2024-.5792.1748-.6835-.0092-.0429-.0552-.147-.1012-.233-.0797-.141-.0855-.1901-.1008-.5826-.0276-.6898-.138-1.0515-.4875-1.5941-.2023-.3127-.2516-.4231-.3773-.8278-.2085-.696-.2697-1.3493-.1655-1.8613.049-.2545.0735-.2883.279-.4078.1072-.0644.2484-.1656.3159-.227l.1256-.1162.5948-.0675c.328-.0398.6958-.0889.8123-.1134.1196-.0245.3831-.0797.5855-.1195.2054-.043.497-.1164.6473-.1655.1502-.0521.3616-.1137.472-.1383.2146-.049.9472-.1192.9717-.0946.0092.0092.0185.4476.0155.975 0 .8277-.0092 1.0515-.0797 1.6616-.1196 1.0455-.1442 1.3732-.1749 2.526-.0276 1.1466-.0365 1.1986-.2236 1.3335-.1349.0981-.2728.0802-.6806-.1007-.2023-.089-.6286-.264-.9505-.3928-.3189-.1288-.7727-.3277-1.0027-.4411-.233-.1165-.4232-.2028-.4232-.1936 0 .0092.1165.1595.2606.3342.144.1748.2606.325.2606.3342 0 .0092-.0274.0188-.0642.0188-.0552 0-.0584.006-.0155.0642.0276.0398.0369.101.0277.1654-.0123.0828-.0032.1106.058.1505.04.0276.1046.1041.1445.1716.0368.0643.1012.147.141.1776.04.0307.098.1044.1318.1627.0306.0582.1348.1654.233.239.098.0736.193.1687.2113.2086.0184.046.1077.1133.2119.1655.2422.1226.5975.4353.6557.5732.0338.0859.1015.1534.2977.2822.1564.1042.4321.3433.7387.6469.558.5518.5887.5703 1.0425.5427.2943-.0214.4416-.0768.6164-.2362.0705-.0644.1563-.1316.187-.15.0306-.0184.1072-.1072.1655-.1992.0582-.095.147-.1932.193-.2208.1288-.0766.3587-.402.3587-.5062 0-.1533.0582-.251.2606-.441.1778-.1656.2149-.2213.3253-.4941.1717-.417.2326-.6864.2878-1.223.0674-.6622.0616-1.4623-.015-1.962-.1257-.8156-.604-3.0876-.7481-3.5414-.1196-.377-.233-.8676-.233-1.0087 0-.0337.064-.0369.3155-.0215.23.0153.4108.0094.6745-.0305.3127-.046.4202-.049.7514-.0183.2115.0184.3923.0396.3984.0488.0245.0214.4968 1.5575.5765 1.8702.1656.6408.1688.687.2025 2.2996.0153.8431.0304 1.8426.0366 2.2228.0061.6407.0124.7111.089.9932.0981.3587.2054.5919.4261.9108.089.1257.2238.3464.3005.4874.1533.2852.3527.521.6103.7172.3372.2606.6652.4724.8676.5644.2422.1103.4382.2849.6314.5577.0797.1104.1932.2609.2545.3375.0613.0767.1378.1932.1716.2607.0582.1226.0766.1348.4078.233.1532.0459.5762.0548.8123.015.1318-.0216.1812-.052.3928-.2574.285-.276.42-.469.42-.607 0-.2146.0303-.279.156-.3281.0798-.0307.1196-.0673.1196-.1041 0-.1932-.2023-.9723-.3066-1.1747-.0674-.1349-.9471-1.324-1.686-2.2836-.7849-1.0148-1.061-1.4567-1.2234-1.935-.0521-.1624-.2481-1.2754-.3708-2.143-.0889-.6224-.2608-1.2386-.5306-1.9223-.092-.233-.1564-.4228-.141-.4228.0735 0 1.6526.4415 1.7445.4875.0583.0307.2974.159.5274.2878.23.1318.4537.2363.4935.2363.046 0 .239.1073.466.2606l.3895.2606.2025-.0155c.2912-.0276.346-.0398.4687-.1256.1748-.1196.2792-.138.4172-.0736.2667.1257.4507.1472.2883.0338-.2422-.1687-.2667-.2516-.1257-.4632.1687-.2575.1867-.2757.3614-.3646.279-.141.2976-.1745.3895-.6774.043-.2452.1011-.4848.1257-.5338.0705-.1472.0553-.2419-.0642-.3553-.0614-.0583-.1627-.1904-.2302-.2916-.095-.1472-.1223-.2175-.1223-.3248 0-.1196-.0124-.144-.1013-.1992a1.3114 1.3114 0 0 0-.218-.1074c-.1318-.046-.3369-.2635-.3093-.3248a2.3155 2.3155 0 0 0 .0337-.083c.0246-.0613-.2239-.1962-.4692-.2545-.2452-.0582-.2421-.0583-.1992-.1073.0215-.0276.0212-.1227.0028-.3005-.092-.84-.4321-1.4285-.9993-1.7259-.1226-.0644-.2299-.1288-.239-.1471-.0583-.089-.7818-.365-1.1803-.4477-.1257-.0245-.3744-.0857-.5522-.1378-.1778-.049-.4504-.1016-.6098-.12-.4568-.043-1.073-.147-1.2754-.2114-.1012-.0307-.3403-.0858-.5335-.1195-.1931-.0368-.3587-.0766-.368-.0919-.0122-.0184-.0858-.0156-.187.0028-.1164.0215-.2912.0217-.5671-.0028-.2177-.0215-.7573-.034-1.1957-.031-.6745.0031-.8585-.0057-1.2019-.0609-.2207-.0368-.518-.0646-.659-.0646-.3373-.0031-1.331-.1042-1.1531-.1196.0276 0 .1195-.0181.2053-.0365.141-.0307.1504-.0372.1228-.0985-.0306-.0644-.0458-.0673-.478-.0642-.368 0-.4539.0094-.4815.0492-.0306.0399-.0615.0428-.1964.0183-.144-.0306-.1533-.0368-.1073-.0736.049-.0368.0492-.046.0094-.0736-.0246-.0153-.0676-.031-.0952-.031-.0399 0-1.9562-.19-2.7533-.2727-.1564-.0184-.2941-.0365-.3033-.0488-.0092-.0092.0061-.0154.0337-.0154.0307 0 .052-.0124.052-.0277 0-.046-.156-.058-.3707-.0244-.1502.0215-.2303.0213-.2794-.0032-.0582-.0246-.0395-.0273.0924-.015.2912.0306.1683-.0401-.1383-.077-.1656-.0214-.3372-.043-.3801-.0491a.486.486 0 0 1-.1379-.046c-.0306-.0184-.3679-.0763-.748-.1284-.3802-.0521-.8065-.1291-.9506-.172-.4967-.141-.9532-.371-1.2169-.607l-.1382-.1224.0492-.1167c.1011-.2422.2299-.3832.4598-.4936.3158-.1533.46-.178 1.0762-.1964.561-.0122.693-.0365.6286-.1101-.0307-.043-.472-.1106-.6928-.1106-.138 0-.4815-.0674-.7973-.1594a1.2257 1.2257 0 0 0-.4003-.0488zm8.8497 2.9503a.3051.3051 0 0 0-.0675.0051c-.181.0307-.285.0734-.3769.15l-.0919.0736.1472.0033c.1564 0 .239-.0306.3525-.1317.0713-.0644.0838-.0963.0366-.1003zm5.7762.951c.0383-.0023.0814.0089.1626.0319.092.0276.193.0401.2236.031.0307-.0093.0674-.0033.0797.0182.0153.0276-.0305.0308-.1838.0155-.1349-.0154-.2025-.0126-.2025.0089 0 .0184.0368.04.0858.0492.2238.049.2607.0737.0675.0553-.1103-.0123-.276-.0213-.368-.0244-.1594 0-.1684.003-.1776.0797-.0092.0705-.0307.0856-.181.1163-.2053.0398-.1775.0428-.3308-.0277-.138-.0674-.4418-.141-.819-.1992-.141-.0215-.2112-.0396-.1621-.0427.0521 0 .3342.0307.6286.0736.5457.0767.6988.0919.6651.0582-.0092-.0092-.2483-.0644-.5334-.1196l-.5151-.1012.3004-.0033c.2637-.003.3098.0064.3895.0647.0675.049.1011.0583.1256.0337.0215-.0214.1133-.028.2574-.0187.1931.0153.2452.0095.3525-.0488.0628-.0322.96-.0483.135-.0506zm-4.3466.5128c.0152-.0005.0284.0022.036.0099.0124.0092.0002.0306-.0243.0459-.0582.0368-.0828.037-.1073.0033-.0138-.0253.0499-.0575.0956-.059zm4.9869.09c.0057-.002.0158.0105.0342.0366.0214.0276.0673.052.098.052.049 0 .0524.006.0126.0305-.0245.0153-.0522.0276-.0614.0276-.0613-.0061-.0919-.0428-.0919-.098.0015-.0306.0027-.0468.0085-.0487zm-3.9515.1805c-.0613 0-.104.052-.104.1256 0 .0153.0702.0276.156.0276.1472 0 .1536-.003.1168-.052-.0613-.0797-.0983-.1012-.1688-.1012zm6.1901 1.8304c.0215-.0092.0738.012.1167.0426.0675.0521.0674.0584.0122.0553-.0858 0-.184-.0765-.1289-.098Z\"></path></g></svg>\n            </div>\n            <div class=\"menu__text\">Shikimori</div>\n        </li>");

        // Обрабатываем событие наведения на кнопку для перехода в каталог Shikimori
        button.on("hover:enter", function () {
            Lampa.Activity.push({
                url: '',
                title: 'Shikimori',
                component: 'Shikimori',
                page: 1
            });
        });

        // Добавляем кнопку в список меню приложения
        $(".menu .menu__list").eq(0).append(button);
    }

    // Функция инициализации плагина с проверкой готовности Lampa
    function startPlugin() {
        // Ждем, пока Lampa будет готова
        if (!window.Lampa || !window.Lampa.Storage) {
            setTimeout(startPlugin, 100); // Проверка каждые 100 мс
            return;
        }
        // Устанавливаем флаг, что плагин готов
        window.plugin_shikimori_ready = true;

        // Определяем манифест плагина с метаданными
        var manifest = {
            type: "other",
            version: "1.0",
            name: "LKE Shikimori",
            description: "Добавляет каталог Shikimori",
            component: "Shikimori"
        };

        // Регистрируем плагин в системе Lampa
        Lampa.Manifest.plugins = manifest;

        // Добавляем стили для компонентов Shikimori
        Lampa.Template.add('ShikimoriStyle', "<style>\n            .Shikimori-catalog--list.category-full{-webkit-box-pack:justify !important;-webkit-justify-content:space-between !important;-ms-flex-pack:justify !important;justify-content:space-between !important}.Shikimori-head.torrent-filter{margin-left:1.5em}.Shikimori.card__type{background:#ff4242;color:#fff}.Shikimori .card__season{position:absolute;left:-0.8em;top:3.4em;padding:.4em .4em;background:#05f;color:#fff;font-size:.8em;-webkit-border-radius:.3em;border-radius:.3em}.Shikimori .card__status{position:absolute;left:-0.8em;bottom:1em;padding:.4em .4em;background:#ffe216;color:#000;font-size:.8em;-webkit-border-radius:.3em;border-radius:.3em}.Shikimori.card__season.no-season{display:none}\n        </style>");

        // Добавляем шаблон карточки аниме
        Lampa.Template.add("Shikimori-Card", "<div class=\"Shikimori card selector layer--visible layer--render\">\n                <div class=\"Shikimori card__view\">\n                    <img src=\"{img}\" class=\"Shikimori card__img\" />\n                    <div class=\"Shikimori card__type\">{type}</div>\n                    <div class=\"Shikimori card__vote\">{rate}</div>\n                    <div class=\"Shikimori card__season\">{season}</div>\n                    <div class=\"Shikimori card__status\">{status}</div>\n                </div>\n                <div class=\"Shikimori card__title\">{title}</div>\n            </div>");

        // Регистрируем основной компонент каталога
        Lampa.Component.add(manifest.component, Component$1);

        // Регистрируем компонент для расширения информации
        Component();

        // Добавляем стили в тело документа
        $('body').append(Lampa.Template.get('ShikimoriStyle', {}, true));

        // Если приложение уже готово, добавляем кнопку сразу, иначе ждем события готовности
        if (window.appready) {
            add();
        } else {
            Lampa.Listener.follow("app", function (event) {
                if (event.type === "ready") {
                    add();
                }
            });
        }
    }

    // Проверяем, не был ли плагин уже инициализирован, и запускаем его, если нет
    if (!window.plugin_shikimori_ready) {
        startPlugin();
    }

})();