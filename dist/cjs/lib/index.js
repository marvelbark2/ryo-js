"use strict";
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
var uws = __importStar(require("uWebSockets.js"));
var render_1 = require("./runtime/render");
var path_1 = require("path");
var fs_1 = require("fs");
var pubsub_1 = __importDefault(require("./utils/pubsub"));
var register_1 = __importDefault(require("@babel/register"));
require("./polyfills/index");
var page_1 = require("./utils/page");
var serializer_1 = require("./utils/serializer");
var uwsToken;
var requireCaches = new Set();
var shouldRestart = [];
// TODO: Convert renders to abstracted classes
function server(env) {
    var _this = this;
    if (env === void 0) { env = "production"; }
    (0, register_1.default)({
        presets: ["preact", "@babel/preset-env"],
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        cache: true,
        compact: true,
    });
    var _require = require;
    var pwd = process.cwd();
    shouldRestart.push("N");
    var app = uws.App();
    var buildReport = _require((0, path_1.join)(pwd, ".ssr", "build-report.json"));
    var isStatic = new Map();
    var getRenderProps = function (res, req, path) {
        if (path === void 0) { path = ""; }
        return {
            req: req,
            res: res,
            buildReport: buildReport,
            pathname: path || req.getUrl(),
            isDev: process.env.NODE_ENV === "development",
        };
    };
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
        var filePath = (0, path_1.join)(pwd, ".ssr", "output", "static", "".concat(pageServerName, ".html"));
        var page = pageServerName.replace("/index", "/");
        var isPage = (0, fs_1.existsSync)(filePath);
        var isServer = buildReport[pageServerName] === 'server';
        var isApi = buildReport[pageServerName] === 'api';
        var isEvent = buildReport[pageServerName] === 'event';
        isStatic.set(pageServerName, isPage);
        var pageRouters = new Set([page, (page + "/").replace("//", "/")]);
        var bundleAdded = false;
        pageRouters.forEach(function (pageName) {
            if (isServer) {
                app.any(pageName, function (res, req) {
                    return new render_1.RenderServer(getRenderProps(res, req, pageServerName));
                });
            }
            else if (isEvent) {
                app.get(pageName, function (res, req) {
                    return new render_1.RenderEvent(getRenderProps(res, req, pageServerName));
                });
            }
            else if (isApi || !isPage) {
                app.any(pageName, function (res, req) {
                    return new render_1.RenderAPI(getRenderProps(res, req, pageServerName));
                });
            }
            else if (isPage) {
                app.get(pageName, function (res, req) {
                    var path = req.getUrl();
                    if (!(path.endsWith(".bundle.js") || path.endsWith(".data.js"))) {
                        var streamable = new render_1.Streamable(getRenderProps(res, req, pageServerName));
                        var stream = (0, fs_1.createReadStream)(filePath);
                        var size = (0, fs_1.statSync)(filePath).size;
                        return streamable.pipeStreamOverResponse(res, stream, size);
                    }
                    else {
                        return new render_1.RenderStatic(getRenderProps(res, req, pageServerName));
                    }
                });
                if (!bundleAdded) {
                    app.get("".concat(pageServerName, ".bundle.js"), function (res, req) {
                        if (env === "production") {
                            //  cachingBundles(res);
                        }
                        return new render_1.RenderStatic(getRenderProps(res, req, pageServerName));
                    });
                    app.get("".concat(pageServerName, ".data.js"), function (res, req) {
                        var path = req.getUrl();
                        var pageName = path.split(".")[0];
                        if (buildReport[pageName]) {
                            return new render_1.RenderData(getRenderProps(res, req, pageServerName));
                        }
                        else {
                            throw new Error("404");
                        }
                    });
                    bundleAdded = true;
                }
            }
            else {
                app.any(pageName, function (res, req) {
                    return new render_1.RenderStatic(getRenderProps(res, req, pageServerName));
                });
            }
        });
    });
    app.any("/*", function (res, req) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new render_1.RenderStatic(getRenderProps(res, req))];
        });
    }); });
    function loadWSEndpoints() {
        var _this = this;
        var wsPath = (0, path_1.join)(pwd, ".ssr", "output", "server", "ws");
        var isExist = (0, fs_1.existsSync)(wsPath);
        if (isExist) {
            var files = (0, page_1.getPages)(wsPath, path_1.join);
            files.forEach(function (file) { return __awaiter(_this, void 0, void 0, function () {
                var fileName, pageName, object;
                return __generator(this, function (_a) {
                    requireCaches.add(file);
                    fileName = file.split("/server/ws/");
                    pageName = fileName[1].split(".ws.js")[0];
                    object = _require(file).default;
                    if (object) {
                        app.ws("/".concat(pageName), {
                            compression: uws.SHARED_COMPRESSOR,
                            maxPayloadLength: 16 * 1024 * 1024,
                            idleTimeout: 16,
                            open: object.open,
                            message: object.message,
                            drain: object.drain,
                            close: object.close
                        });
                    }
                    else {
                        throw new Error("File: ".concat(pageName, " | ") + "You need to export a default object with open, message, drain, and close methods");
                    }
                    return [2 /*return*/];
                });
            }); });
        }
        else {
            console.log("No ws endpoints found");
        }
    }
    loadWSEndpoints();
    var subscriptions = new Map();
    Object.entries(buildReport).forEach(function (_a) {
        var page = _a[0], hasData = _a[1];
        if (hasData || page.includes("/:")) {
            app.ws("".concat(page, ".data"), {
                compression: uws.SHARED_COMPRESSOR,
                maxPayloadLength: 16 * 1024 * 1024,
                idleTimeout: 16,
                open: function (ws) {
                    if (hasData) {
                        var unsub = pubsub_1.default.subscribe(function (msg, data) {
                            if (msg === "fetch-".concat(page) && data) {
                                var serialize = new serializer_1.Serializer(data);
                                ws.send(JSON.stringify({ type: "change", payload: serialize.toJSON() }));
                            }
                        });
                        subscriptions.set(page, unsub);
                    }
                    if (page.includes("/:")) {
                        var params = page.split("/:")[1];
                        ws.send(JSON.stringify({ type: "script", payload: params }));
                    }
                },
                close: function (ws, code, message) {
                    if (hasData && subscriptions.has(page)) {
                        var fn = subscriptions.get(page);
                        if (typeof fn === "function") {
                            fn();
                        }
                    }
                }
            });
        }
    });
    if (process.env.NODE_ENV === "development" || env === "dev") {
        app.get("/ryo_framework", function (res) {
            var eventStreamHandler = new render_1.EventStreamHandler(res);
            eventStreamHandler.handle(function (sendData) {
                return pubsub_1.default.subscribe(function (msg) {
                    if (msg === "refresh" && shouldRestart.length > 0) {
                        shouldRestart.pop();
                        return sendData({ restart: true });
                    }
                });
            }, function (unsub) {
                unsub();
            });
        });
    }
    app.listen(3000, function (token) {
        if (token) {
            uwsToken = token;
            console.log("Listening to port 3000");
        }
        else {
            console.log("Failed to listen to port 3000");
        }
    });
    return function () {
        if (uwsToken) {
            console.log('Shutting down now');
            uws.us_listen_socket_close(uwsToken);
            render_1.AbstractRender.ClearCache();
            uwsToken = null;
        }
    };
}
exports.default = server;
