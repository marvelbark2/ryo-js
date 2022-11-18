import { join } from "path";
import { build } from "esbuild";
import { existsSync } from "fs";

export async function generateServerScript({
    comp,
    outdir = ".ssr/output/data/",
    pageName,
    bundleConstants = {
        treeShaking: true,
        minify: true,
        loader: { ".ts": "ts", ".js": "js" },
    }
}: { comp: any; outdir?: string; pageName: string; bundleConstants?: any }) {
    const isWS = comp.endsWith(".ws.js") || comp.endsWith(".ws.ts");
    try {

        const out = join(outdir, isWS ? "ws" : ".", `${pageName}.js`)
        const tsConfig = join(process.cwd(), "tsconfig.json");
        return await build({
            ...bundleConstants,
            entryPoints: [comp],
            bundle: true,
            target: "node14",
            format: "esm",
            platform: "node",
            outfile: out,
            tsconfig: existsSync(tsConfig) ? tsConfig : undefined,
            allowOverwrite: false,
        });
    } catch (e) {
        console.error(e);
    }
}