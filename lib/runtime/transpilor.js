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
exports.__esModule = true;
exports.generateClientBundle = void 0;
var esbuild_1 = require("esbuild");
var path_1 = require("path");
var getHydrationScript = function (filePath, data) { return "\nimport Component from \"".concat(filePath, "\";\nimport {hydrate, createElement} from \"preact\"\n  hydrate(createElement(Component), document.getElementById(\"root\"))\n"); };
function generateClientBundle(_a) {
    var data = _a.data, filePath = _a.filePath, _b = _a.bundleConstants, bundleConstants = _b === void 0 ? {
        bundle: true,
        allowOverwrite: false,
        treeShaking: true,
        minify: true,
        inject: [filePath],
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        loader: { ".ts": "ts", ".tsx": "tsx", ".js": "jsx", ".jsx": "jsx" },
        jsx: "automatic",
        legalComments: "none",
        outdir: 'out',
        write: false
    } : _b;
    try {
        return (0, esbuild_1.build)(__assign(__assign({}, bundleConstants), { stdin: {
                contents: getHydrationScript(filePath, data),
                resolveDir: (0, path_1.join)(".")
            }, target: "esnext" }));
    }
    catch (e) {
        console.error({ e: e });
    }
}
exports.generateClientBundle = generateClientBundle;
