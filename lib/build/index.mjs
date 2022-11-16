

//import { createStaticFile } from './create-static'
import register from "@babel/register";


register({
    "presets": [
        "preact"
    ],
    "plugins": [
    ]
})
import { h, Fragment } from "preact";

global.h = h;
global.Fragment = Fragment;



import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

import pkg from '../utils/page.js';
const { getPageName, getPages } = pkg;

import { writeFileSync, rmSync, existsSync } from "fs";




const buildReport = {};


function generateFrameworkJSBundle() {
    const { generateFramework } = _require("./create-framework.js");
    console.log("🕧 Building framework bundle");
    generateFramework();
}

async function buildClient() {
    try {
        const { join } = await import("path");
        const pages = getPages(join(process.cwd(), "src"), join);
        const ssrdir = join(".ssr");

        if (existsSync(ssrdir))
            rmSync(ssrdir, { recursive: true });

        const outdir = join(ssrdir, "output/static");
        const outWSdir = join(ssrdir, "output/server");
        const { createStaticFile } = _require("./create-static.jsx");
        const { generateServerScript } = _require("./create-server.js");
        const { generateSSRPages } = _require("./create-ssr.js");

        // clear outdir
        await Promise.allSettled(
            pages
                .filter((page) => page.endsWith(".jsx") || page.endsWith(".js"))
                .map((page) => {
                    const pageName = getPageName(page);
                    console.time("🕧 Building: " + pageName);
                    if (page.endsWith(".jsx")) {
                        const Component = _require(page);
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
                        /**
                         * comp,
                         * outdir = ".ssr/output/data/",
                         * pageName,
         */
                        buildReport['/' + pageName] = true;
                        console.timeEnd("🕧 Building: " + pageName);
                        return generateServerScript({ comp: page, outdir: outWSdir, pageName });
                    }
                })
        )

        publishReport()
        generateFrameworkJSBundle();

    } catch (error) {
        console.error(error);


    }
}

function publishReport() {
    const data = JSON.stringify(buildReport, null, 2);
    const { join } = _require("path");
    console.log("🕧 Building pages report");
    writeFileSync(join(process.cwd(), ".ssr/output/build-report.json"), data, { flag: 'wx' });
}

buildClient()
    .catch(e => console.error(e))
    .finally(() => console.log("✅ Done building"));