import { join } from "path";
import { build } from "esbuild";

async function getScript(outdir: string, pageName: string, path: string) {
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
    })
}
export async function generateSSRPages({
    path,
    outdir = ".ssr/output/data/",
    pageName,
}: { path: string, outdir?: string; pageName: string; }) {
    try {
        return await getScript(outdir, pageName, path);
    } catch (e) {
        throw e;
    }
}