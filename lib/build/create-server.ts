import { join } from "path";
import { build } from "esbuild";
import { existsSync } from "fs";
import { watchOnDev } from "../utils/global";

export async function getProjectPkg() {
    const pkg = await import(join(process.cwd(), "package.json"));
    return pkg;
}

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
    const out = join(outdir, isWS ? "ws" : ".", `${pageName}.js`)
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
        allowOverwrite: false,
        external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
        ...watchOnDev,
    }).then((result) => {
        if (result.errors.length > 0) {
            console.error(result.errors)
        } else {
            console.log("✅ Generated server script for " + pageName);
        }
    }).catch(console.error)
}