

//import { createStaticFile } from './create-static'
import register from "@babel/register";

const reg = () => register({
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    presets: ["@babel/preset-env", "preact"],

})
import { h, Fragment } from "preact";

Object.defineProperty(global, 'h', h);
Object.defineProperty(global, 'Fragment', Fragment);

import { rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";


import { getPageName, getPages } from '../utils/page';


import { generateFramework } from "./create-framework";
import { createStaticFile } from "./create-static";
import { generateServerScript } from "./create-server";
import { generateSSRPages } from "./create-ssr";
import { transform } from "esbuild";
import { importFromStringSync } from "module-from-string";

const buildReport: any = {};


function generateFrameworkJSBundle() {
    console.log("🕧 Building framework bundle");
    generateFramework();
}

const isEndsWith = (collection: string[], name: string) => {
    return collection.some((item) => name.endsWith(item));
}


const buildComponent = async (Component: any, page: string, pageName: string, outdir: string, outWSdir: string) => {
    if (isEndsWith([".tsx", ".jsx"], page)) {
        const keys = Object.keys(Component)
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
    } else {
        buildReport['/' + pageName] = true;
        console.timeEnd("🕧 Building: " + pageName);
        return generateServerScript({ comp: page, outdir: outWSdir, pageName });
    }
}

const tsxTransformOptions = {
    loader: 'tsx',
    target: 'es2015',
    format: 'cjs',
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    jsxImportSource: 'preact',
    minify: true,
    jsx: 'automatic'
}
const hCode = "import { h } from 'preact';\n"
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
        await Promise.allSettled(
            pages
                .filter((page) => isEndsWith([".js", ".jsx", ".ts", ".tsx"], page))
                .map((page) => {
                    const pageName = getPageName(page);
                    console.time("🕧 Building: " + pageName);
                    if (page.endsWith(".ts")) {
                        buildReport['/' + pageName] = true;
                        console.timeEnd("🕧 Building: " + pageName);
                        return generateServerScript({ comp: page, outdir: outWSdir, pageName });
                    } else if (page.endsWith(".tsx")) {
                        // @ts-ignore
                        return transform(readFileSync(page).toString(), tsxTransformOptions).then((result) => {
                            const code = result.code;
                            // @ts-ignore
                            const Component = importFromStringSync(code, {
                                ...tsxTransformOptions,
                                filename: page
                            });
                            return buildComponent(Component, page, pageName, outdir, outWSdir);
                        }).catch(e => console.error(e));
                    }
                    // @ts-ignore
                    return import(page).then((Component) => {
                        return buildComponent(Component, page, pageName, outdir, outWSdir);
                    }).catch((err) => console.error(err));

                })
        )

        generateFrameworkJSBundle();

    } catch (error) {
        console.error(error);


    }
}


export default async function build() {
    await buildClient();
    return buildReport;
}