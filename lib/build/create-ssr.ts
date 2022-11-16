import { join } from "path";
import { buildSync } from "esbuild";

function getScript(outdir: string, pageName: string, path: string) {
    const outFunc = join(outdir, "pages", `${pageName}.js`)


    buildSync({
        bundle: false,
        entryPoints: [path],
        target: "node15",
        outfile: outFunc,
        //format: "esm",
        //splitting: false,
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        allowOverwrite: false,
        inject: [join(process.cwd(), "lib/build/preact-shim.js")],
    })


    return Promise.resolve("test");
}
export async function generateSSRPages({
    path,
    outdir = ".ssr/output/data/",
    pageName,
}: { path: string, outdir?: string; pageName: string; }) {
    try {
        return await getScript(outdir, pageName, path);
    } catch (e) {
        console.error(e);
    }
}