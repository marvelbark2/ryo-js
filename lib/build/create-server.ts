import { join } from "path";
import { build } from "esbuild";
import { readFileSync } from "fs";

export async function generateServerScript({
    comp,
    outdir = ".ssr/output/data/",
    pageName,
    bundleConstants = {
        allowOverwrite: true,
        treeShaking: true,
        minify: true,
        loader: { ".ts": "ts", ".js": "js" },
    }
}: { comp: any; outdir?: string; pageName: string; bundleConstants?: any }) {
    const isWS = comp.endsWith(".ws.js");
    try {
        const out = join(outdir, isWS ? "ws" : ".", `${pageName}.js`)
        return await build({
            ...bundleConstants,
            stdin: {
                contents: readFileSync(comp).toString("utf-8"),
                resolveDir: join("."),
            },
            bundle: false,
            target: "node14",
            outfile: out,
        });
    } catch (e) {
        console.error(e);
    }
}