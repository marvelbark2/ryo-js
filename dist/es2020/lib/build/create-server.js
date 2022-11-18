import { join } from "path";
import { build } from "esbuild";
import { existsSync } from "fs";
let makeAllPackagesExternalPlugin = {
    name: 'make-all-packages-external',
    setup(build) {
        let filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/; // Must not start with "/" or "./" or "../"
        build.onResolve({ filter }, (args) => ({ path: args.path, external: true }));
    },
};
export async function generateServerScript({ comp, outdir = ".ssr/output/data/", pageName, bundleConstants = {
    treeShaking: true,
    minify: true,
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
            platform: "node",
            outfile: out,
            tsconfig: existsSync(tsConfig) ? tsConfig : undefined,
            allowOverwrite: false,
            plugins: [makeAllPackagesExternalPlugin]
        });
    }
    catch (e) {
        console.error(e);
    }
}
