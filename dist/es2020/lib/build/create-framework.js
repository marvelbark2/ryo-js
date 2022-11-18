import { join } from "path";
import { build } from "esbuild";
import compress from '@luncheon/esbuild-plugin-gzip';
function getScript() {
    const out = join(process.cwd(), ".ssr/output/static", `framework-system.js`);
    build({
        bundle: true,
        entryPoints: [join(__dirname, "preact-tools.js")],
        outfile: out,
        splitting: false,
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
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
