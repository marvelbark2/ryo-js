"use strict";
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
exports.__esModule = true;
exports.createStaticFile = void 0;
var path_1 = require("path");
var bundler_component_js_1 = require("./bundler-component.js");
var fs_1 = require("fs");
var preact_render_to_string_1 = require("preact-render-to-string");
var preact_1 = require("preact");
var esbuild_1 = require("esbuild");
function generateData(filePath, pageName) {
    return __awaiter(this, void 0, void 0, function () {
        var building;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, esbuild_1.build)({
                        bundle: true,
                        minify: true,
                        treeShaking: true,
                        entryPoints: [filePath],
                        target: "node15",
                        platform: 'node',
                        outfile: (0, path_1.join)(".ssr/output/server/data", "".concat(pageName, ".data.js"))
                    })];
                case 1:
                    building = _a.sent();
                    return [2 /*return*/, building];
            }
        });
    });
}
function createStaticFile(Component, filePath, pageName, options) {
    if (options === void 0) { options = { bundle: true, data: false, outdir: ".ssr/output/static", fileName: undefined }; }
    return __awaiter(this, void 0, void 0, function () {
        var outdir, App, data, Element_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    outdir = (options === null || options === void 0 ? void 0 : options.outdir) || (0, path_1.join)(".ssr/output/static");
                    if (!(options === null || options === void 0 ? void 0 : options.bundle)) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, bundler_component_js_1.generateClientBundle)({ filePath: filePath, outdir: outdir, pageName: pageName })];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 8, , 9]);
                    App = Component["default"] || Component;
                    data = null;
                    if (!((options === null || options === void 0 ? void 0 : options.data) && Component.data)) return [3 /*break*/, 7];
                    if (!(typeof Component.data === "function")) return [3 /*break*/, 3];
                    data = Component.data();
                    return [3 /*break*/, 5];
                case 3:
                    if (!Object.keys(Component.data).includes('runner')) return [3 /*break*/, 5];
                    return [4 /*yield*/, Component.data.runner()];
                case 4:
                    data = _a.sent();
                    _a.label = 5;
                case 5: return [4 /*yield*/, generateData(filePath, pageName)];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    Element_1 = (0, preact_1.createElement)(App, { data: data !== null && data !== void 0 ? data : null });
                    (0, fs_1.writeFileSync)((0, path_1.join)(outdir, (options === null || options === void 0 ? void 0 : options.fileName) || "".concat(pageName, ".html")), "<!DOCTYPE html>\n        <head>\n          <meta charset=\"UTF-8\">\n          <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n          <link rel=\"preload\" href=\"/styles.css\" as=\"style\" onload=\"this.onload=null;this.rel='stylesheet'\">\n          <noscript><link rel=\"stylesheet\" href=\"/styles.css\"></noscript>    \n          <script src=\"/framework-system.js\" defer></script>\n\n        </head>\n        <body>\n          <div id=\"root\">".concat((0, preact_render_to_string_1.render)(Element_1), "</div>\n          ").concat(Component.data ? "<script src=\"/".concat(pageName, ".data.js\" ></script>") : '', "\n          <script src=\"/").concat(pageName, ".bundle.js\" defer></script>\n          \n        </body>"));
                    return [3 /*break*/, 9];
                case 8:
                    error_1 = _a.sent();
                    console.error(error_1);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
exports.createStaticFile = createStaticFile;
