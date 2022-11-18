

//import { createStaticFile } from './create-static'
import register from "@babel/register";

const reg = () => register({
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    presets: ["@babel/preset-env", "preact"],

})
import { h, Fragment } from "preact";

Object.defineProperty(global, 'h', h);
Object.defineProperty(global, 'Fragment', Fragment);

import { rmSync, existsSync, readFileSync, createReadStream, createWriteStream } from "fs";
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
    const keys = Object.keys(Component)
    if (isEndsWith([".tsx", ".jsx"], page)) {
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
        if (keys.includes("get") || keys.includes("post") || keys.includes("put") || keys.includes("delete")) {
            buildReport['/' + pageName] = "api";
        } else if (isEndsWith([".ev.js", "ev.ts"], page)) {
            buildReport['/' + pageName] = "event";
        } else {
            buildReport['/' + pageName] = true;
        }
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
                .map((page: string) => {
                    if (isEndsWith([".ws.jsx", ".ev.jsx", ".ws.tsx", ".ev.tsx"], page)) {
                        throw new Error("You cannot create websockets or events as components. Please create them as scripts (.js or .ts).");
                    }
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

function copyPublicFiles() {
    const publicDir = join(process.cwd(), "public");
    const outdir = join(".ssr", "output/static");
    if (existsSync(publicDir)) {
        const files = getPages(publicDir, join);
        files.forEach((file) => {
            const fileName = file.split(publicDir)[1];
            createReadStream(file).pipe(createWriteStream(join(outdir, fileName)));
        })

    }
}


export default async function build() {
    await buildClient();
    copyPublicFiles();
    return buildReport;
}