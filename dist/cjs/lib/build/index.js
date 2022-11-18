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
//import { createStaticFile } from './create-static'
var register_1 = __importDefault(require("@babel/register"));
var reg = function () { return (0, register_1.default)({
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    presets: ["@babel/preset-env", "preact"],
}); };
var preact_1 = require("preact");
Object.defineProperty(global, 'h', preact_1.h);
Object.defineProperty(global, 'Fragment', preact_1.Fragment);
var fs_1 = require("fs");
var path_1 = require("path");
var page_1 = require("../utils/page");
var create_framework_1 = require("./create-framework");
var create_static_1 = require("./create-static");
var create_server_1 = require("./create-server");
var create_ssr_1 = require("./create-ssr");
var esbuild_1 = require("esbuild");
var module_from_string_1 = require("module-from-string");
var buildReport = {};
function generateFrameworkJSBundle() {
    console.log("🕧 Building framework bundle");
    (0, create_framework_1.generateFramework)();
}
var isEndsWith = function (collection, name) {
    return collection.some(function (item) { return name.endsWith(item); });
};
var buildComponent = function (Component, page, pageName, outdir, outWSdir) { return __awaiter(void 0, void 0, void 0, function () {
    var keys;
    return __generator(this, function (_a) {
        keys = Object.keys(Component);
        if (isEndsWith([".tsx", ".jsx"], page)) {
            buildReport['/' + pageName] = keys.includes("data");
            if (keys.includes("data") && keys.includes("server")) {
                throw new Error("Page ".concat(pageName, " has both data and server. This is not supported."));
            }
            if (keys.includes("server")) {
                buildReport['/' + pageName] = "server";
                console.timeEnd("🕧 Building: " + pageName);
                return [2 /*return*/, (0, create_ssr_1.generateSSRPages)({ outdir: outWSdir, pageName: pageName, path: page })];
            }
            console.timeEnd("🕧 Building: " + pageName);
            return [2 /*return*/, (0, create_static_1.createStaticFile)(Component, page, pageName, { outdir: outdir, bundle: true, data: keys.includes("data") })];
        }
        else {
            if (keys.includes("get") || keys.includes("post") || keys.includes("put") || keys.includes("delete")) {
                buildReport['/' + pageName] = "api";
            }
            else {
                buildReport['/' + pageName] = true;
            }
            console.timeEnd("🕧 Building: " + pageName);
            return [2 /*return*/, (0, create_server_1.generateServerScript)({ comp: page, outdir: outWSdir, pageName: pageName })];
        }
        return [2 /*return*/];
    });
}); };
var tsxTransformOptions = {
    loader: 'tsx',
    target: 'es2015',
    format: 'cjs',
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    jsxImportSource: 'preact',
    minify: true,
    jsx: 'automatic'
};
function buildClient() {
    return __awaiter(this, void 0, void 0, function () {
        var pages, ssrdir, outdir_1, outWSdir_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    pages = (0, page_1.getPages)((0, path_1.join)(process.cwd(), "src"), path_1.join);
                    ssrdir = (0, path_1.join)(".ssr");
                    if ((0, fs_1.existsSync)(ssrdir))
                        (0, fs_1.rmSync)(ssrdir, { recursive: true });
                    outdir_1 = (0, path_1.join)(ssrdir, "output/static");
                    outWSdir_1 = (0, path_1.join)(ssrdir, "output/server");
                    reg();
                    // clear outdir
                    return [4 /*yield*/, Promise.allSettled(pages
                            .filter(function (page) { return isEndsWith([".js", ".jsx", ".ts", ".tsx"], page); })
                            .map(function (page) {
                            var _a;
                            var pageName = (0, page_1.getPageName)(page);
                            console.time("🕧 Building: " + pageName);
                            if (page.endsWith(".ts")) {
                                buildReport['/' + pageName] = true;
                                console.timeEnd("🕧 Building: " + pageName);
                                return (0, create_server_1.generateServerScript)({ comp: page, outdir: outWSdir_1, pageName: pageName });
                            }
                            else if (page.endsWith(".tsx")) {
                                // @ts-ignore
                                return (0, esbuild_1.transform)((0, fs_1.readFileSync)(page).toString(), tsxTransformOptions).then(function (result) {
                                    var code = result.code;
                                    // @ts-ignore
                                    var Component = (0, module_from_string_1.importFromStringSync)(code, __assign(__assign({}, tsxTransformOptions), { filename: page }));
                                    return buildComponent(Component, page, pageName, outdir_1, outWSdir_1);
                                }).catch(function (e) { return console.error(e); });
                            }
                            // @ts-ignore
                            return (_a = page, Promise.resolve().then(function () { return __importStar(require(_a)); })).then(function (Component) {
                                return buildComponent(Component, page, pageName, outdir_1, outWSdir_1);
                            }).catch(function (err) { return console.error(err); });
                        }))];
                case 1:
                    // clear outdir
                    _a.sent();
                    generateFrameworkJSBundle();
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error(error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function copyPublicFiles() {
    var publicDir = (0, path_1.join)(process.cwd(), "public");
    var outdir = (0, path_1.join)(".ssr", "output/static");
    if ((0, fs_1.existsSync)(publicDir)) {
        var files = (0, page_1.getPages)(publicDir, path_1.join);
        files.forEach(function (file) {
            var fileName = file.split(publicDir)[1];
            (0, fs_1.createReadStream)(file).pipe((0, fs_1.createWriteStream)((0, path_1.join)(outdir, fileName)));
        });
    }
}
function build() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, buildClient()];
                case 1:
                    _a.sent();
                    copyPublicFiles();
                    return [2 /*return*/, buildReport];
            }
        });
    });
}
exports.default = build;
