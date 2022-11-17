//import { createStaticFile } from './create-static'
import register from "@babel/register";
import jsx from "preact/jsx-runtime";
const reg = () => register({
    "presets": [
        ["@babel/preset-env", {
                targets: {
                    node: "current",
                },
            }], "preact"
    ],
});
import { h, Fragment } from "preact";
// @ts-ignore
global['react/jsx-runtime'] = jsx;
// @ts-ignore
global.register = reg;
// @ts-ignore
global.h = h;
// @ts-ignore
global.Fragment = Fragment;
import { rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { getPageName, getPages } from '../utils/page';
import { generateFramework } from "./create-framework";
import { createStaticFile } from "./create-static";
import { generateServerScript } from "./create-server";
import { generateSSRPages } from "./create-ssr";
import { transform } from "esbuild";
const buildReport = {};
function generateFrameworkJSBundle() {
    console.log("🕧 Building framework bundle");
    generateFramework();
}
const isEndsWith = (collection, name) => {
    return collection.some((item) => name.endsWith(item));
};
const buildComponent = async (Component, page, pageName, outdir, outWSdir) => {
    if (isEndsWith([".tsx", ".jsx"], page)) {
        const keys = Object.keys(Component);
        buildReport['/' + pageName] = keys.includes("data");
        if (keys.includes("data") && keys.includes("server")) {
            throw new Error(`Page ${pageName} has both data and server. This is not supported.`);
        }
        if (keys.includes("server")) {
            buildReport['/' + pageName] = "server";
            console.timeEnd("🕧 Building: " + pageName);
            return generateSSRPages({ outdir: outWSdir, pageName, path: page });
        }
        console.timeEnd("🕧 Building: " + pageName);
        return createStaticFile(Component, page, pageName, { outdir, bundle: true, data: keys.includes("data") });
    }
    else {
        buildReport['/' + pageName] = true;
        console.timeEnd("🕧 Building: " + pageName);
        return generateServerScript({ comp: page, outdir: outWSdir, pageName });
    }
};
function requireFromString(src, filename) {
    var Module = module.constructor;
    //@ts-ignore
    var m = new Module();
    m._compile(src, filename);
    return m.exports;
}
async function buildClient() {
    try {
        const pages = getPages(join(process.cwd(), "src"), join);
        const ssrdir = join(".ssr");
        if (existsSync(ssrdir))
            rmSync(ssrdir, { recursive: true });
        const outdir = join(ssrdir, "output/static");
        const outWSdir = join(ssrdir, "output/server");
        reg();
        // clear outdir
        await Promise.allSettled(pages
            .filter((page) => isEndsWith([".js", ".jsx", ".ts", ".tsx"], page))
            .map((page) => {
            const pageName = getPageName(page);
            console.time("🕧 Building: " + pageName);
            if (page.endsWith(".ts")) {
                buildReport['/' + pageName] = true;
                console.timeEnd("🕧 Building: " + pageName);
                return generateServerScript({ comp: page, outdir: outWSdir, pageName });
            }
            else if (page.endsWith(".tsx")) {
                return transform(readFileSync(page).toString(), {
                    loader: 'tsx',
                    target: 'es2015',
                    format: 'cjs',
                    jsxFactory: 'h',
                    jsxFragment: 'Fragment',
                    jsxImportSource: 'preact',
                    minify: true,
                }).then((result) => {
                    const code = result.code;
                    const Component = requireFromString(code, page);
                    console.log(Component);
                    return buildComponent(Component, page, pageName, outdir, outWSdir);
                });
            }
            // @ts-ignore
            return import(page).then((Component) => {
                return buildComponent(Component, page, pageName, outdir, outWSdir);
            }).catch((err) => console.error(err));
        }));
        generateFrameworkJSBundle();
    }
    catch (error) {
        console.error(error);
    }
}
export default async function build() {
    await buildClient();
    return buildReport;
}
