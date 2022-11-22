import { join } from "path";
import { build } from "esbuild";
import compress from '@luncheon/esbuild-plugin-gzip';

function getScript() {
    const out = join(process.cwd(), ".ssr/output/static", `framework-system.js`);
    const entryPoints = [join(__dirname, "ryo-tools.js")];

    if (process.env.NODE_ENV === 'development') {
        entryPoints.push(join(__dirname, "ryo-tools-dev.js"));
    };

    build({
        bundle: true,
        entryPoints: entryPoints,
        outfile: out,
        splitting: false,
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        plugins: [compress({ gzip: true })],
        write: false,
        target: "esnext",
        format: 'iife',
        globalName: 'framework'
    })
}
export function generateFramework() {
    try {
        return getScript();
    } catch (e) {
        console.error(e);
    }
}