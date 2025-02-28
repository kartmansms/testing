(function () {
  'use strict';

  // Вспомогательная функция для получения всех ключей объекта, включая символьные
  function ownKeys(e, r) {
    var t = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var o = Object.getOwnPropertySymbols(e);
      r && (o = o.filter(function (r) {
        return Object.getOwnPropertyDescriptor(e, r).enumerable;
      })), t.push.apply(t, o);
    }
    return t;
  }

  // Полифил для Object.assign с поддержкой символьных ключей
  function _objectSpread2(e) {
    for (var r = 1; r < arguments.length; r++) {
      var t = null != arguments[r] ? arguments[r] : {};
      r % 2 ? ownKeys(Object(t), !0).forEach(function (r) {
        _defineProperty(e, r, t[r]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) {
        Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
      });
    }
    return e;
  }

  // Полифил для работы с генераторами
  function _regeneratorRuntime() {
    _regeneratorRuntime = function () {
      return e;
    };
    var t,
      e = {},
      r = Object.prototype,
      n = r.hasOwnProperty,
      o = Object.defineProperty || function (t, e, r) {
        t[e] = r.value;
      },
      i = "function" == typeof Symbol ? Symbol : {},
      a = i.iterator || "@@iterator",
      c = i.asyncIterator || "@@asyncIterator",
      u = i.toStringTag || "@@toStringTag";
    function define(t, e, r) {
      return Object.defineProperty(t, e, {
        value: r,
        enumerable: !0,
        configurable: !0,
        writable: !0
      }), t[e];
    }
    try {
      define({}, "");
    } catch (t) {
      define = function (t, e, r) {
        return t[e] = r;
      };
    }
    function wrap(t, e, r, n) {
      var i = e && e.prototype instanceof Generator ? e : Generator,
        a = Object.create(i.prototype),
        c = new Context(n || []);
      return o(a, "_invoke", {
        value: makeInvokeMethod(t, r, c)
      }), a;
    }
    function tryCatch(t, e, r) {
      try {
        return {
          type: "normal",
          arg: t.call(e, r)
        };
      } catch (t) {
        return {
          type: "throw",
          arg: t
        };
      }
    }
    e.wrap = wrap;
    var h = "suspendedStart",
      l = "suspendedYield",
      f = "executing",
      s = "completed",
      y = {};
    function Generator() {}
    function GeneratorFunction() {}
    function GeneratorFunctionPrototype() {}
    var p = {};
    define(p, a, function () {
      return this;
    });
    var d = Object.getPrototypeOf,
      v = d && d(d(values([])));
    v && v !== r && n.call(v, a) && (p = v);
    var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p);
    function defineIteratorMethods(t) {
      ["next", "throw", "return"].forEach(function (e) {
        define(t, e, function (t) {
          return this._invoke(e, t);
        });
      });
    }
    function AsyncIterator(t, e) {
      function invoke(r, o, i, a) {
        var c = tryCatch(t[r], t, o);
        if ("throw" !== c.type) {
          var u = c.arg,
            h = u.value;
          return h && "object" == typeof h && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) {
            invoke("next", t, i, a);
          }, function (t) {
            invoke("throw", t, i, a);
          }) : e.resolve(h).then(function (t) {
            u.value = t, i(u);
          }, function (t) {
            return invoke("throw", t, i, a);
          });
        }
        a(c.arg);
      }
      var r;
      o(this, "_invoke", {
        value: function (t, n) {
          function callInvokeWithMethodAndArg() {
            return new e(function (e, r) {
              invoke(t, n, e, r);
            });
          }
          return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
        }
      });
    }
    function makeInvokeMethod(e, r, n) {
      var o = h;
      return function (i, a) {
        if (o === f) throw Error("Генератор уже запущен");
        if (o === s) {
          if ("throw" === i) throw a;
          return {
            value: t,
            done: !0
          };
        }
        for (n.method = i, n.arg = a;;) {
          var c = n.delegate;
          if (c) {
            var u = maybeInvokeDelegate(c, n);
            if (u) {
              if (u === y) continue;
              return u;
            }
          }
          if ("next" === n.method) n.sent = n._sent = n.arg; else if ("throw" === n.method) {
            if (o === h) throw o = s, n.arg;
            n.dispatchException(n.arg);
          } else "return" === n.method && n.abrupt("return", n.arg);
          o = f;
          var p = tryCatch(e, r, n);
          if ("normal" === p.type) {
            if (o = n.done ? s : l, p.arg === y) continue;
            return {
              value: p.arg,
              done: n.done
            };
          }
          "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg);
        }
      };
    }
    function maybeInvokeDelegate(e, r) {
      var n = r.method,
        o = e.iterator[n];
      if (o === t) return r.delegate = null, "throw" === n && e.iterator.return && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("Итератор не предоставляет метод '" + n + "'")), y;
      var i = tryCatch(o, e.iterator, r.arg);
      if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y;
      var a = i.arg;
      return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("результат итератора не является объектом"), r.delegate = null, y);
    }
    function pushTryEntry(t) {
      var e = {
        tryLoc: t[0]
      };
      1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e);
    }
    function resetTryEntry(t) {
      var e = t.completion || {};
      e.type = "normal", delete e.arg, t.completion = e;
    }
    function Context(t) {
      this.tryEntries = [{
        tryLoc: "root"
      }], t.forEach(pushTryEntry, this), this.reset(!0);
    }
    function values(e) {
      if (e || "" === e) {
        var r = e[a];
        if (r) return r.call(e);
        if ("function" == typeof e.next) return e;
        if (!isNaN(e.length)) {
          var o = -1,
            i = function next() {
              for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next;
              return next.value = t, next.done = !0, next;
            };
          return i.next = i;
        }
      }
      throw new TypeError(typeof e + " не является итерируемым");
    }
    return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", {
      value: GeneratorFunctionPrototype,
      configurable: !0
    }), o(GeneratorFunctionPrototype, "constructor", {
      value: GeneratorFunction,
      configurable: !0
    }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) {
      var e = "function" == typeof t && t.constructor;
      return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name));
    }, e.mark = function (t) {
      return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t;
    }, e.awrap = function (t) {
      return {
        __await: t
      };
    }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () {
      return this;
    }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) {
      void 0 === i && (i = Promise);
      var a = new AsyncIterator(wrap(t, r, n, o), i);
      return e.isGeneratorFunction(r) ? a : a.next().then(function (t) {
        return t.done ? t.value : a.next();
      });
    }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () {
      return this;
    }), define(g, "toString", function () {
      return "[object Generator]";
    }), e.keys = function (t) {
      var e = Object(t),
        r = [];
      for (var n in e) r.push(n);
      return r.reverse(), function next() {
        for (; r.length;) {
          var t = r.pop();
          if (t in e) return next.value = t, next.done = !1, next;
        }
        return next.done = !0, next;
      };
    }, e.values = values, Context.prototype = {
      constructor: Context,
      reset: function (e) {
        if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t);
      },
      stop: function () {
        this.done = !0;
        var t = this.tryEntries[0].completion;
        if ("throw" === t.type) throw t.arg;
        return this.rval;
      },
      dispatchException: function (e) {
        if (this.done) throw e;
        var r = this;
        function handle(n, o) {
          return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o;
        }
        for (var o = this.tryEntries.length - 1; o >= 0; --o) {
          var i = this.tryEntries[o],
            a = i.completion;
          if ("root" === i.tryLoc) return handle("end");
          if (i.tryLoc <= this.prev) {
            var c = n.call(i, "catchLoc"),
              u = n.call(i, "finallyLoc");
            if (c && u) {
              if (this.prev < i.catchLoc) return handle(i.catchLoc, !0);
              if (this.prev < i.finallyLoc) return handle(i.finallyLoc);
            } else if (c) {
              if (this.prev < i.catchLoc) return handle(i.catchLoc, !0);
            } else {
              if (!u) throw Error("Оператор try без catch или finally");
              if (this.prev < i.finallyLoc) return handle(i.finallyLoc);
            }
          }
        }
      },
      abrupt: function (t, e) {
        for (var r = this.tryEntries.length - 1; r >= 0; --r) {
          var o = this.tryEntries[r];
          if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) {
            var i = o;
            break;
          }
        }
        i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null);
        var a = i ? i.completion : {};
        return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a);
      },
      complete: function (t, e) {
        if ("throw" === t.type) throw t.arg;
        return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y;
      },
      finish: function (t) {
        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
          var r = this.tryEntries[e];
          if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y;
        }
      },
      catch: function (t) {
        for (var e = this.tryEntries.length - 1; e >= 0; --e) {
          var r = this.tryEntries[e];
          if (r.tryLoc === t) {
            var n = r.completion;
            if ("throw" === n.type) {
              var o = n.arg;
              resetTryEntry(r);
            }
            return o;
          }
        }
        throw Error("незаконная попытка catch");
      },
      delegateYield: function (e, r, n) {
        return this.delegate = {
          iterator: values(e),
          resultName: r,
          nextLoc: n
        }, "next" === this.method && (this.arg = t), y;
      }
    }, e;
  }

  // Преобразование значения к примитивному типу
  function _toPrimitive(t, r) {
    if ("object" != typeof t || !t) return t;
    var e = t[Symbol.toPrimitive];
    if (void 0 !== e) {
      var i = e.call(t, r || "default");
      if ("object" != typeof i) return i;
      throw new TypeError("@@toPrimitive должен возвращать примитивное значение.");
    }
    return ("string" === r ? String : Number)(t);
  }

  // Преобразование ключа свойства к строке/символу
  function _toPropertyKey(t) {
    var i = _toPrimitive(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }

  // Шаг выполнения асинхронного генератора
  function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
      var info = gen[key](arg);
      var value = info.value;
    } catch (error) {
      Lampa.Console.error('Ошибка в asyncGeneratorStep: ' + error.message);
      reject(error);
      return;
    }
    if (info.done) {
      resolve(value);
    } else {
      Promise.resolve(value).then(_next, _throw);
    }
  }

  // Преобразование функции с генератором в асинхронную
  function _asyncToGenerator(fn) {
    return function () {
      var self = this,
        args = arguments;
      return new Promise(function (resolve, reject) {
        var gen = fn.apply(self, args);
        function _next(value) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
        }
        function _throw(err) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
        }
        _next(undefined);
      });
    };
  }

  // Создание или обновление свойства объекта
  function _defineProperty(obj, key, value) {
    key = _toPropertyKey(key);
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }
    return obj;
  }

  // Преобразование массиво-подобных структур в массив
  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
  }
  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);
  }
  function _iterableToArray(iter) {
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
  }
  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }
  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
    return arr2;
  }
  function _nonIterableSpread() {
    throw new TypeError("Неверная попытка распространить неитерируемый экземпляр.\nДля того чтобы быть итерируемым, не-массивные объекты должны иметь метод [Symbol.iterator]().");
  }

  // Основная функция для выполнения GraphQL-запроса к Shikimori API
  function main(params, oncomplite, onerror) {
    Lampa.Console.log('Запуск функции main с параметрами: ' + JSON.stringify(params));
    $(document).ready(function () {
      var limit = params.isTop100 ? 50 : (params.limit || 36);
      var query = "\n	query Animes {\n	animes(limit: ".concat(limit, ", order: ").concat(params.sort || 'aired_on', ", page: ").concat(params.page, "\n	");

      if (params.kind) {
        query += ", kind: \"".concat(params.kind, "\"");
      }
      if (params.status) {
        query += ", status: \"".concat(params.status, "\"");
      }
      if (params.genre) {
        query += ", genre: \"".concat(params.genre, "\"");
      }
      if (params.seasons) {
        query += ", season: \"".concat(params.seasons, "\"");
      }

      query += ") {\n                    id\n                    name\n                    russian\n                    licenseNameRu\n                    english\n                    japanese\n                    kind\n                    score\n                    status\n                    season\n                    airedOn { year }\n                    poster {\n                        originalUrl\n                    }\n                }\n            }\n        ";

      if (params.isTop100) {
        var requests = [
          $.ajax({
            url: 'https://shikimori.one/api/graphql',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
              query: query.replace("page: " + params.page, "page: 1")
            })
          }),
          $.ajax({
            url: 'https://shikimori.one/api/graphql',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
              query: query.replace("page: " + params.page, "page: 2")
            })
          })
        ];
        Lampa.Console.log('Отправка запросов для Top100: ' + JSON.stringify(requests));
        Promise.all(requests).then(function (responses) {
          var allAnimes = responses[0].data.animes.concat(responses[1].data.animes);
          Lampa.Console.log('Получен объединённый результат Top100: ' + JSON.stringify(allAnimes));
          oncomplite(allAnimes);
        }).catch(function (error) {
          Lampa.Console.error('Ошибка запроса Top100: ' + error.message);
          onerror(error);
        });
      } else {
        $.ajax({
          url: 'https://shikimori.one/api/graphql',
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({
            query: query
          }),
          success: function success(response) {
            Lampa.Console.log('Успешный запрос к Shikimori API: ' + JSON.stringify(response));
            oncomplite(response.data.animes);
          },
          error: function error(_error) {
            Lampa.Console.error('Ошибка запроса к Shikimori API: ' + _error.status + ' ' + _error.statusText);
            onerror(_error);
          }
        });
      }
    });
  }

  // Поиск информации об аниме через внешние API
  function search(animeData) {
    function cleanName(name) {
      return name.replace(/\s{2,}/g, ' ').trim();
    }

    Lampa.Console.log('!!! Функция search запущена !!!');
    Lampa.Noty.show('Функция search запущена');
    Lampa.Console.log('Входные данные animeData: ' + JSON.stringify(animeData));

    if (!animeData || !animeData.id) {
      Lampa.Console.error('Некорректные входные данные: ' + JSON.stringify(animeData));
      Lampa.Noty.show('Ошибка: нет данных для поиска');
      return;
    }

    function mapKindToTmdbType(kind) {
      switch (kind) {
        case 'movie': return 'movie';
        case 'tv':
        case 'tv_special': return 'tv';
        case 'ova':
        case 'ona':
        case 'special':
        case 'music':
        case 'pv':
        case 'cm': return 'movie';
        default: return 'tv';
      }
    }

    const tmdbType = mapKindToTmdbType(animeData.kind);
    Lampa.Console.log('Тип TMDB: ' + tmdbType);

    Lampa.Console.log('Запрос к arm.haglund.dev для ID: ' + animeData.id);
    $.get("https://arm.haglund.dev/api/v2/ids?source=myanimelist&id=" + animeData.id)
      .done(function (response) {
        Lampa.Console.log('Ответ от arm.haglund.dev: ' + JSON.stringify(response));
        if (response && response.themoviedb) {
          Lampa.Console.log('TMDB ID получен: ' + response.themoviedb);
          getTmdb(response.themoviedb, tmdbType, function (result) {
            Lampa.Console.log('Результат getTmdb: ' + JSON.stringify(result));
            if (result) {
              processResults(result, animeData.kind);
            } else {
              Lampa.Console.log('getTmdb вернул null, переход к расширенному поиску');
              extendedSearch(animeData, 0);
            }
          });
        } else {
          Lampa.Console.log('TMDB ID не найден, переход к расширенному поиску');
          extendedSearch(animeData, 0);
        }
      })
      .fail(function (jqXHR) {
        Lampa.Console.warn('Ошибка arm.haglund.dev: ' + jqXHR.status + ' ' + jqXHR.statusText);
        Lampa.Console.log('Переход к расширенному поиску из-за ошибки');
        extendedSearch(animeData, 0);
      });

    function extendedSearch(animeData, nameIndex) {
      const names = [
        animeData.name,
        animeData.japanese,
        animeData.english,
        animeData.russian,
        animeData.licenseNameRu
      ].filter(n => n && typeof n === 'string');

      Lampa.Console.log('Названия для поиска: ' + JSON.stringify(names));

      if (nameIndex >= names.length) {
        Lampa.Console.warn('Все названия исчерпаны: ' + JSON.stringify(animeData));
        processResults({ total_results: 0 }, animeData.kind);
        return;
      }

      const apiKey = "4ef0d7355d9ffb5151e987764708ce96";
      const apiUrlTMDB = 'https://api.themoviedb.org/3/';
      const apiUrlProxy = 'apitmdb.' + (Lampa.Manifest && Lampa.Manifest.cub_domain ? Lampa.Manifest.cub_domain : 'cub.red') + '/3/';
      const baseUrl = Lampa.Storage.field('proxy_tmdb') ? Lampa.Utils.protocol() + apiUrlProxy : apiUrlTMDB;
      const query = cleanName(names[nameIndex]);
      const year = animeData.airedOn && animeData.airedOn.year ? `&first_air_date_year=${animeData.airedOn.year}` : '';
      const language = Lampa.Storage.field('language');
      const url = `${baseUrl}search/multi?api_key=${apiKey}&language=${language}&include_adult=true&query=${encodeURIComponent(query)}${year}`;

      Lampa.Console.log(`Поиск для "${names[nameIndex]}" по URL: ${url}`);
      $.get(url)
        .done(function (data) {
          Lampa.Console.log(`Ответ TMDB для "${names[nameIndex]}": ${JSON.stringify(data)}`);
          if (data && data.total_results > 0) {
            handleTmdbResponse(data, animeData);
          } else {
            Lampa.Console.log(`Нет результатов для "${names[nameIndex]}", следующий шаг`);
            extendedSearch(animeData, nameIndex + 1);
          }
        })
        .fail(function (err) {
          Lampa.Console.error(`Ошибка поиска TMDB для "${names[nameIndex]}": ${err.status} ${err.statusText}`);
          extendedSearch(animeData, nameIndex + 1);
        });
    }

    function getTmdb(id, type, callback) {
      const apiKey = "4ef0d7355d9ffb5151e987764708ce96";
      const apiUrlTMDB = 'https://api.themoviedb.org/3/';
      const apiUrlProxy = 'apitmdb.' + (Lampa.Manifest && Lampa.Manifest.cub_domain ? Lampa.Manifest.cub_domain : 'cub.red') + '/3/';
      const language = Lampa.Storage.field('language');
      const request = `${type}/${id}?api_key=${apiKey}&language=${language}`;
      const url = Lampa.Storage.field('proxy_tmdb') ? Lampa.Utils.protocol() + apiUrlProxy + request : apiUrlTMDB + request;

      Lampa.Console.log('Запрос getTmdb: ' + url);
      $.get(url)
        .done(function (data) {
          Lampa.Console.log('Ответ getTmdb: ' + JSON.stringify(data));
          callback(data || null);
        })
        .fail(function (err) {
          Lampa.Console.error('Ошибка getTmdb: ' + err.status + ' ' + err.statusText);
          callback(null);
        });
    }

    function handleTmdbResponse(tmdbResponse, animeData) {
      Lampa.Console.log('Обработка ответа TMDB: ' + JSON.stringify(tmdbResponse));
      if (!tmdbResponse || tmdbResponse.total_results === 0) {
        processResults({ total_results: 0 }, animeData.kind);
      } else {
        processResults(tmdbResponse, animeData.kind);
      }
    }

    function processResults(response, kind) {
      Lampa.Console.log('Результат поиска: ' + JSON.stringify(response));
      if (!response) {
        Lampa.Console.error('Ответ пустой');
        Lampa.Noty.show('Не удалось найти аниме: сервер вернул пустой ответ');
        return;
      }

      var menu = [];
      if ('total_results' in response) {
        if (response.total_results === 0) {
          Lampa.Console.warn('Результатов не найдено');
          Lampa.Noty.show('Не удалось найти аниме в TMDB');
        } else if (response.total_results === 1 && kind !== 'ona') {
          Lampa.Console.log('Найден один результат: ' + JSON.stringify(response.results[0]));
          if (!response.results[0].id || !response.results[0].media_type) {
            Lampa.Console.error('Некорректные данные: ' + JSON.stringify(response.results[0]));
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
          Lampa.Console.log('Найдено несколько результатов: ' + JSON.stringify(response.results));
          response.results.forEach(function (item) {
            if (!item.id || !item.media_type) {
              Lampa.Console.warn('Пропущен элемент: ' + JSON.stringify(item));
              return;
            }
            menu.push({
              title: `[${item.media_type.toUpperCase()}] ${item.name || item.title}`,
              card: item
            });
          });
          if (menu.length === 0) {
            Lampa.Console.error('Все элементы некорректны');
            Lampa.Noty.show('Не удалось найти аниме: нет валидных данных');
            return;
          }
          Lampa.Select.show({
            title: kind === 'ona' ? 'Выберите ONA из списка' : 'Выберите аниме',
            items: menu,
            onBack: function () {
              Lampa.Controller.toggle("content");
            },
            onSelect: function (a) {
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
      } else if (kind !== 'ona') {
        Lampa.Console.log('Прямой результат: ' + JSON.stringify(response));
        if (!response || !response.id) {
          Lampa.Console.error('Некорректный прямой результат: ' + JSON.stringify(response));
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
        Lampa.Console.log('Тип ONA: повторный поиск');
        extendedSearch(animeData, 0);
      }
    }
  }

  var API = {
    main: main,
    search: search
  };

  // Класс для создания карточки аниме
  function Card(data, userLang) {
    Lampa.Console.log('Создание карточки для: ' + JSON.stringify(data));
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
      Lampa.Console.log('Рендеринг карточки');
      return item;
    };
    this.destroy = function () {
      Lampa.Console.log('Уничтожение карточки');
      item.remove();
    };
  }

  // Основной компонент для отображения каталога
  function Component$1(object) {
    Lampa.Console.log('Инициализация Component$1 с объектом: ' + JSON.stringify(object));
    var userLang = Lampa.Storage.field('language');
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
      Lampa.Console.log('Вызов метода create');
      API.main(object, this.build.bind(this), this.empty.bind(this));
    };

    this.build = function (result) {
      var _this = this;
      Lampa.Console.log('Вызов метода build с результатом: ' + JSON.stringify(result));
      scroll.minus();
      scroll.onWheel = function (step) {
        if (!Lampa.Controller.own(_this)) _this.start();
        if (step > 0) Navigator.move('down'); else Navigator.move('up');
      };
      if (!object.isTop100) {
        scroll.onEnd = function () {
          Lampa.Console.log('Достигнут конец прокрутки, увеличение страницы');
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
      Lampa.Console.log('Вызов метода headeraction');
      var settings = {
        "url": "https://shikimori.one/api/genres",
        "method": "GET",
        "timeout": 0
      };
      var filters = {};
      $.ajax(settings).done(function (response) {
        Lampa.Console.log('Получен ответ от API жанров: ' + JSON.stringify(response));
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
        return [...dynamicSeasons, ...yearRanges];
      }
      filters.seasons = {
        title: 'Сезон',
        items: generateSeasonJSON()
      };
      Lampa.Console.log('Сформированы фильтры: ' + JSON.stringify(filters));
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
        Lampa.Console.log('Сформирован запрос для Shikimori: ' + JSON.stringify(query));
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
        if (query.kind) params.kind = query.kind;
        if (query.status) params.status = query.status;
        if (query.genre) params.genre = query.genre;
        if (query.sort) params.sort = query.sort;
        if (query.seasons) params.seasons = query.seasons;
        Lampa.Console.log('Запуск поиска с параметрами: ' + JSON.stringify(params));
        Lampa.Activity.push(params);
      }
      serverElement.on('hover:enter', function () {
        Lampa.Console.log('Событие hover:enter на элементе поиска');
        mainMenu();
      });

      var homeElement = head.find('.Shikimori__home');
      homeElement.on('hover:enter', function () {
        Lampa.Console.log('Событие hover:enter на элементе Главная');
        Lampa.Activity.push({
          url: '',
          title: 'Shikimori',
          component: 'Shikimori',
          page: 1
        });
      });

      var top100TvElement = head.find('.Shikimori__top100_tv');
      top100TvElement.on('hover:enter', function () {
        Lampa.Console.log('Событие hover:enter на элементе Топ100_ТВ');
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
        Lampa.Console.log('Событие hover:enter на элементе Топ100_Фильмы');
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
        Lampa.Console.log('Событие hover:enter на элементе Топ100_ONA');
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
      Lampa.Console.log('Вызов метода empty');
      var empty = new Lampa.Empty();
      html.appendChild(empty.render(true));
      this.start = empty.start;
      this.activity.loader(false);
      this.activity.toggle();
    };

    this.body = function (data) {
      Lampa.Console.log('Вызов метода body с данными: ' + JSON.stringify(data));
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
                Lampa.Console.log('Событие hover:enter на карточке: ' + JSON.stringify(anime));
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
          if (Navigator.canmove("left")) Navigator.move("left"); else Lampa.Controller.toggle("menu");
        },
        right: function right() {
          Navigator.move("right");
        },
        up: function up() {
          if (Navigator.canmove("up")) Navigator.move("up"); else Lampa.Controller.toggle("head");
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
      Lampa.Console.log('Уничтожение Component$1');
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
    Lampa.Console.log('Инициализация Component');
    Lampa.Listener.follow("full", /*#__PURE__*/function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(e) {
        var getMAL, response, dubbers, subbers, shikimoriRates;
        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              if (!(e.type === "complite")) {
                _context.next = 21;
                break;
              }
              _context.prev = 1;
              Lampa.Console.log('Запрос к arm.haglund.dev для TMDB ID: ' + e.object.id);
              _context.next = 4;
              return $.ajax({
                url: "https://arm.haglund.dev/api/v2/themoviedb?id=".concat(e.object.id),
                method: "GET",
                timeout: 0
              });
            case 4:
              getMAL = _context.sent;
              Lampa.Console.log('Ответ от arm.haglund.dev: ' + JSON.stringify(getMAL));
              if (getMAL.length) {
                _context.next = 8;
                break;
              }
              Lampa.Console.warn("Данные для ID " + e.object.id + " не найдены.");
              return _context.abrupt("return");
            case 8:
              Lampa.Console.log('Запрос к Shikimori API для MAL ID: ' + getMAL[0].myanimelist);
              _context.next = 10;
              return $.ajax({
                url: "https://shikimori.one/api/animes/".concat(getMAL[0].myanimelist),
                method: "GET",
                timeout: 0
              });
            case 10:
              response = _context.sent;
              Lampa.Console.log('Ответ от Shikimori API: ' + JSON.stringify(response));
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
              Lampa.Console.error("Ошибка при получении данных: " + _context.t0.message);
            case 21:
            case "end":
              return _context.stop();
          }
        }, _callee, null, [[1, 18]]);
      }));
      return function (_x) {
        return _ref.apply(this, arguments);
      };
    }());
  }

  // Функция для добавления кнопки Shikimori в меню приложения
  function add() {
    Lampa.Console.log('Запуск функции add');
    var button = $("<li class=\"menu__item selector\">\n            <div class=\"menu__ico\">\n                <img src=\"https://kartmansms.github.io/testing/Shikimori/icons/shikimori-icon.svg\" alt=\"Shikimori icon\" class=\"menu-icon\" />\n            </div>\n            <div class=\"menu__text\">Shikimori</div>\n        </li>");

    button.on("hover:enter", function () {
      Lampa.Console.log('Событие hover:enter на кнопке Shikimori');
      Lampa.Activity.push({
        url: '',
        title: 'Shikimori',
        component: 'Shikimori',
        page: 1
      });
    });

    Lampa.Console.log('Добавление кнопки в меню');
    $(".menu .menu__list").eq(0).append(button);
  }

  // Функция инициализации плагина с проверкой готовности Lampa
  function startPlugin() {
    Lampa.Console.log('!!! Попытка запуска startPlugin !!!');
    Lampa.Noty.show('Запуск startPlugin');
    
    if (!window.Lampa || !window.Lampa.Storage) {
      Lampa.Console.log('Lampa не готова: window.Lampa: ' + !!window.Lampa + ', window.Lampa.Storage: ' + !!window.Lampa.Storage);
      Lampa.Noty.show('Lampa еще не готова, повторная проверка через 100 мс');
      setTimeout(startPlugin, 100);
      return;
    }

    Lampa.Console.log('Lampa готова, инициализация плагина Shikimori');
    window.plugin_shikimori_ready = true;

    var manifest = {
      type: "other",
      version: "1.0",
      name: "LKE Shikimori",
      description: "Добавляет каталог Shikimori",
      component: "Shikimori"
    };

    Lampa.Console.log('Регистрация манифеста: ' + JSON.stringify(manifest));
    Lampa.Manifest.plugins = manifest;

    Lampa.Console.log('Добавление шаблона ShikimoriStyle');
    Lampa.Template.add('ShikimoriStyle', "<style>\n            .Shikimori-catalog--list.category-full{-webkit-box-pack:justify !important;-webkit-justify-content:space-between !important;-ms-flex-pack:justify !important;justify-content:space-between !important}.Shikimori-head.torrent-filter{margin-left:1.5em}.Shikimori.card__type{background:#ff4242;color:#fff}.Shikimori .card__season{position:absolute;left:-0.8em;top:3.4em;padding:.4em .4em;background:#05f;color:#fff;font-size:.8em;-webkit-border-radius:.3em;border-radius:.3em}.Shikimori .card__status{position:absolute;left:-0.8em;bottom:1em;padding:.4em .4em;background:#ffe216;color:#000;font-size:.8em;-webkit-border-radius:.3em;border-radius:.3em}.Shikimori.card__season.no-season{display:none}.menu-icon{width:24px;height:24px;fill:currentColor;}\n        </style>");

    Lampa.Console.log('Добавление шаблона Shikimori-Card');
    Lampa.Template.add("Shikimori-Card", "<div class=\"Shikimori card selector layer--visible layer--render\">\n                <div class=\"Shikimori card__view\">\n                    <img src=\"{img}\" class=\"Shikimori card__img\" />\n                    <div class=\"Shikimori card__type\">{type}</div>\n                    <div class=\"Shikimori card__vote\">{rate}</div>\n                    <div class=\"Shikimori card__season\">{season}</div>\n                    <div class=\"Shikimori card__status\">{status}</div>\n                </div>\n                <div class=\"Shikimori card__title\">{title}</div>\n            </div>");

    Lampa.Console.log('Регистрация компонента Shikimori');
    Lampa.Component.add(manifest.component, Component$1);

    Lampa.Console.log('Запуск Component');
    Component();

    Lampa.Console.log('Добавление стилей в body');
    $('body').append(Lampa.Template.get('ShikimoriStyle', {}, true));

    if (window.appready) {
      Lampa.Console.log('window.appready уже true, вызов add()');
      add();
    } else {
      Lampa.Console.log('Ожидание события app ready');
      Lampa.Listener.follow("app", function (event) {
        Lampa.Console.log('Событие app: ' + event.type);
        if (event.type === "ready") {
          Lampa.Console.log('Lampa готова, вызов add()');
          add();
        }
      });
    }
  }

  Lampa.Console.log('Проверка window.plugin_shikimori_ready: ' + window.plugin_shikimori_ready);
  if (!window.plugin_shikimori_ready) {
    Lampa.Console.log('Запуск startPlugin');
    startPlugin();
  } else {
    Lampa.Console.log('Плагин уже инициализирован');
  }
})();