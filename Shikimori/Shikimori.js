(function () {
  'use strict';

  // Получение всех ключей объекта, включая символьные
  function getObjectKeys(obj, enumerableOnly) {
    let keys = Object.keys(obj);
    if (Object.getOwnPropertySymbols) {
      let symbols = Object.getOwnPropertySymbols(obj);
      if (enumerableOnly) {
        symbols = symbols.filter(symbol => Object.getOwnPropertyDescriptor(obj, symbol).enumerable);
      }
      keys = keys.concat(symbols);
    }
    return keys;
  }

  // Объединение объектов с поддержкой символьных ключей
  function mergeObjects(target, ...sources) {
    sources.forEach((source, index) => {
      if (!source) return;
      if (index % 2 === 0) {
        getObjectKeys(Object(source), true).forEach(key => {
          defineProperty(target, key, source[key]);
        });
      } else if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
      } else {
        getObjectKeys(Object(source)).forEach(key => {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
      }
    });
    return target;
  }

  // Runtime для поддержки генераторов и асинхронных итераторов
  function createGeneratorRuntime() {
    const runtime = {};
    const proto = Object.prototype;
    const hasOwn = proto.hasOwnProperty;
    const defineProp = Object.defineProperty || ((obj, key, desc) => obj[key] = desc.value);
    const symbols = typeof Symbol === "function" ? Symbol : {};
    const iteratorSymbol = symbols.iterator || "@@iterator";
    const asyncIteratorSymbol = symbols.asyncIterator || "@@asyncIterator";
    const toStringTagSymbol = symbols.toStringTag || "@@toStringTag";

    function defineProperty(obj, key, value) {
      try {
        Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
      } catch {
        obj[key] = value;
      }
      return obj[key];
    }

    function wrapGenerator(fn, GeneratorFn, context, args) {
      const GeneratorConstructor = GeneratorFn && GeneratorFn.prototype instanceof Generator ? GeneratorFn : Generator;
      const generator = Object.create(GeneratorConstructor.prototype);
      defineProp(generator, "_invoke", { value: createInvokeMethod(fn, context, args) });
      return generator;
    }

    function tryExecute(fn, thisArg, arg) {
      try {
        return { type: "normal", arg: fn.call(thisArg, arg) };
      } catch (error) {
        return { type: "throw", arg: error };
      }
    }

    runtime.wrap = wrapGenerator;

    const STATE_SUSPENDED_START = "suspendedStart";
    const STATE_SUSPENDED_YIELD = "suspendedYield";
    const STATE_EXECUTING = "executing";
    const STATE_COMPLETED = "completed";
    const CONTINUE_SENTINEL = {};

    function Generator() {}
    function GeneratorFunction() {}
    function GeneratorFunctionPrototype() {}

    const iteratorPrototype = defineProperty({}, iteratorSymbol, function () { return this; });
    const getProto = Object.getPrototypeOf;
    const protoValues = getProto && getProto(getProto(values([])));
    if (protoValues && protoValues !== proto && hasOwn.call(protoValues, iteratorSymbol)) {
      iteratorPrototype = protoValues;
    }

    GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(iteratorPrototype);

    function defineIteratorMethods(prototype) {
      ["next", "throw", "return"].forEach(method => {
        defineProperty(prototype, method, function (arg) {
          return this._invoke(method, arg);
        });
      });
    }

    function AsyncIterator(generator, PromiseImpl) {
      let pending;
      function invoke(method, arg, resolve, reject) {
        const result = tryExecute(generator[method], generator, arg);
        if (result.type !== "throw") {
          const value = result.arg;
          if (value && typeof value === "object" && hasOwn.call(value, "__await")) {
            return PromiseImpl.resolve(value.__await).then(
              val => invoke("next", val, resolve, reject),
              err => invoke("throw", err, resolve, reject)
            );
          }
          return PromiseImpl.resolve(value).then(
            val => { value.value = val; resolve(value); },
            err => invoke("throw", err, resolve, reject)
          );
        }
        reject(result.arg);
      }
      defineProp(this, "_invoke", {
        value: function (method, arg) {
          return pending = pending ? pending.then(() => new Promise((res, rej) => invoke(method, arg, res, rej))) :
            new Promise((res, rej) => invoke(method, arg, res, rej));
        }
      });
    }

    function createInvokeMethod(fn, context, state) {
      let currentState = STATE_SUSPENDED_START;
      return function (method, arg) {
        if (currentState === STATE_EXECUTING) throw new Error("Генератор уже запущен");
        if (currentState === STATE_COMPLETED) {
          if (method === "throw") throw arg;
          return { value: undefined, done: true };
        }
        state.method = method;
        state.arg = arg;
        while (true) {
          const delegate = state.delegate;
          if (delegate) {
            const result = invokeDelegate(delegate, state);
            if (result) {
              if (result === CONTINUE_SENTINEL) continue;
              return result;
            }
          }
          if (state.method === "next") state.sent = state._sent = state.arg;
          else if (state.method === "throw") {
            if (currentState === STATE_SUSPENDED_START) throw currentState = STATE_COMPLETED, state.arg;
            state.dispatchException(state.arg);
          } else if (state.method === "return") state.abrupt("return", state.arg);
          currentState = STATE_EXECUTING;
          const result = tryExecute(fn, context, state);
          if (result.type === "normal") {
            currentState = state.done ? STATE_COMPLETED : STATE_SUSPENDED_YIELD;
            if (result.arg === CONTINUE_SENTINEL) continue;
            return { value: result.arg, done: state.done };
          }
          if (result.type === "throw") {
            currentState = STATE_COMPLETED;
            state.method = "throw";
            state.arg = result.arg;
          }
        }
      };
    }

    function invokeDelegate(delegate, state) {
      const method = state.method;
      const iteratorMethod = delegate.iterator[method];
      if (iteratorMethod === undefined) {
        state.delegate = null;
        if (method === "throw" && delegate.iterator.return) {
          state.method = "return";
          state.arg = undefined;
          invokeDelegate(delegate, state);
          if (state.method === "throw") return CONTINUE_SENTINEL;
        }
        if (method !== "return") {
          state.method = "throw";
          state.arg = new TypeError(`Итератор не предоставляет метод '${method}'`);
        }
        return CONTINUE_SENTINEL;
      }
      const result = tryExecute(iteratorMethod, delegate.iterator, state.arg);
      if (result.type === "throw") {
        state.method = "throw";
        state.arg = result.arg;
        state.delegate = null;
        return CONTINUE_SENTINEL;
      }
      const value = result.arg;
      if (!value) {
        state.method = "throw";
        state.arg = new TypeError("Результат итератора не является объектом");
        state.delegate = null;
        return CONTINUE_SENTINEL;
      }
      if (value.done) {
        state[delegate.resultName] = value.value;
        state.next = delegate.nextLoc;
        if (state.method !== "return") {
          state.method = "next";
          state.arg = undefined;
        }
        state.delegate = null;
        return CONTINUE_SENTINEL;
      }
      return value;
    }

    function pushTryEntry(entry, tries) {
      const tryEntry = { tryLoc: entry[0] };
      if (1 in entry) tryEntry.catchLoc = entry[1];
      if (2 in entry) {
        tryEntry.finallyLoc = entry[2];
        tryEntry.afterLoc = entry[3];
      }
      tries.push(tryEntry);
    }

    function resetTryEntry(entry) {
      const completion = entry.completion || {};
      completion.type = "normal";
      delete completion.arg;
      entry.completion = completion;
    }

    function Context(tryLocs) {
      this.tryEntries = [{ tryLoc: "root" }];
      tryLocs.forEach(entry => pushTryEntry(entry, this.tryEntries));
      this.reset(true);
    }

    function getValues(iterable) {
      if (!iterable && iterable !== "") throw new TypeError(`${typeof iterable} не является итерируемым`);
      const iterator = iterable[iteratorSymbol];
      if (iterator) return iterator.call(iterable);
      if (typeof iterable.next === "function") return iterable;
      if (!isNaN(iterable.length)) {
        let index = -1;
        const iterator = {
          next: function () {
            while (++index < iterable.length) {
              if (hasOwn.call(iterable, index)) {
                this.value = iterable[index];
                this.done = false;
                return this;
              }
            }
            this.value = undefined;
            this.done = true;
            return this;
          }
        };
        return iterator.next = iterator;
      }
    }

    GeneratorFunction.prototype = GeneratorFunctionPrototype;
    defineProp(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: true });
    defineProp(GeneratorFunction, "constructor", { value: GeneratorFunction, configurable: true });
    GeneratorFunction.displayName = defineProperty(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction");

    runtime.isGeneratorFunction = function (fn) {
      const constructor = typeof fn === "function" && fn.constructor;
      return !!constructor && (constructor === GeneratorFunction || (constructor.displayName || constructor.name) === "GeneratorFunction");
    };

    runtime.mark = function (fn) {
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(fn, GeneratorFunctionPrototype);
      } else {
        fn.__proto__ = GeneratorFunctionPrototype;
        defineProperty(fn, toStringTagSymbol, "GeneratorFunction");
      }
      fn.prototype = Object.create(Generator.prototype);
      return fn;
    };

    runtime.awrap = value => ({ __await: value });

    defineIteratorMethods(AsyncIterator.prototype);
    defineProperty(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; });
    runtime.AsyncIterator = AsyncIterator;

    runtime.async = function (fn, thisArg, args, generator, PromiseImpl = Promise) {
      const asyncIter = new AsyncIterator(wrapGenerator(fn, generator, thisArg, args), PromiseImpl);
      return runtime.isGeneratorFunction(generator) ? asyncIter :
        asyncIter.next().then(result => result.done ? result.value : asyncIter.next());
    };

    defineIteratorMethods(Generator.prototype);
    defineProperty(Generator.prototype, toStringTagSymbol, "Generator");
    defineProperty(Generator.prototype, iteratorSymbol, function () { return this; });
    defineProperty(Generator.prototype, "toString", () => "[object Generator]");

    runtime.keys = function (obj) {
      const keys = Object(obj);
      const keyArray = Object.keys(keys).reverse();
      return function next() {
        while (keyArray.length) {
          const key = keyArray.pop();
          if (key in keys) {
            this.value = key;
            this.done = false;
            return this;
          }
        }
        this.done = true;
        return this;
      };
    };

    runtime.values = getValues;

    Context.prototype = {
      constructor: Context,
      reset(skipTempReset) {
        this.prev = 0;
        this.next = 0;
        this.sent = this._sent = undefined;
        this.done = false;
        this.delegate = null;
        this.method = "next";
        this.arg = undefined;
        this.tryEntries.forEach(resetTryEntry);
        if (!skipTempReset) {
          for (let name in this) {
            if (name.charAt(0) === "t" && hasOwn.call(this, name) && !isNaN(+name.slice(1))) {
              this[name] = undefined;
            }
          }
        }
      },
      stop() {
        this.done = true;
        const rootEntry = this.tryEntries[0].completion;
        if (rootEntry.type === "throw") throw rootEntry.arg;
        return this.rval;
      },
      dispatchException(exception) {
        if (this.done) throw exception;
        const context = this;
        function handle(loc, caught) {
          completion.type = "throw";
          completion.arg = exception;
          context.next = loc;
          if (caught) {
            context.method = "next";
            context.arg = undefined;
          }
          return !!caught;
        }
        for (let i = this.tryEntries.length - 1; i >= 0; --i) {
          const entry = this.tryEntries[i];
          const completion = entry.completion;
          if (entry.tryLoc === "root") return handle("end");
          if (entry.tryLoc <= this.prev) {
            const hasCatch = hasOwn.call(entry, "catchLoc");
            const hasFinally = hasOwn.call(entry, "finallyLoc");
            if (hasCatch && hasFinally) {
              if (this.prev < entry.catchLoc) return handle(entry.catchLoc, true);
              if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
            } else if (hasCatch) {
              if (this.prev < entry.catchLoc) return handle(entry.catchLoc, true);
            } else if (hasFinally) {
              if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
            } else {
              throw new Error("Оператор try без catch или finally");
            }
          }
        }
      },
      abrupt(type, arg) {
        for (let i = this.tryEntries.length - 1; i >= 0; --i) {
          const entry = this.tryEntries[i];
          if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
            var finallyEntry = entry;
            break;
          }
        }
        if (finallyEntry && (type === "break" || type === "continue") && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc) {
          finallyEntry = null;
        }
        const completion = finallyEntry ? finallyEntry.completion : {};
        completion.type = type;
        completion.arg = arg;
        return finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, CONTINUE_SENTINEL) : this.complete(completion);
      },
      complete(completion, afterLoc) {
        if (completion.type === "throw") throw completion.arg;
        if (completion.type === "break" || completion.type === "continue") this.next = completion.arg;
        else if (completion.type === "return") {
          this.rval = this.arg = completion.arg;
          this.method = "return";
          this.next = "end";
        } else if (completion.type === "normal" && afterLoc) {
          this.next = afterLoc;
        }
        return CONTINUE_SENTINEL;
      },
      finish(finallyLoc) {
        for (let i = this.tryEntries.length - 1; i >= 0; --i) {
          const entry = this.tryEntries[i];
          if (entry.finallyLoc === finallyLoc) {
            this.complete(entry.completion, entry.afterLoc);
            resetTryEntry(entry);
            return CONTINUE_SENTINEL;
          }
        }
      },
      catch(tryLoc) {
        for (let i = this.tryEntries.length - 1; i >= 0; --i) {
          const entry = this.tryEntries[i];
          if (entry.tryLoc === tryLoc) {
            const completion = entry.completion;
            if (completion.type === "throw") {
              var error = completion.arg;
              resetTryEntry(entry);
            }
            return error;
          }
        }
        throw new Error("Незаконная попытка catch");
      },
      delegateYield(iterable, resultName, nextLoc) {
        this.delegate = { iterator: getValues(iterable), resultName, nextLoc };
        if (this.method === "next") this.arg = undefined;
        return CONTINUE_SENTINEL;
      }
    };

    return runtime;
  }

  // Преобразование значения в примитив
  function toPrimitive(value, hint) {
    if (typeof value !== "object" || !value) return value;
    const toPrim = value[Symbol.toPrimitive];
    if (toPrim) {
      const result = toPrim.call(value, hint || "default");
      if (typeof result !== "object") return result;
      throw new TypeError("@@toPrimitive должен возвращать примитивное значение.");
    }
    return (hint === "string" ? String : Number)(value);
  }

  // Преобразование ключа свойства в строку или символ
  function toPropertyKey(value) {
    const primitive = toPrimitive(value, "string");
    return typeof primitive === "symbol" ? primitive : String(primitive);
  }

  // Выполнение шага асинхронного генератора
  function executeAsyncStep(generator, resolve, reject, next, throwFn, key, arg) {
    try {
      const info = generator[key](arg);
      const value = info.value;
      if (info.done) resolve(value);
      else Promise.resolve(value).then(next, throwFn);
    } catch (error) {
      reject(error);
    }
  }

  // Преобразование генератора в асинхронную функцию
  function wrapAsync(fn) {
    return function (...args) {
      const self = this;
      return new Promise((resolve, reject) => {
        const generator = fn.apply(self, args);
        function next(value) {
          executeAsyncStep(generator, resolve, reject, next, throwFn, "next", value);
        }
        function throwFn(err) {
          executeAsyncStep(generator, resolve, reject, next, throwFn, "throw", err);
        }
        next(undefined);
      });
    };
  }

  // Определение или обновление свойства объекта
  function defineProperty(obj, key, value) {
    key = toPropertyKey(key);
    if (key in obj) {
      Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
    } else {
      obj[key] = value;
    }
    return obj;
  }

  // Выполнение GraphQL-запроса к Shikimori API
  function fetchAnimeList(params, onComplete, onError) {
    $(document).ready(() => {
      const limit = params.isTop100 ? 50 : (params.limit || 36);
      let query = `
        query Animes {
          animes(limit: ${limit}, order: ${params.sort || 'aired_on'}, page: ${params.page}
      `;

      if (params.kind) query += `, kind: "${params.kind}"`;
      if (params.status) query += `, status: "${params.status}"`;
      if (params.genre) query += `, genre: "${params.genre}"`;
      if (params.seasons) query += `, season: "${params.seasons}"`;

      query += `) {
          id name russian licenseNameRu english japanese kind score status season
          airedOn { year } poster { originalUrl }
        }}
      `;

      const ajaxConfig = {
        url: 'https://shikimori.one/api/graphql',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ query })
      };

      if (params.isTop100) {
        const requests = [
          $.ajax({ ...ajaxConfig, data: JSON.stringify({ query: query.replace(`page: ${params.page}`, "page: 1") }) }),
          $.ajax({ ...ajaxConfig, data: JSON.stringify({ query: query.replace(`page: ${params.page}`, "page: 2") }) })
        ];
        Promise.all(requests)
          .then(responses => onComplete(responses[0].data.animes.concat(responses[1].data.animes)))
          .catch(error => {
            console.error('Ошибка:', error);
            onError(error);
          });
      } else {
        $.ajax({
          ...ajaxConfig,
          success: response => onComplete(response.data.animes),
          error: error => {
            console.error('Ошибка:', error);
            onError(error);
          }
        });
      }
    });
  }

  // Поиск информации об аниме через внешние API
  function searchAnime(animeData) {
    function cleanName(name) {
      return name.replace(/\s{2,}/g, ' ').trim();
    }

    console.log('Начало поиска для аниме:', animeData);

    if (!animeData || !animeData.id) {
      console.error('Некорректные входные данные:', animeData);
      Lampa.Noty.show('Ошибка: нет данных для поиска');
      return;
    }

    function mapKindToTmdbType(kind) {
      const typeMap = {
        movie: 'movie',
        tv: 'tv',
        tv_special: 'tv',
        ova: 'movie',
        ona: 'movie',
        special: 'movie',
        music: 'movie',
        pv: 'movie',
        cm: 'movie'
      };
      return typeMap[kind] || 'tv';
    }

    $.get(`https://arm.haglund.dev/api/v2/ids?source=myanimelist&id=${animeData.id}`)
      .done(response => {
        console.log('Ответ от arm.haglund.dev:', response);
        if (response?.themoviedb) {
          console.log('Получен TMDB ID:', response.themoviedb);
          const tmdbType = mapKindToTmdbType(animeData.kind);
          fetchTmdbById(response.themoviedb, tmdbType, result => {
            if (result) processSearchResults(result, animeData.kind);
            else {
              console.log('Запрос по ID провалился, пробуем расширенный поиск');
              extendedSearch(animeData, 0);
            }
          });
        } else {
          console.log('TMDB ID не найден, переходим к расширенному поиску');
          extendedSearch(animeData, 0);
        }
      })
      .fail(jqXHR => {
        console.warn('Ошибка запроса к arm.haglund.dev:', jqXHR.status, jqXHR.statusText);
        console.log('Переходим к расширенному поиску');
        extendedSearch(animeData, 0);
      });

    function extendedSearch(animeData, nameIndex) {
      const names = [animeData.name, animeData.japanese, animeData.english, animeData.russian]
        .filter(n => n && typeof n === 'string');
      if (nameIndex >= names.length) {
        console.warn('Все варианты поиска исчерпаны для:', animeData);
        processSearchResults({ total_results: 0 }, animeData.kind);
        return;
      }
      const currentName = cleanName(names[nameIndex]);
      console.log('Попытка поиска с названием:', currentName);
      searchTmdb({ ...animeData, name: currentName }, tmdbResponse => {
        if (!tmdbResponse || tmdbResponse.total_results === 0) {
          console.log('Поиск по', currentName, 'не дал результатов, пробуем следующее название');
          extendedSearch(animeData, nameIndex + 1);
        } else {
          handleTmdbResponse(tmdbResponse, animeData);
        }
      });
    }

    function searchTmdb(animeData, callback) {
      const apiKey = "4ef0d7355d9ffb5151e987764708ce96";
      const baseUrl = 'https://api.themoviedb.org/3/';
      const proxyUrl = `apitmdb.${Lampa.Manifest?.cub_domain || 'cub.red'}/3/`;
      const language = Lampa.Storage.field('language');
      const query = cleanName(animeData.name || '');
      const year = animeData.airedOn?.year ? `&first_air_date_year=${animeData.airedOn.year}` : '';
      const request = `search/multi?api_key=${apiKey}&language=${language}&include_adult=true&query=${encodeURIComponent(query)}${year}`;
      const url = Lampa.Storage.field('proxy_tmdb') ? Lampa.Utils.protocol() + proxyUrl + request : baseUrl + request;

      console.log('Запрос к TMDB search:', url);
      $.get(url)
        .done(data => callback(data || { total_results: 0 }))
        .fail(err => {
          console.error('Ошибка TMDB поиска:', err.status, err.statusText);
          callback({ total_results: 0 });
        });
    }

    function fetchTmdbById(id, type, callback) {
      const apiKey = "4ef0d7355d9ffb5151e987764708ce96";
      const baseUrl = 'https://api.themoviedb.org/3/';
      const proxyUrl = `apitmdb.${Lampa.Manifest?.cub_domain || 'cub.red'}/3/`;
      const language = Lampa.Storage.field('language');
      const request = `${type}/${id}?api_key=${apiKey}&language=${language}`;
      const url = Lampa.Storage.field('proxy_tmdb') ? Lampa.Utils.protocol() + proxyUrl + request : baseUrl + request;

      console.log('Запрос к TMDB get:', url);
      $.get(url)
        .done(data => callback(data || null))
        .fail(err => {
          console.error('Ошибка TMDB get:', err.status, err.statusText);
          callback(null);
        });
    }

    function handleTmdbResponse(tmdbResponse, animeData) {
      console.log('Обработка TMDB ответа:', tmdbResponse);
      if (!tmdbResponse || tmdbResponse.total_results === 0) extendedSearch(animeData, 0);
      else processSearchResults(tmdbResponse, animeData.kind);
    }

    function processSearchResults(response, kind) {
      console.log('Обработка результата:', response);
      if (!response) {
        console.error('Ответ пустой');
        Lampa.Noty.show('Не удалось найти аниме: сервер вернул пустой ответ');
        return;
      }

      const menu = [];
      if ('total_results' in response) {
        if (response.total_results === 0) {
          console.warn('Результатов не найдено');
          Lampa.Noty.show('Не удалось найти аниме в TMDB');
        } else if (response.total_results === 1 && kind !== 'ona') {
          console.log('Найден один результат:', response.results[0]);
          if (!response.results[0].id || !response.results[0].media_type) {
            console.error('Некорректные данные в результате:', response.results[0]);
            Lampa.Noty.show('Не удалось открыть аниме: некорректные данные');
            return;
          }
          Lampa.Activity.push({
            url: '',
            component: 'full',
            id: response.results[0].id,
            method: response.results[0].media_type,
            card: response.results[0]
          });
        } else {
          console.log('Найдено несколько результатов:', response.results);
          response.results.forEach(item => {
            if (!item.id || !item.media_type) {
              console.warn('Пропущен элемент с некорректными данными:', item);
              return;
            }
            menu.push({
              title: `[${item.media_type.toUpperCase()}] ${item.name || item.title}`,
              card: item
            });
          });
          if (menu.length === 0) {
            console.error('Все элементы некорректны');
            Lampa.Noty.show('Не удалось найти аниме: нет валидных данных');
            return;
          }
          Lampa.Select.show({
            title: kind === 'ona' ? 'Выберите ONA из списка' : 'Выберите аниме',
            items: menu,
            onBack: () => Lampa.Controller.toggle("content"),
            onSelect: a => Lampa.Activity.push({
              url: '',
              component: 'full',
              id: a.card.id,
              method: a.card.media_type,
              card: a.card
            })
          });
        }
      } else if (kind !== 'ona') {
        console.log('Прямой результат:', response);
        if (!response || !response.id) {
          console.error('Некорректный прямой результат:', response);
          Lampa.Noty.show('Не удалось открыть аниме: некорректные данные');
          return;
        }
        Lampa.Activity.push({
          url: '',
          component: 'full',
          id: response.id,
          method: response.number_of_episodes ? 'tv' : 'movie',
          card: response
        });
      } else {
        console.log('Тип ONA: принудительный поиск списка даже для прямого результата');
        searchTmdb(animeData, tmdbResponse => handleTmdbResponse(tmdbResponse, animeData));
      }
    }
  }

  const API = {
    fetchAnimeList,
    searchAnime
  };

  // Класс для создания карточки аниме
  class AnimeCard {
    constructor(data, userLang) {
      const typeTranslations = {
        tv: 'ТВ', movie: 'Фильм', ova: 'OVA', ona: 'ONA', special: 'Спешл',
        tv_special: 'ТВ Спешл', music: 'Музыка', pv: 'PV', cm: 'CM'
      };
      const statusTranslations = { anons: 'Анонс', ongoing: 'Онгоинг', released: 'Вышло' };

      const formatSeason = season => season ? season.replace(/_/g, ' ')
        .replace(/^\w/, c => c.toUpperCase())
        .replace(/(winter|spring|summer|fall)/gi, match => ({
          winter: 'Зима', spring: 'Весна', summer: 'Лето', fall: 'Осень'
        })[match.toLowerCase()]) : '';

      const capitalize = str => str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

      this.element = Lampa.Template.get("Shikimori-Card", {
        img: data.poster.originalUrl,
        type: typeTranslations[data.kind] || data.kind.toUpperCase(),
        status: statusTranslations[data.status] || capitalize(data.status),
        rate: data.score,
        title: userLang === 'ru' ? (data.russian || data.name || data.japanese) : (data.name || data.japanese),
        season: data.season !== null ? formatSeason(data.season) : data.airedOn.year
      });
    }

    render() { return this.element; }
    destroy() { this.element.remove(); }
  }

  // Компонент каталога аниме
  function AnimeCatalog(object) {
    const userLang = Lampa.Storage.field('language');
    const network = new Lampa.Reguest();
    const scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
    const items = [];
    const html = $("<div class='Shikimori-module'></div>");
    const header = $("<div class='Shikimori-head torrent-filter'><div class='Shikimori__home simple-button simple-button--filter selector'>Главная</div><div class='Shikimori__top100_tv simple-button simple-button--filter selector'>Топ100_ТВ</div><div class='Shikimori__top100_movies simple-button simple-button--filter selector'>Топ100_Фильмы</div><div class='Shikimori__top100_ona simple-button simple-button--filter selector'>Топ100_ONA</div><div class='Shikimori__search simple-button simple-button--filter selector'>Фильтр</div></div>");
    const body = $('<div class="Shikimori-catalog--list category-full"></div>');
    let active, last;

    this.create = function () {
      API.fetchAnimeList(object, this.build.bind(this), this.showEmpty.bind(this));
    };

    this.build = function (result) {
      scroll.minus();
      scroll.onWheel = step => {
        if (!Lampa.Controller.own(this)) this.start();
        Navigator.move(step > 0 ? 'down' : 'up');
      };
      if (!object.isTop100) {
        scroll.onEnd = () => {
          object.page++;
          API.fetchAnimeList(object, this.build.bind(this), this.showEmpty.bind(this));
        };
      }

      this.setupHeaderActions();
      this.renderBody(result);
      scroll.append(header);
      scroll.append(body);
      html.append(scroll.render(true));
      this.activity.loader(false);
      this.activity.toggle();
    };

    this.setupHeaderActions = function () {
      const settings = { url: "https://shikimori.one/api/genres", method: "GET", timeout: 0 };
      const filters = {};

      $.ajax(settings).done(response => {
        const genreTranslations = {
          Action: "Экшен", Adventure: "Приключения", Cars: "Машины", Comedy: "Комедия", Dementia: "Деменция",
          Demons: "Демоны", Drama: "Драма", Ecchi: "Этти", Fantasy: "Фэнтези", Game: "Игра",
          Harem: "Гарем", Historical: "Исторический", Horror: "Ужасы", Josei: "Дзёсей", Kids: "Детский",
          Magic: "Магия", "Martial Arts": "Боевые искусства", Mecha: "Меха", Military: "Военный", Music: "Музыка",
          Mystery: "Мистика", Parody: "Пародия", Police: "Полиция", Psychological: "Психологический", Romance: "Романтика",
          Samurai: "Самурайский", School: "Школьный", "Sci-Fi": "Научная фантастика", Seinen: "Сейнэн", Shoujo: "Сёдзё",
          "Shoujo Ai": "Сёдзё-ай", Shounen: "Сёнэн", "Shounen Ai": "Сёнэн-ай", "Slice of Life": "Повседневность", Space: "Космос",
          Sports: "Спорт", "Super Power": "Суперсила", Supernatural: "Сверхъестественное", Thriller: "Триллер", Erotica: "Эротика",
          Hentai: "Хентай", Yaoi: "Яой", Yuri: "Юри", Gourmet: "Гурман", "Work Life": "Трудяги", Vampire: "Вампиры"
        };

        filters.kind = {
          title: 'Жанр',
          items: response.filter(item => item.entry_type === "Anime").map(item => 
            mergeObjects(mergeObjects({}, item), { title: genreTranslations[item.name] || item.name, name: undefined })
          )
        };
      });

      filters.AnimeKindEnum = {
        title: 'Тип',
        items: [
          { title: "ТВ Сериал", code: "tv" }, { title: "Фильм", code: "movie" }, { title: "OVA", code: "ova" },
          { title: "ONA", code: "ona" }, { title: "Спешл", code: "special" }, { title: "ТВ Спешл", code: "tv_special" },
          { title: "Музыка", code: "music" }, { title: "PV", code: "pv" }, { title: "CM", code: "cm" }
        ]
      };
      filters.status = {
        title: 'Статус',
        items: [
          { title: "Анонс", code: "anons" }, { title: "Онгоинг", code: "ongoing" }, { title: "Вышло", code: "released" }
        ]
      };
      filters.sort = {
        title: 'Сортировка',
        items: [
          { title: "По рейтингу", code: "ranked" }, { title: "По популярности", code: "popularity" },
          { title: "По алфавиту", code: "name" }, { title: "По дате выхода", code: "aired_on" },
          { title: "По типу", code: "kind" }, { title: "По количеству эпизодов", code: "episodes" },
          { title: "По статусу", code: "status" }, { title: "По рейтингу Shikimori", code: "ranked_shiki" }
        ]
      };

      function getCurrentSeason(date) {
        const month = date.getMonth();
        const year = date.getFullYear();
        const seasons = ['winter', 'spring', 'summer', 'fall'];
        const seasonTitles = ['Зима', 'Весна', 'Лето', 'Осень'];
        const seasonIndex = Math.floor((month + 1) / 3) % 4;
        return { code: `${seasons[seasonIndex]}_${year}`, title: `${seasonTitles[seasonIndex]} ${year}` };
      }

      function generateDynamicSeasons() {
        const now = new Date();
        return Array.from({ length: 5 }, (_, i) => {
          const nextDate = new Date(now);
          nextDate.setMonth(now.getMonth() + 3 * (i - 3));
          return getCurrentSeason(nextDate);
        });
      }

      function generateYearRanges() {
        const currentYear = new Date().getFullYear();
        const ranges = Array.from({ length: 4 }, (_, i) => ({
          code: `${currentYear - i}`,
          title: `${currentYear - i} год`
        }));
        for (let startYear = currentYear; startYear >= currentYear - 20; startYear -= 5) {
          const endYear = startYear - 5;
          if (endYear <= startYear) ranges.push({ code: `${endYear}_${startYear}`, title: `${startYear}–${endYear} год` });
          if (endYear === currentYear - 20) break;
        }
        return ranges;
      }

      filters.seasons = { title: 'Сезон', items: [...generateDynamicSeasons(), ...generateYearRanges()] };

      const searchElement = header.find('.Shikimori__search');

      function buildQuery() {
        const query = {};
        Object.entries(filters).forEach(([key, filter]) => {
          filter.items.forEach(item => {
            if (item.selected) query[key === "AnimeKindEnum" ? "kind" : key] = key === "kind" ? item.id : item.code;
          });
        });
        return query;
      }

      function updateFilterSubtitle(filter) {
        const selectedTitles = filter.items.filter(a => a.selected || a.checked).map(a => a.title);
        filter.subtitle = selectedTitles.length ? selectedTitles.join(', ') : Lampa.Lang.translate('nochoice');
      }

      function selectFilterOption(options, selected) {
        options.forEach(opt => opt.selected = false);
        selected.selected = true;
      }

      function showSubmenu(filter, mainMenu) {
        Lampa.Select.show({
          title: filter.title,
          items: filter.items,
          onBack: mainMenu,
          onSelect: item => { selectFilterOption(filter.items, item); mainMenu(); }
        });
      }

      function showMainMenu() {
        Object.values(filters).forEach(updateFilterSubtitle);
        Lampa.Select.show({
          title: 'Фильтры',
          items: [{ title: Lampa.Lang.translate('search_start'), searchShikimori: true }, ...Object.values(filters)],
          onBack: () => Lampa.Controller.toggle("content"),
          onSelect: item => item.searchShikimori ? performSearch() : showSubmenu(item, showMainMenu)
        });
      }

      function performSearch() {
        const query = buildQuery();
        const params = { url: '', title: 'Shikimori', component: 'Shikimori', page: 1, ...query };
        Lampa.Activity.push(params);
      }

      searchElement.on('hover:enter', showMainMenu);

      header.find('.Shikimori__home').on('hover:enter', () =>
        Lampa.Activity.push({ url: '', title: 'Shikimori', component: 'Shikimori', page: 1 }));

      header.find('.Shikimori__top100_tv').on('hover:enter', () =>
        Lampa.Activity.push({ url: '', title: 'Shikimori Топ100_ТВ', component: 'Shikimori', page: 1, sort: 'ranked', kind: 'tv', status: 'released', isTop100: true }));

      header.find('.Shikimori__top100_movies').on('hover:enter', () =>
        Lampa.Activity.push({ url: '', title: 'Shikimori Топ100_Фильмы', component: 'Shikimori', page: 1, sort: 'ranked', kind: 'movie', status: 'released', isTop100: true }));

      header.find('.Shikimori__top100_ona').on('hover:enter', () =>
        Lampa.Activity.push({ url: '', title: 'Shikimori Топ100_ONA', component: 'Shikimori', page: 1, sort: 'ranked', kind: 'ona', status: 'released', isTop100: true }));
    };

    this.showEmpty = function () {
      const empty = new Lampa.Empty();
      html.appendChild(empty.render(true));
      this.start = empty.start;
      this.activity.loader(false);
      this.activity.toggle();
    };

    this.renderBody = function (data) {
      data.forEach(anime => {
        const item = new AnimeCard(anime, userLang);
        item.render(true)
          .on("hover:focus", () => {
            last = item.render()[0];
            active = items.indexOf(item);
            scroll.update(items[active].render(true), true);
          })
          .on("hover:enter", wrapAsync( /*#__PURE__*/createGeneratorRuntime().mark(function* () {
            API.searchAnime(anime);
          })));
        body.append(item.render(true));
        items.push(item);
      });
    };

    this.start = function () {
      if (Lampa.Activity.active().activity !== this.activity) return;
      Lampa.Controller.add("content", {
        toggle: () => {
          Lampa.Controller.collectionSet(scroll.render());
          Lampa.Controller.collectionFocus(last || false, scroll.render());
        },
        left: () => Navigator.canmove("left") ? Navigator.move("left") : Lampa.Controller.toggle("menu"),
        right: () => Navigator.move("right"),
        up: () => Navigator.canmove("up") ? Navigator.move("up") : Lampa.Controller.toggle("head"),
        down: () => Navigator.canmove("down") && Navigator.move("down"),
        back: this.back
      });
      Lampa.Controller.toggle("content");
    };

    this.pause = () => {};
    this.stop = () => {};
    this.render = js => js ? html : $(html);
    this.destroy = () => {
      network.clear();
      Lampa.Arrays.destroy(items);
      scroll.destroy();
      html.remove();
      items.length = 0;
      network = null;
    };
  }

  // Компонент для расширения информации в карточке
  function FullDetailsEnhancer() {
    Lampa.Listener.follow("full", wrapAsync( /*#__PURE__*/createGeneratorRuntime().mark(function* (e) {
      if (e.type !== "complite") return;
      try {
        const malData = yield $.ajax({ url: `https://arm.haglund.dev/api/v2/themoviedb?id=${e.object.id}`, method: "GET", timeout: 0 });
        if (!malData.length) {
          console.warn("Данные для предоставленного ID не найдены.");
          return;
        }
        const response = yield $.ajax({ url: `https://shikimori.one/api/animes/${malData[0].myanimelist}`, method: "GET", timeout: 0 });
        const dubbers = `<div class="full-descr__info"><div class="full-descr__info-name">Фандабберы</div><div class="full-descr__text">${response.fandubbers.join(', ')}</div></div>`;
        const subbers = `<div class="full-descr__info"><div class="full-descr__info-name">Фансабберы</div><div class="full-descr__text">${response.fansubbers.join(', ')}</div></div>`;
        e.object.activity.render().find(".full-descr__right").append(dubbers, subbers);
        const shikimoriRates = `<div class="full-start__rate rate--shikimori"><div>${response.score}</div><div>Shikimori</div></div>`;
        e.object.activity.render().find(".full-start-new__rate-line").prepend(shikimoriRates);
      } catch (error) {
        console.error("Ошибка при получении данных:", error);
      }
    })));
  }

  // Добавление кнопки Shikimori в меню
  function addMenuButton() {
    const button = $(`
      <li class="menu__item selector">
        <div class="menu__ico">
          <img src="https://kartmansms.github.io/testing/Shikimori/icons/shikimori-icon.svg" alt="Shikimori icon" class="menu-icon" />
        </div>
        <div class="menu__text">Shikimori</div>
      </li>
    `);
    button.on("hover:enter", () => Lampa.Activity.push({ url: '', title: 'Shikimori', component: 'Shikimori', page: 1 }));
    $(".menu .menu__list").eq(0).append(button);
  }

  // Инициализация плагина
  function initializePlugin() {
    if (!window.Lampa || !window.Lampa.Storage) {
      Lampa.Noty.show('Lampa еще не готова, повторная проверка через 100 мс');
      setTimeout(initializePlugin, 100);
      return;
    }
    window.plugin_shikimori_ready = true;

    const manifest = {
      type: "other",
      version: "1.0",
      name: "LKE Shikimori",
      description: "Добавляет каталог Shikimori",
      component: "Shikimori"
    };

    Lampa.Manifest.plugins = manifest;

    Lampa.Template.add('ShikimoriStyle', `
      <style>
        .Shikimori-catalog--list.category-full {
          -webkit-box-pack: justify !important;
          -webkit-justify-content: space-between !important;
          -ms-flex-pack: justify !important;
          justify-content: space-between !important;
        }
        .Shikimori-head.torrent-filter { margin-left: 1.5em; }
        .Shikimori.card__type { background: #ff4242; color: #fff; }
        .Shikimori .card__season {
          position: absolute; left: -0.8em; top: 3.4em; padding: .4em .4em;
          background: #05f; color: #fff; font-size: .8em; -webkit-border-radius: .3em; border-radius: .3em;
        }
        .Shikimori .card__status {
          position: absolute; left: -0.8em; bottom: 1em; padding: .4em .4em;
          background: #ffe216; color: #000; font-size: .8em; -webkit-border-radius: .3em; border-radius: .3em;
        }
        .Shikimori.card__season.no-season { display: none; }
        .menu-icon { width: 24px; height: 24px; fill: currentColor; }
      </style>
    `);

    Lampa.Template.add("Shikimori-Card", `
      <div class="Shikimori card selector layer--visible layer--render">
        <div class="Shikimori card__view">
          <img src="{img}" class="Shikimori card__img" />
          <div class="Shikimori card__type">{type}</div>
          <div class="Shikimori card__vote">{rate}</div>
          <div class="Shikimori card__season">{season}</div>
          <div class="Shikimori card__status">{status}</div>
        </div>
        <div class="Shikimori card__title">{title}</div>
      </div>
    `);

    Lampa.Component.add(manifest.component, AnimeCatalog);
    FullDetailsEnhancer();
    $('body').append(Lampa.Template.get('ShikimoriStyle', {}, true));

    if (window.appready) addMenuButton();
    else Lampa.Listener.follow("app", e => e.type === "ready" && addMenuButton());
  }

  if (!window.plugin_shikimori_ready) initializePlugin();
})();