//import { createStaticFile } from './create-static'
import register from "@babel/register";
import jsx from "preact/jsx-runtime";
const reg = () => register({
    "presets": [
        ["@babel/preset-env", {
                "targets": {
                    "node": "current"
                }
            }]
    ],
    "plugins": [
        ["@babel/plugin-transform-react-jsx", {
                "pragma": "h",
                "pragmaFrag": "Fragment",
            }]
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
import { rmSync, existsSync } from "fs";
import { join } from "path";
import { getPageName, getPages } from '../utils/page';
import { generateFramework } from "./create-framework";
import { createStaticFile } from "./create-static";
import { generateServerScript } from "./create-server";
import { generateSSRPages } from "./create-ssr";
const buildReport = {};
function generateFrameworkJSBundle() {
    console.log("🕧 Building framework bundle");
    generateFramework();
}
async function buildClient() {
    try {
        const pages = getPages(join(process.cwd(), "src"), join);
        const ssrdir = join(".ssr");
        if (existsSync(ssrdir))
            rmSync(ssrdir, { recursive: true });
        const outdir = join(ssrdir, "output/static");
        const outWSdir = join(ssrdir, "output/server");
        // clear outdir
        await Promise.allSettled(pages
            .filter((page) => page.endsWith(".jsx") || page.endsWith(".js"))
            .map((page) => {
            reg();
            const pageName = getPageName(page);
            console.log({
                page
            });
            // @ts-ignore
            return import(page).then((Component) => {
                console.time("🕧 Building: " + pageName);
                if (page.endsWith(".jsx")) {
                    console.log(Component.default.toString());
                    const keys = Object.keys(Component);
                    buildReport['/' + pageName] = keys.includes("data");
                    if (keys.includes("data") && keys.includes("server")) {
                        throw new Error(`Page ${pageName} has both data and server. This is not supported.`);
                    }
                    if (keys.includes("server")) {
                        buildReport['/' + pageName] = "server";
                        console.timeEnd("🕧 Building: " + pageName);
                        console.log("SSR PAGE: ", page);
                        return generateSSRPages({ outdir: outWSdir, pageName, path: page });
                    }
                    console.timeEnd("🕧 Building: " + pageName);
                    console.log("Static PAGE: ", page);
                    return createStaticFile(Component, page, pageName, { outdir, bundle: true, data: keys.includes("data") });
                }
                else {
                    /**
                     * comp,
                     * outdir = ".ssr/output/data/",
                     * pageName,
     */
                    buildReport['/' + pageName] = true;
                    console.timeEnd("🕧 Building: " + pageName);
                    console.log("Server PAGE: ", page);
                    return generateServerScript({ comp: page, outdir: outWSdir, pageName });
                }
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
