import { join } from "path";
import { build } from "esbuild";
import { existsSync } from "fs";
export async function generateServerScript({ comp, outdir = ".ssr/output/data/", pageName, bundleConstants = {
    treeShaking: false,
    minify: false,
    loader: { ".ts": "ts", ".js": "js" },
} }) {
    const isWS = comp.endsWith(".ws.js") || comp.endsWith(".ws.ts");
    try {
        const out = join(outdir, isWS ? "ws" : ".", `${pageName}.js`);
        const tsConfig = join(process.cwd(), "tsconfig.json");
        return await build({
            ...bundleConstants,
            entryPoints: [comp],
            bundle: true,
            target: "node14",
            format: "esm",
            outfile: out,
            tsconfig: existsSync(tsConfig) ? tsConfig : undefined,
            allowOverwrite: false
        });
    }
    catch (e) {
        console.error(e);
    }
}
