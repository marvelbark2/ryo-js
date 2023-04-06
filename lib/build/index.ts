import register from "@babel/register";

const reg = () => register({
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    presets: ["@babel/preset-env", "preact"],

})
import { h, Fragment } from "preact";

Object.defineProperty(global, 'h', h);
Object.defineProperty(global, 'Fragment', Fragment);

import { rmSync, existsSync, createReadStream, createWriteStream, mkdirSync } from "fs";
import { join } from "path";


import { getPageName, getPages } from '../utils/page';


import { generateFramework } from "./create-framework";
import { createStaticFile } from "./create-static";
import { generateServerScript } from "./create-server";
import { generateSSRPages } from "./create-ssr";
import { buildSync } from "esbuild";
import { importFromStringSync } from "module-from-string";
import { getProjectPkg } from "../utils/global";
import RouteValidator from "./validators/RouteValidator";
import logger from "../utils/logger";

const buildReport: any = {};

const tsConfigFile = join(process.cwd(), "tsconfig.json");
const isTsConfigFileExists = existsSync(tsConfigFile);

const tsConfig = isTsConfigFileExists ? tsConfigFile : undefined;



function generateFrameworkJSBundle() {
    console.log("🕧 Building framework bundle");
    generateFramework();
}

const isEndsWith = (collection: string[], name: string) => {
    return collection.some((item) => name.endsWith(item));
}


const buildComponent = async (Component: any, page: string, pageName: string, outdir: string, outWSdir: string) => {
    const keys = Object.keys(Component).map((x) => x.toLocaleLowerCase());
    if (isEndsWith([".tsx", ".jsx"], page)) {
        buildReport[`/${pageName}`] = keys.includes("data");
        if (keys.includes("data") && keys.includes("server")) {
            throw new Error(`Page ${pageName} has both data and server. This is not supported.`);
        }
        if (keys.includes("server")) {
            buildReport[`/${pageName}`] = "server";
            console.timeEnd(`🕧 Building: ${pageName}`);
            return await generateSSRPages({ outdir: outWSdir, pageName, path: page, tsConfig });
        }
        console.timeEnd(`🕧 Building: ${pageName}`);
        return await createStaticFile(Component, page, pageName, tsConfig, { outdir, bundle: true, data: keys.includes("data") });
    } else {
        const [p] = pageName.split("@");
        if (keys.includes("get") || keys.includes("post") || keys.includes("put") || keys.includes("delete")) {
            buildReport[`/${p}`] = "api";
        } else if (isEndsWith([".ev.js", "ev.ts"], page)) {
            buildReport[`/${p}`] = "event";
        } else if (isEndsWith([".gql.ts", ".gql.ts"], page)) {
            buildReport[`/${p}`] = "graphql";
        }
        console.timeEnd(`🕧 Building: ${pageName}`);
        return await generateServerScript({ comp: page, outdir: outWSdir, pageName });
    }
}
const tsxTransformOptions = {
    minify: true,
    format: "esm",
    target: "es2019",
}

async function buildClient() {
    try {
        const pages = getPages(join(process.cwd(), "src"), join);
        const ssrdir = join(".ssr");
        const pkg = await getProjectPkg();

        if (existsSync(ssrdir))
            rmSync(ssrdir, { recursive: true });

        const outdir = join(ssrdir, "output/static");
        const outWSdir = join(ssrdir, "output/server");
        reg();

        const modulePages = pages
            .filter((page) => isEndsWith([".js", ".jsx", ".ts", ".tsx"], page));


        const routeValidator = new RouteValidator({
            routes: modulePages
        })


        if (routeValidator.isValide()) {

            const getServerTsStatus = (pageName: string) => {
                if (pageName.endsWith(".gql")) return "graphql";
                else if (pageName.endsWith(".ev")) return "event";
                else return "api";
            }
            const allBuilds = modulePages.map(async (page: string) => {
                if (isEndsWith([".ws.jsx", ".ev.jsx", ".ws.tsx", ".ev.tsx"], page)) {
                    throw new Error("You cannot create websockets or events as components. Please create them as scripts (.js or .ts).");
                }
                const pageName = getPageName(page);
                console.time(`🕧 Building: ${pageName}`);
                if (page.endsWith(".ts")) {
                    buildReport[`/${pageName}`] = getServerTsStatus(pageName);
                    console.timeEnd(`🕧 Building: ${pageName}`);
                    return await generateServerScript({ comp: page, outdir: outWSdir, pageName });
                } else if (page.endsWith(".tsx")) {
                    const result = buildSync({
                        entryPoints: [page],
                        bundle: true,
                        tsconfig: isTsConfigFileExists ? tsConfigFile : undefined,
                        external: ["preact", "react", ...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {}), ...Object.keys(pkg.devDependencies || {})],
                        write: false,
                        format: "cjs",
                    });
                    const code = result.outputFiles[0].text;

                    const Component = importFromStringSync(code, {
                        // @ts-ignore
                        transformOptions: {
                            ...tsxTransformOptions,
                        },
                        filename: page
                    });
                    return await buildComponent(Component, page, pageName, outdir, outWSdir);
                } else {
                    const Component_2 = await import(page);
                    return await buildComponent(Component_2, page, pageName, outdir, outWSdir);

                }
            });

            await Promise.all(allBuilds);

            generateFrameworkJSBundle();

            copyPublicFiles();

            return buildReport;

        } else {
            routeValidator.printTrace();
        }



    } catch (error) {
        console.error({ e: error });
    }
}

function copyPublicFiles() {
    const publicDir = join(process.cwd(), "public");
    const outdir = join(".ssr", "output/static");
    if (existsSync(publicDir)) {
        if (!existsSync(outdir)) {
            mkdirSync(outdir, { recursive: true });
        }
        const files = getPages(publicDir, join);
        files.forEach((file) => {
            const fileName = file.split(publicDir)[1];
            createReadStream(file).pipe(createWriteStream(join(outdir, fileName)));
        })
    }
}


export default async function build() {
    try {
        return await buildClient();
    } catch (e) {
        logger.error(e);
    }
}