import { join } from "path";
import { build } from "esbuild";
import compress from '@luncheon/esbuild-plugin-gzip';
function getScript() {
    var out = join(process.cwd(), ".ssr/output/static", "framework-system.js");
    build({
        bundle: true,
        inject: [join(__dirname, "preact-shim-client.js")],
        entryPoints: [join(__dirname, "preact-tools.js")],
        outfile: out,
        splitting: false,
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        //inject: [join(process.cwd(), "lib/build/preact-shim.js")],
        plugins: [compress({ gzip: true })],
        write: false,
        target: "esnext",
        format: 'iife',
        globalName: 'framework'
    });
}
export function generateFramework() {
    try {
        return getScript();
    }
    catch (e) {
        console.error(e);
    }
}
