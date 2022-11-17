import { join } from "path";
import { build } from "esbuild";

export async function generateServerScript({
    comp,
    outdir = ".ssr/output/data/",
    pageName,
    bundleConstants = {
        treeShaking: false,
        minify: false,
        loader: { ".ts": "ts", ".js": "js" },
    }
}: { comp: any; outdir?: string; pageName: string; bundleConstants?: any }) {
    const isWS = comp.endsWith(".ws.js");
    try {
        const out = join(outdir, isWS ? "ws" : ".", `${pageName}.js`)
        const result = await build({
            ...bundleConstants,
            entryPoints: [comp],
            bundle: true,
            target: "node14",
            format: "esm",
            outfile: out,
            allowOverwrite: false
        });

        console.log({ result })

        return result;
    } catch (e) {
        console.error(e);
    }
}