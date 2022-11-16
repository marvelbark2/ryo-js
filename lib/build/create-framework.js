"use strict";
exports.__esModule = true;
exports.generateFramework = void 0;
var path_1 = require("path");
var esbuild_1 = require("esbuild");
// import compress from '@luncheon/esbuild-plugin-gzip';
function getScript() {
    var out = (0, path_1.join)(process.cwd(), ".ssr/output/static", "framework-system.js");
    (0, esbuild_1.build)({
        bundle: true,
        inject: [(0, path_1.join)(__dirname, "preact-shim-client.js")],
        entryPoints: [(0, path_1.join)(__dirname, "preact-tools.js")],
        outfile: out,
        splitting: false,
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        //inject: [join(process.cwd(), "lib/build/preact-shim.js")],
        plugins: [],
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
