"use strict";
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
exports.generateClientBundle = void 0;
var path_1 = require("path");
var esbuild_1 = require("esbuild");
var esbuild_plugin_gzip_1 = __importDefault(require("@luncheon/esbuild-plugin-gzip"));
var global_1 = require("../utils/global");
var fetchParams = function (pageName) {
    if (pageName.includes(':')) {
        return "window.fetchParams = () => {\n            const pageName = '".concat(pageName, "'.split('/')\n            const currentPage = window.location.pathname.split('/');\n            const params = {};\n            const searchParams = new URLSearchParams(window.location.search);\n            for(let [key, value] of searchParams.entries()) {\n                params[key] = value;\n            }\n            for(let i = 0; i < pageName.length; i++) {\n                if(pageName[i].includes(':')) {\n                    params[pageName[i].replace(':', '')] = currentPage[i + 1]\n                }\n            }\n            return params;\n          }");
    }
    else
        return "\n    window.fetchParams = () => {\n        const currentPage = window.location.pathname;\n        const searchParams = new URLSearchParams(window.location.search);\n        const params = {};\n        for(let [key, value] of searchParams.entries()) {\n            params[key] = value;\n        }\n        return params;\n      }";
};
var getWSDataReload = function (data, pageName) {
    if (data && data.invalidate)
        return "\n        const ws = new WebSocket('ws://'+ window.location.host + '/".concat(pageName, ".data')\n        ws.onopen = () => {\n        ws.onmessage = (e) => {\n            const data = JSON.parse(e.data)\n            if(data.type === 'change') {\n                const deserializedData = new window.framework.DESERIALIZE(data.payload);\n                const newElement = h(Component, {data: deserializedData.fromJSON()})\n                hydrate(newElement, document.getElementById(\"").concat(pageName, "\"))\n            }\n        }\n        }");
};
var getHydrationScript = function (filePath, pageName, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, "\n    ".concat(process.env.NODE_ENV === "development" ? 'import "preact/debug";' : "", "\n  import {hydrate, h, render} from \"preact\"\n  import * as Module from \"").concat(filePath, "\";\n\n  const Component = Module.default || Module;\n  const Parent =  Module.Parent;\n\n  document.getElementById(\"").concat(pageName, "\").innerHTML = \"\";\n\n  if(window.getData) {\n    const data = window.getData();\n    const deserializedData = new window.framework.DESERIALIZE(data);\n    const Element = h( Component, { data: deserializedData.fromJSON() } );\n    const W = h(\"span\", {id: \"").concat(pageName, "\"}, Element);\n    if(Parent) {\n        const ParentElement = h(Parent, {}, W);\n        render(ParentElement, document.getElementById(\"root\"))\n    } else {\n        render(Element, document.getElementById(\"").concat(pageName, "\"))\n    }\n    ").concat(getWSDataReload(data, pageName), "\n  } else {\n    if(Parent) {\n        const Element = h(Component)\n        const ParentElement = h(Parent, {id: '").concat(pageName, "'}, Element);\n        hydrate(ParentElement, document.getElementById(\"root\"))\n    } else {\n        const Element = h(Component);\n        hydrate(Element, document.getElementById(\"").concat(pageName, "\"));\n    }\n   \n  }\n\n  ").concat(fetchParams(pageName), "\n")];
    });
}); };
function generateClientBundle(_a) {
    var filePath = _a.filePath, _b = _a.outdir, outdir = _b === void 0 ? ".ssr/output/static/" : _b, pageName = _a.pageName, data = _a.data, _c = _a.bundleConstants, bundleConstants = _c === void 0 ? {
        bundle: true,
        allowOverwrite: true,
        treeShaking: true,
        minify: true,
        loader: { ".ts": "ts", ".tsx": "tsx", ".js": "js", ".jsx": "jsx" },
        jsx: "automatic",
        jsxFactory: "h",
        jsxFragment: "Fragment",
        legalComments: "none",
        platform: "browser",
        write: false,
    } : _c;
    return __awaiter(this, void 0, void 0, function () {
        var result, _d, _e, text, e_1;
        var _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    _h.trys.push([0, 5, , 6]);
                    _d = esbuild_1.build;
                    _e = [__assign({}, bundleConstants)];
                    _f = { jsxImportSource: "preact" };
                    _g = {};
                    return [4 /*yield*/, getHydrationScript(filePath, pageName, data)];
                case 1: return [4 /*yield*/, _d.apply(void 0, [__assign.apply(void 0, [__assign.apply(void 0, _e.concat([(_f.stdin = (_g.contents = _h.sent(),
                                    _g.resolveDir = process.cwd(),
                                    _g), _f.target = "es2020", _f.format = "esm", _f.plugins = [(0, esbuild_plugin_gzip_1.default)({ gzip: true })], _f.outfile = (0, path_1.join)(".ssr/output/static", "".concat(pageName, ".bundle.js")), _f.keepNames = true, _f.metafile = true, _f.tsconfig = (0, path_1.join)(process.cwd(), "tsconfig.json"), _f)])), global_1.watchOnDev])])];
                case 2:
                    result = _h.sent();
                    if (!result.metafile) return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, esbuild_1.analyzeMetafile)(result.metafile, {
                            verbose: true,
                        })];
                case 3:
                    text = _h.sent();
                    console.log(text);
                    _h.label = 4;
                case 4: return [2 /*return*/, result];
                case 5:
                    e_1 = _h.sent();
                    console.error({ e: e_1, filePath: filePath });
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.generateClientBundle = generateClientBundle;
