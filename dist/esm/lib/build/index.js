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
//import { createStaticFile } from './create-static'
import register from "@babel/register";
import jsx from "preact/jsx-runtime";
var reg = function () { return register({
    "presets": [
        ["@babel/preset-env", {
                targets: {
                    node: "current",
                },
            }], "preact"
    ],
}); };
import { h, Fragment } from "preact";
// @ts-ignore
global['react/jsx-runtime'] = jsx;
// @ts-ignore
global.register = reg;
// @ts-ignore
global.h = h;
// @ts-ignore
global.Fragment = Fragment;
import { rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { getPageName, getPages } from '../utils/page';
import { generateFramework } from "./create-framework";
import { createStaticFile } from "./create-static";
import { generateServerScript } from "./create-server";
import { generateSSRPages } from "./create-ssr";
import { transform } from "esbuild";
var buildReport = {};
function generateFrameworkJSBundle() {
    console.log("🕧 Building framework bundle");
    generateFramework();
}
var isEndsWith = function (collection, name) {
    return collection.some(function (item) { return name.endsWith(item); });
};
var buildComponent = function (Component, page, pageName, outdir, outWSdir) { return __awaiter(void 0, void 0, void 0, function () {
    var keys;
    return __generator(this, function (_a) {
        if (isEndsWith([".tsx", ".jsx"], page)) {
            keys = Object.keys(Component);
            buildReport['/' + pageName] = keys.includes("data");
            if (keys.includes("data") && keys.includes("server")) {
                throw new Error("Page ".concat(pageName, " has both data and server. This is not supported."));
            }
            if (keys.includes("server")) {
                buildReport['/' + pageName] = "server";
                console.timeEnd("🕧 Building: " + pageName);
                return [2 /*return*/, generateSSRPages({ outdir: outWSdir, pageName: pageName, path: page })];
            }
            console.timeEnd("🕧 Building: " + pageName);
            return [2 /*return*/, createStaticFile(Component, page, pageName, { outdir: outdir, bundle: true, data: keys.includes("data") })];
        }
        else {
            buildReport['/' + pageName] = true;
            console.timeEnd("🕧 Building: " + pageName);
            return [2 /*return*/, generateServerScript({ comp: page, outdir: outWSdir, pageName: pageName })];
        }
        return [2 /*return*/];
    });
}); };
function requireFromString(src, filename) {
    var Module = module.constructor;
    //@ts-ignore
    var m = new Module();
    m._compile(src, filename);
    return m.exports;
}
function buildClient() {
    return __awaiter(this, void 0, void 0, function () {
        var pages, ssrdir, outdir_1, outWSdir_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    pages = getPages(join(process.cwd(), "src"), join);
                    ssrdir = join(".ssr");
                    if (existsSync(ssrdir))
                        rmSync(ssrdir, { recursive: true });
                    outdir_1 = join(ssrdir, "output/static");
                    outWSdir_1 = join(ssrdir, "output/server");
                    reg();
                    // clear outdir
                    return [4 /*yield*/, Promise.allSettled(pages
                            .filter(function (page) { return isEndsWith([".js", ".jsx", ".ts", ".tsx"], page); })
                            .map(function (page) {
                            var pageName = getPageName(page);
                            console.time("🕧 Building: " + pageName);
                            if (page.endsWith(".ts")) {
                                buildReport['/' + pageName] = true;
                                console.timeEnd("🕧 Building: " + pageName);
                                return generateServerScript({ comp: page, outdir: outWSdir_1, pageName: pageName });
                            }
                            else if (page.endsWith(".tsx")) {
                                return transform(readFileSync(page).toString(), {
                                    loader: 'tsx',
                                    target: 'es2015',
                                    format: 'cjs',
                                    jsxFactory: 'h',
                                    jsxFragment: 'Fragment',
                                    jsxImportSource: 'preact',
                                    minify: true,
                                }).then(function (result) {
                                    var code = result.code;
                                    var Component = requireFromString(code, page);
                                    console.log(Component);
                                    return buildComponent(Component, page, pageName, outdir_1, outWSdir_1);
                                });
                            }
                            // @ts-ignore
                            return import(page).then(function (Component) {
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
export default function build() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, buildClient()];
                case 1:
                    _a.sent();
                    return [2 /*return*/, buildReport];
            }
        });
    });
}
