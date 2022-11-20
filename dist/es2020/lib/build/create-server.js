import { join } from "path";
import { build } from "esbuild";
import { existsSync } from "fs";
import { watchOnDev, getProjectPkg } from "../utils/global";
export async function generateServerScript({ comp, outdir = ".ssr/output/data/", pageName, bundleConstants = {
    treeShaking: true,
    minify: true,
    loader: { ".ts": "ts", ".js": "js" },
} }) {
    const isWS = comp.endsWith(".ws.js") || comp.endsWith(".ws.ts");
    const out = join(outdir, isWS ? "ws" : ".", `${pageName}.js`);
    const tsConfig = join(process.cwd(), "tsconfig.json");
    const pkg = await getProjectPkg();
    return build({
        ...bundleConstants,
        entryPoints: [comp],
        bundle: true,
        target: "node14",
        format: "esm",
        platform: "node",
        outfile: out,
        tsconfig: existsSync(tsConfig) ? tsConfig : undefined,
        allowOverwrite: true,
        external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
        ...watchOnDev,
    }).then((result) => {
        if (result.errors.length > 0) {
            console.error(result.errors);
        }
        else {
            console.log("✅ Generated server script for " + pageName);
        }
    }).catch(console.error);
}
