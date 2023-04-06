import { join } from "path";
import { build } from "esbuild";
import { getProjectPkg } from "../utils/global";


export async function generateServerScript({
    comp,
    outdir = ".ssr/output/data/",
    pageName,
    tsConfig,
    bundleConstants = {
        treeShaking: true,
        minify: true,
        loader: { ".ts": "ts", ".js": "js" },
    }
}: { comp: any; outdir?: string; pageName: string; bundleConstants?: any, tsConfig?: string }) {
    const isWS = comp.endsWith(".ws.js") || comp.endsWith(".ws.ts");
    const out = join(outdir, isWS ? "ws" : ".", `${pageName}.js`)

    const pkg = await getProjectPkg();
    return build({
        ...bundleConstants,
        entryPoints: [comp],
        bundle: true,
        target: "node14",
        format: "esm",
        platform: "node",
        outfile: out,
        tsconfig: tsConfig,
        allowOverwrite: true,
        external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
    }).then((result) => {
        if (result.errors.length > 0) {
            console.error(result.errors)
        } else {
            console.log(`✅ Generated server script for ${pageName}`);
        }
    }).catch(console.error)
}