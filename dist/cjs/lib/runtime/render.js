"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderError = exports.RenderData = exports.RenderStatic = exports.renderDefault = exports.RenderAPI = exports.RenderEvent = exports.EventStreamHandler = exports.RenderServer = exports.Streamable = exports.AbstractRender = void 0;
var path_1 = require("path");
var preact_1 = require("preact");
var preact_render_to_string_1 = require("preact-render-to-string");
var stream_1 = require("stream");
var fs_1 = require("fs");
var zlib_1 = require("zlib");
var transpilor_1 = require("./transpilor");
var serializer_1 = require("../utils/serializer");
var pubsub_1 = __importDefault(require("../utils/pubsub"));
var AbstractRender = /** @class */ (function () {
    function AbstractRender(options) {
        this.options = options;
        if (this.options.isDev) {
            this.renderDev();
        }
        else {
            this.render();
        }
    }
    AbstractRender.ClearCache = function () {
        AbstractRender.CACHE_API_METHODS.clear();
        AbstractRender.CACHE_BUNDLES.clear();
        AbstractRender.RequireCaches.forEach(function (filePath) {
            delete require.cache[filePath];
        });
        AbstractRender.RequireCaches.clear();
    };
    AbstractRender.prototype.getParams = function () {
        var _this = this;
        var _a = this.options, req = _a.req, pageName = _a.pathname;
        var paths = pageName.split("/").filter(function (x) { return x.startsWith(":"); });
        if (paths.length === 0)
            return undefined;
        return paths.reduce(function (acc, curr, i) {
            var param = curr.replace(":", "");
            _this.addParam(acc, param, req.getParameter(i));
            return acc;
        }, new Map());
    };
    AbstractRender.prototype.addParam = function (map, key, value, i) {
        if (i === void 0) { i = 0; }
        if (!map.has(key)) {
            map.set(key, value);
        }
        else {
            ++i;
            this.addParam(map, key + i, value, i);
        }
    };
    AbstractRender.prototype.getModuleFromPage = function (isDev) {
        if (isDev === void 0) { isDev = false; }
        var pageName = this.options.pathname;
        var filePath = (0, path_1.join)(AbstractRender.PWD, ".ssr", "output", "server", "".concat(pageName, ".js"));
        if (isDev) {
            AbstractRender.RequireCaches.add(filePath);
        }
        return require(filePath);
    };
    AbstractRender.prototype.render404 = function () {
        var res = this.options.res;
        res.writeStatus("404 Not Found");
        res.end("404 Not Found");
    };
    AbstractRender.PWD = process.cwd();
    AbstractRender.RequireCaches = new Set();
    AbstractRender.CACHE_API_METHODS = new Map();
    AbstractRender.CACHE_BUNDLES = new Map();
    return AbstractRender;
}());
exports.AbstractRender = AbstractRender;
var Streamable = /** @class */ (function (_super) {
    __extends(Streamable, _super);
    function Streamable() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Streamable.prototype.render = function () {
    };
    Streamable.prototype.renderDev = function () {
    };
    Streamable.prototype.toArrayBuffer = function (buffer) {
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    };
    /* Either onAborted or simply finished request */
    Streamable.prototype.onAbortedOrFinishedResponse = function (res, readStream) {
        if (res.id == -1) {
            console.log("ERROR! onAbortedOrFinishedResponse called twice for the same res!");
        }
        else {
            readStream.destroy();
        }
        /* Mark this response already accounted for */
        res.id = -1;
    };
    /* Helper function to pipe the ReadaleStream over an Http responses */
    Streamable.prototype.pipeStreamOverResponse = function (res, readStream, totalSize) {
        var _this = this;
        /* Careful! If Node.js would emit error before the first res.tryEnd, res will hang and never time out */
        /* For this demo, I skipped checking for Node.js errors, you are free to PR fixes to this example */
        readStream.on('data', function (chunk) {
            /* We only take standard V8 units of data */
            var ab = _this.toArrayBuffer(chunk);
            /* Store where we are, globally, in our response */
            var lastOffset = res.getWriteOffset();
            /* Streaming a chunk returns whether that chunk was sent, and if that chunk was last */
            var _a = res.tryEnd(ab, totalSize), ok = _a[0], done = _a[1];
            /* Did we successfully send last chunk? */
            if (done) {
                _this.onAbortedOrFinishedResponse(res, readStream);
            }
            else if (!ok) {
                /* If we could not send this chunk, pause */
                readStream.pause();
                /* Save unsent chunk for when we can send it */
                res.ab = ab;
                res.abOffset = lastOffset;
                /* Register async handlers for drainage */
                res.onWritable(function (offset) {
                    /* Here the timeout is off, we can spend as much time before calling tryEnd we want to */
                    /* On failure the timeout will start */
                    var _a = res.tryEnd(res.ab.slice(offset - res.abOffset), totalSize), ok = _a[0], done = _a[1];
                    if (done) {
                        _this.onAbortedOrFinishedResponse(res, readStream);
                    }
                    else if (ok) {
                        /* We sent a chunk and it was not the last one, so let's resume reading.
                         * Timeout is still disabled, so we can spend any amount of time waiting
                         * for more chunks to send. */
                        readStream.resume();
                    }
                    /* We always have to return true/false in onWritable.
                     * If you did not send anything, return true for success. */
                    return ok;
                });
            }
        }).on('error', function (e) {
            /* Todo: handle errors of the stream, probably good to simply close the response */
            _this.render404();
            console.log("Error reading file, ", e);
        });
        /* If you plan to asyncronously respond later on, you MUST listen to onAborted BEFORE returning */
        res.onAborted(function () {
            _this.onAbortedOrFinishedResponse(res, readStream);
        });
    };
    return Streamable;
}(AbstractRender));
exports.Streamable = Streamable;
var RenderServer = /** @class */ (function (_super) {
    __extends(RenderServer, _super);
    function RenderServer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RenderServer.prototype.render = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, res, path, pwd, componentPath, splittedPath, pageDirName, component, defaultComponent_1, _b, Element_1, html, clientBundle, finalHtml, e_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = this.options, res = _a.res, path = _a.pathname;
                        res.onAborted(function () {
                            res.aborted = true;
                        });
                        pwd = AbstractRender.PWD;
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 6, , 7]);
                        componentPath = (0, path_1.join)(pwd, ".ssr", "output", "server", "pages", path + ".js");
                        splittedPath = path.split("/");
                        splittedPath.pop();
                        pageDirName = (0, path_1.join)(pwd, "src", splittedPath.join("/"));
                        console.log("🚀 ~ file: index.ts ~ line 519 ~ renderServer ~ pageDirName", pageDirName);
                        component = require(componentPath).default;
                        if (!(component.default.constructor.name === 'AsyncFunction')) return [3 /*break*/, 3];
                        return [4 /*yield*/, component.default()];
                    case 2:
                        _b = _c.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _b = component.default();
                        _c.label = 4;
                    case 4:
                        defaultComponent_1 = _b;
                        Element_1 = (0, preact_1.createElement)(function () { return defaultComponent_1; }, null);
                        res.writeHeader("Content-Type", "text/html");
                        html = (0, preact_render_to_string_1.render)(Element_1);
                        return [4 /*yield*/, (0, transpilor_1.generateClientBundle)({ filePath: componentPath, data: null })];
                    case 5:
                        clientBundle = _c.sent();
                        finalHtml = html.replace("</body>", "<script>".concat(clientBundle, "</script></body>"));
                        return [2 /*return*/, res.end(finalHtml)];
                    case 6:
                        e_1 = _c.sent();
                        console.error(e_1);
                        return [2 /*return*/, this.render404()];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    RenderServer.prototype.renderDev = function () {
        this.render();
    };
    return RenderServer;
}(AbstractRender));
exports.RenderServer = RenderServer;
var EventStreamHandler = /** @class */ (function () {
    function EventStreamHandler(res) {
        this.res = res;
    }
    EventStreamHandler.prototype.handle = function (onSend, onAbort) {
        var _this = this;
        var res = this.res;
        this.sendHeaders(res);
        res.writeStatus('200 OK');
        var chainPayload = onSend(function (data) {
            res.write(_this.serializeData(data));
        });
        res.onAborted(function () {
            onAbort(chainPayload);
        });
    };
    EventStreamHandler.prototype.serializeData = function (data) {
        return "data: ".concat(JSON.stringify(data), "\n\n");
    };
    EventStreamHandler.prototype.sendHeaders = function (res) {
        for (var _i = 0, _a = RenderEvent.HEADERS; _i < _a.length; _i++) {
            var _b = _a[_i], header = _b[0], value = _b[1];
            res.writeHeader(header, value);
        }
    };
    return EventStreamHandler;
}());
exports.EventStreamHandler = EventStreamHandler;
var RenderEvent = /** @class */ (function (_super) {
    __extends(RenderEvent, _super);
    function RenderEvent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RenderEvent.prototype.abstractRender = function (isDev) {
        var _this = this;
        if (isDev === void 0) { isDev = false; }
        var _a = this.options, res = _a.res, req = _a.req, pageName = _a.pathname;
        res.onAborted(function () {
            res.aborted = true;
        });
        var getEvent = this.getModuleFromPage(isDev);
        var event = getEvent.default;
        var payload = {
            url: req.getUrl(),
            params: undefined
        };
        if (pageName.includes("/:")) {
            var params = this.getParams();
            if (params) {
                // @ts-ignore
                payload.params = Array.from(params.entries()).reduce(function (acc, _a) {
                    var key = _a[0], value = _a[1];
                    // @ts-ignore
                    acc[key.replace(".ev", "")] = value.replace(".ev", "");
                    return acc;
                }, {});
            }
        }
        if (event) {
            var eventStreamHandler = new EventStreamHandler(res);
            eventStreamHandler.handle(function (sendData) {
                return setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                _a = sendData;
                                return [4 /*yield*/, event.runner(payload)];
                            case 1:
                                _a.apply(void 0, [_b.sent()]);
                                return [2 /*return*/];
                        }
                    });
                }); }, event.invalidate);
            }, function (intervall) {
                if (intervall) {
                    clearInterval(intervall);
                }
            });
        }
        else {
            console.log("No event found");
            return this.render404();
        }
    };
    RenderEvent.prototype.render = function () {
        this.abstractRender();
    };
    RenderEvent.prototype.renderDev = function () {
        this.abstractRender(true);
    };
    RenderEvent.HEADERS = [
        ['Content-Type', 'text/event-stream'],
        ['Connection', 'keep-alive'],
        ['Cache-Control', 'no-cache']
    ];
    return RenderEvent;
}(AbstractRender));
exports.RenderEvent = RenderEvent;
var RenderAPI = /** @class */ (function (_super) {
    __extends(RenderAPI, _super);
    function RenderAPI() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RenderAPI.prototype.render = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, res, req, pageName, method_1, api, dataCall, data, _b, e_2;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = this.options, res = _a.res, req = _a.req, pageName = _a.pathname;
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 7, , 8]);
                        res.onAborted(function () {
                            res.aborted = true;
                        });
                        method_1 = req.getMethod();
                        api = this.getAPIMethod(pageName, method_1);
                        if (!api) return [3 /*break*/, 5];
                        dataCall = api({
                            url: pageName,
                            body: function () { return __awaiter(_this, void 0, void 0, function () {
                                var _this = this;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            if (!(method_1 !== "get")) return [3 /*break*/, 2];
                                            return [4 /*yield*/, new Promise(function (resolve, reject) {
                                                    _this.readJson(res, function (obj) {
                                                        resolve(obj);
                                                    }, function () {
                                                        /* Request was prematurely aborted or invalid or missing, stop reading */
                                                        reject('Invalid JSON or no data at all!');
                                                    });
                                                })];
                                        case 1: return [2 /*return*/, _a.sent()];
                                        case 2: return [2 /*return*/];
                                    }
                                });
                            }); },
                            params: function () {
                                var params = pageName.includes(":") ? _this.getParams() : undefined;
                                return params ? Object.fromEntries(params) : undefined;
                            },
                            headers: function () {
                                var headers = new Map();
                                req.forEach(function (key, value) {
                                    headers.set(key, value);
                                });
                                return headers;
                            },
                            setCookie: function (key, value, options) {
                                if (options === void 0) { options = []; }
                                if (options.length === 0) {
                                    res.writeHeader("Set-Cookie", "".concat(key, "=").concat(value));
                                }
                                else {
                                    res.writeHeader("Set-Cookie", "".concat(key, "=").concat(value, ";").concat(options.map(function (x) { return "".concat(x[0], "=").concat(x[1]); }).join(";")));
                                }
                            },
                            writeHeader: function (key, value) {
                                res.writeHeader(key, value);
                            },
                            status: function (code) {
                                res.writeStatus(code.toString());
                            }
                        });
                        if (!dataCall.then) return [3 /*break*/, 3];
                        return [4 /*yield*/, dataCall];
                    case 2:
                        _b = _c.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _b = dataCall;
                        _c.label = 4;
                    case 4:
                        data = _b;
                        if (data.stream) {
                            if (!data.length) {
                                console.log("Error reading stream");
                                return [2 /*return*/, new RenderError(__assign(__assign({}, this.options), { error: 500, isDev: this.options.isDev }))];
                            }
                            this.pipeStreamOverResponse(res, data.stream, data.length);
                        }
                        else {
                            res.writeHeader("Content-Type", "application/json");
                            return [2 /*return*/, res.end(JSON.stringify(data))];
                        }
                        return [3 /*break*/, 6];
                    case 5: return [2 /*return*/, this.render404()];
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        e_2 = _c.sent();
                        console.error(e_2);
                        return [2 /*return*/, this.render404()];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    RenderAPI.prototype.renderDev = function () {
        console.log("RenderAPI.renderDev");
    };
    RenderAPI.prototype.getAPIMethod = function (pageName, methodName) {
        var cacheAPIMethods = AbstractRender.CACHE_API_METHODS;
        if (this.options.isDev) {
            var api = this.getModuleFromPage(this.options.isDev);
            var result = api[methodName];
            if (!result)
                return undefined;
            return result;
        }
        else {
            var key = "".concat(pageName, ".").concat(methodName);
            if (cacheAPIMethods.has(key)) {
                return cacheAPIMethods.get(key);
            }
            else {
                var api = this.getModuleFromPage(this.options.isDev);
                var result = api[methodName];
                if (!result)
                    return undefined;
                cacheAPIMethods.set(key, result);
                return result;
            }
        }
    };
    RenderAPI.prototype.readJson = function (res, cb, err) {
        var buffer = null;
        var bytes = 0;
        /* Register data cb */
        res.onData(function (ab, isLast) {
            var chunk = Buffer.from(ab);
            bytes += chunk.length;
            if (isLast) {
                if (bytes === 0) {
                    cb(undefined);
                    return;
                }
                var json = void 0;
                if (buffer) {
                    try {
                        json = JSON.parse(Buffer.concat([buffer, chunk]));
                    }
                    catch (e) {
                        /* res.close calls onAborted */
                        cb(Buffer.concat([buffer, chunk]));
                        return;
                    }
                    cb(json);
                }
                else {
                    try {
                        json = JSON.parse(chunk);
                    }
                    catch (e) {
                        /* res.close calls onAborted */
                        cb(chunk);
                        return;
                    }
                    cb(json);
                }
            }
            else {
                if (buffer) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                else {
                    buffer = Buffer.concat([chunk]);
                }
            }
        });
    };
    return RenderAPI;
}(Streamable));
exports.RenderAPI = RenderAPI;
var renderDefault = /** @class */ (function (_super) {
    __extends(renderDefault, _super);
    function renderDefault() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    renderDefault.prototype.render = function () {
        console.log("RenderAPI.render");
    };
    renderDefault.prototype.renderDev = function () {
        console.log("RenderAPI.renderDev");
    };
    return renderDefault;
}(AbstractRender));
exports.renderDefault = renderDefault;
var RenderStatic = /** @class */ (function (_super) {
    __extends(RenderStatic, _super);
    function RenderStatic() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RenderStatic.prototype.render = function () {
        var _a = this.options, res = _a.res, req = _a.req, buildReport = _a.buildReport;
        var path = req.getUrl();
        var exts = path.split(".");
        var ext = exts[exts.length - 1];
        var isDataJs = ext === "js" && exts[exts.length - 2] === "data";
        if (isDataJs) {
            var subPath = exts[0];
            var pageName = subPath;
            if (buildReport[pageName]) {
                return new RenderData(__assign({}, this.options));
            }
            else {
                return this.render404();
            }
        }
        if (ext === "js" || ext === "css" || ext === 'html') {
            var mime = RenderStatic.MIME_TYPE[ext];
            if (mime) {
                res.writeHeader("Content-Type", mime);
                if (ext === 'js')
                    res.writeHeader("Content-Encoding", "gzip");
                var cachedBundles = AbstractRender.CACHE_BUNDLES;
                var isBundle = path.endsWith(".bundle.js");
                if (isBundle && cachedBundles.has(path)) {
                    var cachedStream = cachedBundles.get(path);
                    cachedBundles.set(path, cachedStream.pipe(new stream_1.PassThrough()));
                    return this.pipeStreamOverResponse(res, cachedStream, cachedStream.bytesRead);
                }
                var filePath = (0, path_1.join)(AbstractRender.PWD, ".ssr", "output", "static", "".concat(path).concat(ext === 'js' ? '.gz' : ''));
                var stream = (0, fs_1.createReadStream)(filePath);
                var size = stream.bytesRead;
                if (isBundle) {
                    try {
                        var clonedStream = stream.pipe(new stream_1.PassThrough());
                        cachedBundles.set(path, clonedStream);
                    }
                    catch (error) {
                        console.error(error);
                    }
                }
                return this.pipeStreamOverResponse(res, stream, size);
            }
            else {
                return this.render404();
            }
        }
        else {
            return this.render404();
        }
    };
    RenderStatic.prototype.renderDev = function () {
        this.render();
    };
    RenderStatic.MIME_TYPE = {
        "js": "text/javascript",
        "css": "text/css",
        "html": "text/html"
    };
    return RenderStatic;
}(Streamable));
exports.RenderStatic = RenderStatic;
var RenderData = /** @class */ (function (_super) {
    __extends(RenderData, _super);
    function RenderData() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.cachedData = new Map();
        return _this;
    }
    RenderData.prototype.render = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, res, pageName, dataModule, data, dataCall, serialize, template, cachedData_1, cachedValue, serialize, template, dataCall_1, serialize, template, token_1;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this.options, res = _a.res, pageName = _a.pathname;
                        res.onAborted(function () {
                            res.aborted = true;
                        });
                        res.writeHeader("Content-Type", "application/javascript");
                        res.writeHeader("Content-Encoding", "gzip");
                        return [4 /*yield*/, this.getDataModule(pageName)];
                    case 1:
                        dataModule = _b.sent();
                        data = dataModule.data;
                        if (!(typeof data === 'function')) return [3 /*break*/, 2];
                        dataCall = data();
                        serialize = new serializer_1.Serializer(dataCall);
                        template = "function getData(){return '".concat(serialize.toJSON(), "';}");
                        (0, zlib_1.gzip)(template, function (_, result) {
                            res.end(result); // result, so just send it.
                        });
                        return [3 /*break*/, 5];
                    case 2:
                        cachedData_1 = this.cachedData;
                        if (!cachedData_1.has(pageName)) return [3 /*break*/, 3];
                        cachedValue = cachedData_1.get(pageName);
                        if (!res.aborted) {
                            serialize = new serializer_1.Serializer(cachedValue);
                            template = "function getData(){return '".concat(serialize.toJSON(), "';}");
                            (0, zlib_1.gzip)(template, function (_, result) {
                                res.end(result);
                            });
                        }
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, data.runner()];
                    case 4:
                        dataCall_1 = (_b.sent());
                        serialize = new serializer_1.Serializer(dataCall_1);
                        template = "function getData(){return '".concat(serialize.toJSON(), "';}");
                        if (!res.aborted) {
                            (0, zlib_1.gzip)(template, function (_, result) {
                                if (data.invalidate)
                                    cachedData_1.set(pageName, dataCall_1);
                                res.end(result);
                            });
                        }
                        if (data.invalidate) {
                            token_1 = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                                var oldValue, newValue, shouldUpdate, e_3;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            oldValue = cachedData_1.get(pageName);
                                            return [4 /*yield*/, data.runner(function () { return clearInterval(token_1); })];
                                        case 1:
                                            newValue = (_a.sent());
                                            shouldUpdate = data.shouldUpdate;
                                            if (oldValue !== newValue) {
                                                cachedData_1.set(pageName, newValue);
                                                if (shouldUpdate && shouldUpdate(oldValue, newValue)) {
                                                    pubsub_1.default.publish("fetch-".concat(pageName), newValue);
                                                }
                                            }
                                            return [3 /*break*/, 3];
                                        case 2:
                                            e_3 = _a.sent();
                                            console.error(e_3);
                                            clearInterval(token_1);
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); }, data.invalidate * 1000);
                        }
                        _b.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    RenderData.prototype.renderDev = function () {
        this.render();
    };
    RenderData.prototype.getDataModule = function (pageName) {
        return __awaiter(this, void 0, void 0, function () {
            var filePath, result;
            return __generator(this, function (_a) {
                var _b;
                switch (_a.label) {
                    case 0:
                        filePath = (0, path_1.join)(AbstractRender.PWD, ".ssr", "output", "server", "data", "".concat(pageName, ".data.js"));
                        return [4 /*yield*/, (_b = filePath, Promise.resolve().then(function () { return __importStar(require(_b)); }))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result];
                }
            });
        });
    };
    return RenderData;
}(AbstractRender));
exports.RenderData = RenderData;
var RenderError = /** @class */ (function () {
    function RenderError(options) {
        this.options = options;
    }
    RenderError.prototype.render = function () {
        console.log("RenderStatic.render");
    };
    RenderError.prototype.renderDev = function () {
        console.log("RenderStatic.renderDev");
    };
    return RenderError;
}());
exports.RenderError = RenderError;
