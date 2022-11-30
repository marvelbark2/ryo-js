import { join } from "path";
import { build } from "esbuild";

async function getScript(outdir: string, pageName: string, path: string, tsConfig?: string) {
    const outFunc = join(outdir, "pages")

    return await build({
        bundle: false,
        entryPoints: {
            [`${pageName}`]: path
        },
        outdir: outFunc,
        format: "esm",
        splitting: true,
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        tsconfig: tsConfig,
    })
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