var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
//import { createStaticFile } from './create-static'
import register from "@babel/register";
register({
    "presets": [
        "preact"
    ],
    "plugins": []
});
import { h, Fragment } from "preact";
// @ts-ignore
global.h = h;
// @ts-ignore
global.Fragment = Fragment;
import { writeFileSync, rmSync, existsSync } from "fs";
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
function buildClient() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const pages = getPages(join(process.cwd(), "src"), join);
            const ssrdir = join(".ssr");
            if (existsSync(ssrdir))
                rmSync(ssrdir, { recursive: true });
            const outdir = join(ssrdir, "output/static");
            const outWSdir = join(ssrdir, "output/server");
            // clear outdir
            yield Promise.allSettled(pages
                .filter((page) => page.endsWith(".jsx") || page.endsWith(".js"))
                .map((page) => __awaiter(this, void 0, void 0, function* () {
                const pageName = getPageName(page);
                console.time("🕧 Building: " + pageName);
                if (page.endsWith(".jsx")) {
                    const Component = yield import(page);
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
                    /**
                     * comp,
                     * outdir = ".ssr/output/data/",
                     * pageName,
     */
                    buildReport['/' + pageName] = true;
                    console.timeEnd("🕧 Building: " + pageName);
                    return generateServerScript({ comp: page, outdir: outWSdir, pageName });
                }
            })));
            publishReport();
            generateFrameworkJSBundle();
        }
        catch (error) {
            console.error(error);
        }
    });
}
function publishReport() {
    const data = JSON.stringify(buildReport, null, 2);
    console.log("🕧 Building pages report");
    writeFileSync(join(process.cwd(), ".ssr/output/build-report.json"), data, { flag: 'wx' });
}
export default function build() {
    return buildClient()
        .catch(e => console.error(e))
        .finally(() => console.log("✅ Done building"));
}
