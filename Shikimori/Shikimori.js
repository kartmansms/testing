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
                            Lampa.Noty.show(`Получен ответ от getTmdb для аниме ${animeData.name}: данные успешно загружены`);
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
                        Lampa.Noty.show(`Найдено ${response.total_results} результатов в TMDB для ${names[0]}`);
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
                                Lampa.Noty.show(`Найден результат в AniList для ${names[index]}`);
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
                        Lampa.Noty.show(`Данные TMDB успешно получены для ID ${id}`);
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
        // Выводим значение userLang через Lampa.Noty
        Lampa.Noty.show(`Используемый язык пользователя: ${userLang}`);

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

                // Выводим данные аниме через Lampa.Noty перед вызовом API.search
                Lampa.Noty.show(`Загружаем карточку аниме: ${anime.name} (ID: ${anime.id})`);

                var item = new Card(anime, userLang);
                item.render(true).on("hover:focus", function () {
                    last = item.render()[0];
                    active = items.indexOf(item);
                    scroll.update(items[active].render(true), true);
                }).on("hover:enter", function () {
                    // Выводим начало обработки события через Lampa.Noty
                    Lampa.Noty.show(`Открываем карточку аниме: ${anime.name}`);

                    // Вызываем API.search с обработкой результата
                    API.search(anime)
                        .then(function (result) {
                            // Выводим успешный результат поиска через Lampa.Noty
                            Lampa.Noty.show(`Поиск для ${anime.name} завершен успешно`);
                        })
                        .catch(function (error) {
                            // Выводим ошибку пользователю через Lampa.Noty.show
                            Lampa.Noty.show(`Ошибка при открытии карточки аниме ${anime.name}: ${error.message || 'Неизвестная ошибка'}`);
                        })
                        .finally(function () {
                            // Выводим завершение обработки события через Lampa.Noty
                            Lampa.Noty.show(`Обработка карточки ${anime.name} завершена`);
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
		var button = $("<li class=\"menu__item selector\">\n            <div class=\"menu__ico\">\n                <img src=\"https://kartmansms.github.io/testing/Shikimori/icons/shikimori-icon.svg\" alt=\"Shikimori icon\" class=\"menu-icon\" />\n            </div>\n            <div class=\"menu__text\">Shikimori</div>\n        </li>");

		// Обрабатываем событие наведения на кнопку для перехода в каталог Shikimori
		button.on("hover:enter", function () {
			Lampa.Noty.show('Переход в каталог Shikimori');
			Lampa.Activity.push({
				url: '',
				title: 'Shikimori',
				component: 'Shikimori',
				page: 1
			});
		});

		// Добавляем кнопку в список меню приложения
		$(".menu .menu__list").eq(0).append(button);
		Lampa.Noty.show('Кнопка Shikimori успешно добавлена в меню');
	}

    // Функция инициализации плагина с проверкой готовности Lampa
    function startPlugin() {
        // Ждем, пока Lampa будет готова
        if (!window.Lampa || !window.Lampa.Storage) {
            Lampa.Noty.show('Lampa еще не готова, повторная проверка через 100 мс');
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
        Lampa.Noty.show('Плагин Shikimori зарегистрирован в системе Lampa');

        // Добавляем стили для компонентов Shikimori
        Lampa.Template.add('ShikimoriStyle', "<style>\n            .Shikimori-catalog--list.category-full{-webkit-box-pack:justify !important;-webkit-justify-content:space-between !important;-ms-flex-pack:justify !important;justify-content:space-between !important}.Shikimori-head.torrent-filter{margin-left:1.5em}.Shikimori.card__type{background:#ff4242;color:#fff}.Shikimori .card__season{position:absolute;left:-0.8em;top:3.4em;padding:.4em .4em;background:#05f;color:#fff;font-size:.8em;-webkit-border-radius:.3em;border-radius:.3em}.Shikimori .card__status{position:absolute;left:-0.8em;bottom:1em;padding:.4em .4em;background:#ffe216;color:#000;font-size:.8em;-webkit-border-radius:.3em;border-radius:.3em}.Shikimori.card__season.no-season{display:none}.menu-icon{width:24px;height:24px;fill:currentColor;}\n        </style>");

        // Добавляем шаблон карточки аниме
        Lampa.Template.add("Shikimori-Card", "<div class=\"Shikimori card selector layer--visible layer--render\">\n                <div class=\"Shikimori card__view\">\n                    <img src=\"{img}\" class=\"Shikimori card__img\" />\n                    <div class=\"Shikimori card__type\">{type}</div>\n                    <div class=\"Shikimori card__vote\">{rate}</div>\n                    <div class=\"Shikimori card__season\">{season}</div>\n                    <div class=\"Shikimori card__status\">{status}</div>\n                </div>\n                <div class=\"Shikimori card__title\">{title}</div>\n            </div>");

        // Регистрируем основной компонент каталога
        Lampa.Component.add(manifest.component, Component$1);
        Lampa.Noty.show('Компонент Shikimori зарегистрирован');

        // Регистрируем компонент для расширения информации
        Component();
        Lampa.Noty.show('Компонент для расширения информации зарегистрирован');

        // Добавляем стили в тело документа
        $('body').append(Lampa.Template.get('ShikimoriStyle', {}, true));
        Lampa.Noty.show('Стили Shikimori добавлены в документ');

        // Если приложение уже готово, добавляем кнопку сразу, иначе ждем события готовности
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

    // Проверяем, не был ли плагин уже инициализирован, и запускаем его, если нет
    if (!window.plugin_shikimori_ready) {
        Lampa.Noty.show('Запуск инициализации плагина Shikimori');
        startPlugin();
    }

})();