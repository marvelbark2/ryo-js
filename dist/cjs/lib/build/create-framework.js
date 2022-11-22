"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFramework = void 0;
var path_1 = require("path");
var esbuild_1 = require("esbuild");
var esbuild_plugin_gzip_1 = __importDefault(require("@luncheon/esbuild-plugin-gzip"));
function getScript() {
    var out = (0, path_1.join)(process.cwd(), ".ssr/output/static", "framework-system.js");
    var entryPoints = [(0, path_1.join)(__dirname, "ryo-tools.js")];
    if (process.env.NODE_ENV === 'development') {
        entryPoints.push((0, path_1.join)(__dirname, "ryo-tools-dev.js"));
    }
    ;
    (0, esbuild_1.build)({
        bundle: true,
        entryPoints: entryPoints,
        outfile: out,
        splitting: false,
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        plugins: [(0, esbuild_plugin_gzip_1.default)({ gzip: true })],
        write: false,
        target: "esnext",
        format: 'iife',
        globalName: 'framework'
    });
}
function generateFramework() {
    try {
        return getScript();
    }
    catch (e) {
        console.error(e);
    }
}
exports.generateFramework = generateFramework;
