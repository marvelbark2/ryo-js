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
exports.__esModule = true;
exports.generateClientBundle = void 0;
var path_1 = require("path");
var esbuild_1 = require("esbuild");
var fetchParams = function (pageName) {
    if (pageName.includes(':')) {
        return "window.fetchParams = () => {\n            const pageName = '".concat(pageName, "'.split('/')\n            const currentPage = window.location.pathname.split('/');\n            const params = {};\n            const searchParams = new URLSearchParams(window.location.search);\n            for(let [key, value] of searchParams.entries()) {\n                params[key] = value;\n            }\n            for(let i = 0; i < pageName.length; i++) {\n                if(pageName[i].includes(':')) {\n                    params[pageName[i].replace(':', '')] = currentPage[i + 1]\n                }\n            }\n            return params;\n          }");
    }
    else
        return "\n    window.fetchParams = () => {\n        const currentPage = window.location.pathname;\n        const searchParams = new URLSearchParams(window.location.search);\n        const params = {};\n        for(let [key, value] of searchParams.entries()) {\n            params[key] = value;\n        }\n        return params;\n      }";
};
var getHydrationScript = function (filePath, pageName) { return "\n  import Component from \"".concat(filePath, "\";\n  import {hydrate, createElement} from \"preact\"\n  if(window.getData) {\n    hydrate(createElement(Component, {data: JSON.parse(window.getData())}), document.getElementById(\"root\"))\n\n    const ws = new WebSocket('ws://'+ window.location.host + '/").concat(pageName, "')\n  \n    ws.onopen = () => {\n      ws.onmessage = (e) => {\n          const data = JSON.parse(e.data)\n          if(data.type === 'change') {\n              hydrate(createElement(Component, {data: data.payload}), document.getElementById(\"root\"))\n          }\n      }\n    }\n  } else {\n    hydrate(createElement(Component), document.getElementById(\"root\"))\n  }\n\n  ").concat(fetchParams(pageName), "\n"); };
function generateClientBundle(_a) {
    var filePath = _a.filePath, _b = _a.outdir, outdir = _b === void 0 ? ".ssr/output/static/" : _b, pageName = _a.pageName, _c = _a.bundleConstants, bundleConstants = _c === void 0 ? {
        bundle: true,
        allowOverwrite: true,
        treeShaking: true,
        minify: true,
        //inject: [`lib/build/preact-shim.js`],
        loader: { ".ts": "ts", ".tsx": "tsx", ".js": "jsx", ".jsx": "jsx" },
        jsx: "automatic",
        legalComments: "none",
        write: false
    } : _c;
    return __awaiter(this, void 0, void 0, function () {
        var resolved, e_1;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 2, , 3]);
                    resolved = __dirname.split("preact-ssr")[0] + "preact-ssr";
                    console.log({ resolved: resolved });
                    return [4 /*yield*/, (0, esbuild_1.build)(__assign(__assign({}, bundleConstants), { stdin: {
                                contents: getHydrationScript(filePath, pageName),
                                resolveDir: resolved
                            }, plugins: [], target: "es2020", outfile: (0, path_1.join)(outdir, "".concat(pageName, ".bundle.js")) }))];
                case 1: return [2 /*return*/, _d.sent()];
                case 2:
                    e_1 = _d.sent();
                    console.error({ e: e_1, filePath: filePath });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.generateClientBundle = generateClientBundle;
