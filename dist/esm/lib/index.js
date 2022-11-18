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
import * as uws from "uWebSockets.js";
import { join } from "path";
import { gzip } from "zlib";
import { render as preactRender } from "preact-render-to-string";
import { createReadStream, existsSync } from 'fs';
import { PassThrough } from 'stream';
import babelRegister from "@babel/register";
import "./polyfills/index";
import { createElement } from "preact";
import { generateClientBundle } from "./runtime/transpilor";
import { getPages } from "./utils/page";
export default function server() {
    var _this = this;
    babelRegister({
        presets: ["preact"],
    });
    var _require = require;
    /* Helper function converting Node.js buffer to ArrayBuffer */
    function toArrayBuffer(buffer) {
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }
    /* Either onAborted or simply finished request */
    function onAbortedOrFinishedResponse(res, readStream) {
        if (res.id == -1) {
            console.log("ERROR! onAbortedOrFinishedResponse called twice for the same res!");
        }
        else {
            readStream.destroy();
        }
        /* Mark this response already accounted for */
        res.id = -1;
    }
    /* Helper function to pipe the ReadaleStream over an Http responses */
    function pipeStreamOverResponse(res, readStream, totalSize) {
        /* Careful! If Node.js would emit error before the first res.tryEnd, res will hang and never time out */
        /* For this demo, I skipped checking for Node.js errors, you are free to PR fixes to this example */
        readStream.on('data', function (chunk) {
            /* We only take standard V8 units of data */
            var ab = toArrayBuffer(chunk);
            /* Store where we are, globally, in our response */
            var lastOffset = res.getWriteOffset();
            /* Streaming a chunk returns whether that chunk was sent, and if that chunk was last */
            var _a = res.tryEnd(ab, totalSize), ok = _a[0], done = _a[1];
            /* Did we successfully send last chunk? */
            if (done) {
                onAbortedOrFinishedResponse(res, readStream);
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
                        onAbortedOrFinishedResponse(res, readStream);
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
            render404(res);
            console.log("Error reading file, ", e);
        });
        /* If you plan to asyncronously respond later on, you MUST listen to onAborted BEFORE returning */
        res.onAborted(function () {
            onAbortedOrFinishedResponse(res, readStream);
        });
    }
    var app = uws.App();
    var buildReport = _require(join(process.cwd(), ".ssr", "build-report.json"));
    var mimeType = {
        "js": "text/javascript",
        "css": "text/css",
        "html": "text/html"
    };
    function render404(res) {
        res.writeStatus("404");
        res.end("404 Not Found");
    }
    var isStatic = new Map();
    var cachedData = new Map();
    var cachedChange = [];
    var cachedDataPages = new Map();
    var getDataModule = function (pageName) {
        if (cachedDataPages.has(pageName)) {
            return cachedDataPages.get(pageName);
        }
        else {
            var filePath = join(process.cwd(), ".ssr", "output", "server", "data", "".concat(pageName, ".data.js"));
            var result = _require(filePath);
            cachedDataPages.set(pageName, result);
            return result;
        }
    };
    function renderData(res, pageName) {
        return __awaiter(this, void 0, void 0, function () {
            var data, dataCall, template, cachedValue, template, dataCall_1, template, token_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        res.writeHeader("Content-Type", "application/javascript");
                        res.writeHeader("Content-Encoding", "gzip");
                        data = getDataModule(pageName).data;
                        res.onAborted(function () {
                            res.aborted = true;
                        });
                        if (!(typeof data === 'function')) return [3 /*break*/, 1];
                        dataCall = data();
                        template = "function getData(){return '".concat(JSON.stringify(dataCall), "';}");
                        gzip(template, function (_, result) {
                            res.end(result); // result, so just send it.
                        });
                        return [3 /*break*/, 4];
                    case 1:
                        if (!cachedData.has(pageName)) return [3 /*break*/, 2];
                        cachedValue = cachedData.get(pageName);
                        if (!res.aborted) {
                            template = "function getData(){return '".concat(JSON.stringify(cachedValue), "';}");
                            gzip(template, function (_, result) {
                                res.end(result);
                            });
                        }
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, data.runner()];
                    case 3:
                        dataCall_1 = (_a.sent());
                        template = "function getData(){return '".concat(JSON.stringify(dataCall_1), "';}");
                        if (!res.aborted) {
                            gzip(template, function (_, result) {
                                if (data.invalidate)
                                    cachedData.set(pageName, dataCall_1);
                                res.end(result);
                            });
                        }
                        if (data.invalidate) {
                            token_1 = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                                var currentValue, dataCall_2, shouldUpdate, e_1;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            currentValue = cachedData.get(pageName);
                                            return [4 /*yield*/, data.runner(function () { return clearInterval(token_1); })];
                                        case 1:
                                            dataCall_2 = (_a.sent());
                                            shouldUpdate = data.shouldUpdate;
                                            if (currentValue !== dataCall_2) {
                                                cachedData.set(pageName, dataCall_2);
                                                if (shouldUpdate && shouldUpdate(currentValue, dataCall_2)) {
                                                    cachedChange.push(pageName);
                                                }
                                            }
                                            return [3 /*break*/, 3];
                                        case 2:
                                            e_1 = _a.sent();
                                            console.error(e_1);
                                            clearInterval(token_1);
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); }, data.invalidate * 1000);
                        }
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    function readJson(res, cb, err) {
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
    }
    var apiModulesCache = new Map();
    var getModuleFromPage = function (pageName) {
        if (apiModulesCache.has(pageName)) {
            return apiModulesCache.get(pageName);
        }
        else {
            var filePath = join(process.cwd(), ".ssr", "output", "server", "".concat(pageName, ".js"));
            var result = _require(filePath);
            apiModulesCache.set(pageName, result);
            return result;
        }
    };
    var addParam = function (map, key, value, i) {
        if (i === void 0) { i = 0; }
        if (!map.has(key)) {
            map.set(key, value);
        }
        else {
            ++i;
            addParam(map, key + i, value, i);
        }
    };
    function getParams(req, pageName) {
        var paths = pageName.split("/").filter(function (x) { return x.startsWith(":"); });
        if (paths.length === 0)
            return undefined;
        return paths.reduce(function (acc, curr, i) {
            var param = curr.replace(":", "");
            addParam(acc, param, req.getParameter(i));
            return acc;
        }, new Map());
    }
    var cacheAPIMethods = new Map();
    var getAPIMethod = function (pageName, methodName) {
        var key = "".concat(pageName, ".").concat(methodName);
        if (cacheAPIMethods.has(key)) {
            return cacheAPIMethods.get(key);
        }
        else {
            var api = getModuleFromPage(pageName);
            var result = api[methodName];
            if (!result)
                return undefined;
            cacheAPIMethods.set(key, result);
            return result;
        }
    };
    function renderAPI(res, req, pageName) {
        return __awaiter(this, void 0, void 0, function () {
            var method, api, body, params, dataCall, data, _a, e_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 8, , 9]);
                        res.onAborted(function () {
                            res.aborted = true;
                        });
                        method = req.getMethod();
                        api = getAPIMethod(pageName, method);
                        if (!api) return [3 /*break*/, 6];
                        body = {};
                        if (!(method !== "get")) return [3 /*break*/, 2];
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                readJson(res, function (obj) {
                                    resolve(obj);
                                }, function () {
                                    /* Request was prematurely aborted or invalid or missing, stop reading */
                                    reject('Invalid JSON or no data at all!');
                                });
                            })];
                    case 1:
                        body = _b.sent();
                        _b.label = 2;
                    case 2:
                        params = pageName.includes(":") ? getParams(req, pageName) : undefined;
                        dataCall = api({
                            url: pageName,
                            body: body,
                            params: params ? Object.fromEntries(params) : undefined,
                        });
                        if (!dataCall.then) return [3 /*break*/, 4];
                        return [4 /*yield*/, dataCall];
                    case 3:
                        _a = _b.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        _a = dataCall;
                        _b.label = 5;
                    case 5:
                        data = _a;
                        if (Object.keys(data).includes("stream")) {
                            if (!data.length) {
                                render404(res);
                                console.log("Error reading stream");
                                return [2 /*return*/];
                            }
                            pipeStreamOverResponse(res, data.stream, data.length);
                        }
                        else {
                            res.writeHeader("Content-Type", "application/json");
                            console.log({ data: data, api: Object.keys(data) });
                            return [2 /*return*/, res.end(JSON.stringify(data))];
                        }
                        return [3 /*break*/, 7];
                    case 6: return [2 /*return*/, render404(res)];
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        e_2 = _b.sent();
                        console.error(e_2);
                        render404(res);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    }
    function caching(res) {
        res.writeHeader("Cache-Control", "public, max-age=31536000");
        res.writeHeader("Expires", new Date(Date.now() + 31536000000).toUTCString());
        res.writeHeader("Vary", "Accept-Encoding");
        res.writeHeader("Connection", "keep-alive");
    }
    var cachedBundles = new Map();
    function renderStatic(res, exts, path) {
        return __awaiter(this, void 0, void 0, function () {
            var ext, isDataJs, subPath, pageName, mime, isBundle, cachedStream, filePath, stream, size, clonedStream;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ext = exts[exts.length - 1];
                        isDataJs = ext === "js" && exts[exts.length - 2] === "data";
                        if (!isDataJs) return [3 /*break*/, 3];
                        subPath = exts[0];
                        pageName = subPath;
                        if (!buildReport[pageName]) return [3 /*break*/, 2];
                        return [4 /*yield*/, renderData(res, subPath)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2: return [2 /*return*/, render404(res)];
                    case 3:
                        if (ext === "js" || ext === "css" || ext === 'html') {
                            mime = mimeType[ext];
                            if (mime) {
                                res.writeHeader("Content-Type", mime);
                                if (ext === 'js')
                                    res.writeHeader("Content-Encoding", "gzip");
                                isBundle = path.endsWith(".bundle.js");
                                if (isBundle && cachedBundles.has(path)) {
                                    cachedStream = cachedBundles.get(path);
                                    cachedBundles.set(path, cachedStream.pipe(new PassThrough()));
                                    return [2 /*return*/, pipeStreamOverResponse(res, cachedStream, cachedStream.bytesRead)];
                                }
                                filePath = join(process.cwd(), ".ssr", "output", "static", "".concat(path).concat(ext === 'js' ? '.gz' : ''));
                                stream = createReadStream(filePath);
                                size = stream.bytesRead;
                                if (isBundle) {
                                    try {
                                        clonedStream = stream.pipe(new PassThrough());
                                        cachedBundles.set(path, clonedStream);
                                    }
                                    catch (error) {
                                        console.error(error);
                                    }
                                }
                                return [2 /*return*/, pipeStreamOverResponse(res, stream, size)];
                            }
                            else {
                                // const newPath = exts.slice(0, exts.length - 1).join(".");
                                // console.log("Redirecting to", newPath);
                                // return render(res, req, newPath);
                                return [2 /*return*/, render404(res)];
                            }
                        }
                        else {
                            return [2 /*return*/, render404(res)];
                        }
                        return [2 /*return*/];
                }
            });
        });
    }
    function render(res, req, path, params) {
        if (path === void 0) { path = req.getUrl(); }
        return __awaiter(this, void 0, void 0, function () {
            var exts, pageName, staticPath_1, newPageName, fileExists, filePath, stream, size, splittedPath, p, newPath_1, file, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        //const path = req.getUrl();
                        res.onAborted(function () {
                            res.aborted = true;
                        });
                        exts = path.split(".");
                        if (!(exts.length > 1)) return [3 /*break*/, 2];
                        return [4 /*yield*/, renderStatic(res, exts, path)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        _a.trys.push([2, 8, , 9]);
                        pageName = Object.keys(buildReport).find(function (key) { return key === path; });
                        if (!pageName) return [3 /*break*/, 6];
                        staticPath_1 = req.getUrl();
                        newPageName = Object.keys(buildReport).find(function (key) { return key === staticPath_1 + "/index"; });
                        if (newPageName && path.includes("/:")) {
                            return [2 /*return*/, render(res, req, newPageName, params)];
                        }
                        fileExists = isStatic.get(pageName);
                        if (!fileExists) return [3 /*break*/, 3];
                        filePath = join(process.cwd(), ".ssr", "output", "static", "".concat(pageName, ".html"));
                        stream = createReadStream(filePath);
                        size = stream.bytesRead;
                        return [2 /*return*/, pipeStreamOverResponse(res, stream, size)];
                    case 3: return [4 /*yield*/, renderAPI(res, req, pageName)];
                    case 4: return [2 /*return*/, _a.sent()];
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        console.log("Page not found", path);
                        splittedPath = path.split("/");
                        p = splittedPath.pop();
                        newPath_1 = splittedPath.join("/");
                        file = Object.keys(buildReport).find(function (file) { return file.startsWith(newPath_1 + "/:"); });
                        if (file) {
                            //TODO: render with params
                            return [2 /*return*/, render(res, req, file, p)];
                        }
                        else {
                            return [2 /*return*/, render404(res)];
                        }
                        _a.label = 7;
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        error_1 = _a.sent();
                        console.error(error_1);
                        render404(res);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    }
    function loadWSEndpoints() {
        var wsPath = join(process.cwd(), ".ssr", "output", "server", "ws");
        var isExist = existsSync(wsPath);
        if (isExist) {
            var files = getPages(wsPath, join);
            files.forEach(function (file) {
                var object = _require(file).default;
                var fileName = file.split("/server/ws/");
                var pageName = fileName[1].split(".ws.js")[0];
                app.ws("/".concat(pageName), {
                    compression: uws.SHARED_COMPRESSOR,
                    maxPayloadLength: 16 * 1024 * 1024,
                    idleTimeout: 16,
                    open: object.open,
                    message: object.message,
                    drain: object.drain,
                    close: object.close
                });
            });
        }
        else {
            console.log("No ws endpoints found");
        }
    }
    loadWSEndpoints();
    function renderServer(res, path) {
        return __awaiter(this, void 0, void 0, function () {
            var componentPath, component, defaultComponent_1, _a, Element_1, html, clientBundle, finalHtml, e_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        res.onAborted(function () {
                            res.aborted = true;
                        });
                        generateClientBundle;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, , 7]);
                        componentPath = join(process.cwd(), ".ssr", "output", "server", "pages", path + ".js");
                        component = _require(componentPath);
                        if (!(component.default.constructor.name === 'AsyncFunction')) return [3 /*break*/, 3];
                        return [4 /*yield*/, component.default()];
                    case 2:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = component.default();
                        _b.label = 4;
                    case 4:
                        defaultComponent_1 = _a;
                        Element_1 = createElement(function () { return defaultComponent_1; }, null);
                        res.writeHeader("Content-Type", "text/html");
                        html = preactRender(Element_1);
                        return [4 /*yield*/, generateClientBundle({ filePath: componentPath, data: null })];
                    case 5:
                        clientBundle = _b.sent();
                        finalHtml = html.replace("</body>", "<script>".concat(clientBundle, "</script></body>"));
                        return [2 /*return*/, res.end(finalHtml)];
                    case 6:
                        e_3 = _b.sent();
                        console.error(e_3);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    }
    Object.keys(buildReport)
        .sort(function (a, b) {
        if (a === "/index")
            return -1;
        if (b === "/index")
            return 1;
        if (a.includes("/:") && !b.includes("/:"))
            return 1;
        if (!a.includes("/:") && b.includes("/:"))
            return -1;
        return 0;
    })
        .forEach(function (pageServerName) {
        var filePath = join(process.cwd(), ".ssr", "output", "static", "".concat(pageServerName, ".html"));
        var pageName = pageServerName.replace("/index", "/");
        var isPage = existsSync(filePath);
        var isServer = buildReport[pageServerName] === 'server';
        var isApi = buildReport[pageServerName] === 'api';
        isStatic.set(pageServerName, isPage);
        if (isServer) {
            app.any(pageName, function (res) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, renderServer(res, pageServerName)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); });
        }
        else if (isApi || !isPage) {
            app.any(pageName, function (res, req) {
                var path = req.getUrl();
                if (path.endsWith(".css") || path.endsWith(".js") || path.endsWith(".map") || path.endsWith(".html")) {
                    return render(res, req);
                }
                else {
                    return renderAPI(res, req, pageServerName);
                }
            });
        }
        else if (isPage) {
            app.get(pageName, function (res, req) {
                var path = req.getUrl();
                if (path.endsWith(".bundle.js") || path.endsWith(".data.css")) {
                    return render(res, req);
                }
                else {
                    var stream = createReadStream(filePath);
                    var size = stream.bytesRead;
                    return pipeStreamOverResponse(res, stream, size);
                }
            });
        }
        else {
            app.any(pageName, function (res, req) { return __awaiter(_this, void 0, void 0, function () {
                var path, exts;
                return __generator(this, function (_a) {
                    path = req.getUrl();
                    exts = path.split(".");
                    if (exts.length > 1) {
                        return [2 /*return*/, renderStatic(res, exts, path)];
                    }
                    else {
                        return [2 /*return*/, render(res, req, pageServerName)];
                    }
                    return [2 /*return*/];
                });
            }); });
        }
        app.get("".concat(pageServerName, ".bundle.js"), function (res, req) {
            var path = req.getUrl();
            var exts = path.split(".");
            return renderStatic(res, exts, path);
        });
        app.get("".concat(pageServerName, ".data.js"), function (res, req) {
            var path = req.getUrl();
            var pageName = path.split(".")[0];
            if (buildReport[pageName]) {
                return renderData(res, pageName);
            }
            else {
                return render404(res);
            }
        });
    });
    app.any("/*", function (res, req) { return __awaiter(_this, void 0, void 0, function () {
        var path, exts;
        return __generator(this, function (_a) {
            path = req.getUrl();
            exts = path.split(".");
            if (exts.length > 1) {
                return [2 /*return*/, renderStatic(res, exts, path)];
            }
            else {
                return [2 /*return*/, render(res, req, path.slice(0, -1))];
            }
            return [2 /*return*/];
        });
    }); });
    var timers = new Map();
    Object.entries(buildReport).forEach(function (_a) {
        var page = _a[0], hasData = _a[1];
        if (hasData || page.includes("/:")) {
            app.ws(page, {
                compression: uws.SHARED_COMPRESSOR,
                maxPayloadLength: 16 * 1024 * 1024,
                idleTimeout: 16,
                open: function (ws) {
                    if (hasData) {
                        var timer = setInterval(function () {
                            if (cachedChange.includes(page)) {
                                ws.send(JSON.stringify({ type: "change", payload: cachedData.get(page) }));
                                var index = cachedChange.indexOf(page);
                                cachedChange.splice(index, 1);
                            }
                        }, 10);
                        timers.set(page, timer);
                    }
                    if (page.includes("/:")) {
                        var params = page.split("/:")[1];
                        ws.send(JSON.stringify({ type: "script", payload: params }));
                    }
                },
                close: function (ws, code, message) {
                    if (hasData && timers.has(page)) {
                        clearInterval(timers.get(page));
                    }
                }
            });
        }
    });
    app.listen(3000, function (token) {
        if (token) {
            console.log("Listening to port 3000");
        }
        else {
            console.log("Failed to listen to port 3000");
        }
    });
}
