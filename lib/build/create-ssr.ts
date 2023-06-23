import { join } from "path";
import { build } from "esbuild";
import { getProjectPkg } from "../utils/global";


async function getScript(outdir: string, pageName: string, path: string, tsConfig?: string) {
    const outFunc = join(outdir, "pages",)
    const pkg = await getProjectPkg();
    return await build({
        entryPoints: {
            [pageName]: path
        },
        bundle: true,
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        jsx: "automatic",
        platform: "node",
        outdir: outFunc,
        //external: ["pg-native"],
        target: 'node14',
        tsconfig: tsConfig,
        format: "esm",
        external: [...(pkg.dependencies ? Object.keys(pkg.dependencies) : []), ...(pkg.devDependencies ? Object.keys(pkg.devDependencies) : [])],
    });


}
export async function generateSSRPages({
    path,
    outdir = ".ssr/output/data/",
    pageName,
    tsConfig
}: { path: string, outdir?: string; pageName: string; tsConfig?: string }) {
    try {
        return await getScript(outdir, pageName, path, tsConfig);
    } catch (e) {
        throw e;
    }
}