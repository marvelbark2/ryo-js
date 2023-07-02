import register from "@babel/register";

const reg = () => register({
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    presets: ["@babel/preset-env", "preact"],
})
import { h, Fragment } from "preact";

Object.defineProperty(global, 'h', h);
Object.defineProperty(global, 'Fragment', Fragment);

import { rmSync, existsSync, createReadStream, createWriteStream, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";


import { getPageName, getPages } from '../utils/page';


import { generateFramework } from "./create-framework";
import { createStaticFile } from "./create-static";
import { generateServerScript } from "./create-server";
import { generateSSRPages } from "./create-ssr";
import { build as buildSync } from "esbuild";
import { importFromStringSync } from "module-from-string";
import { getProjectPkg, isEndsWith, loadConfig } from "../utils/global";
import RouteValidator from "./validators/RouteValidator";
import logger from "../utils/logger";
import type { RyoConfig as Config } from '../../types/index';
import ignoreUnused from "./plugins/ignore-unused";

const buildReport: any = {};

const tsConfigFile = join(process.cwd(), "tsconfig.json");
const isTsConfigFileExists = existsSync(tsConfigFile);

const tsConfig = isTsConfigFileExists ? tsConfigFile : undefined;

//const tsConfigRaw = tsConfig ? readFileSync(tsConfig, "utf-8") : undefined


function generateFrameworkJSBundle() {
    console.log("🕧 Building framework bundle");
    generateFramework();
}

const buildComponent = async (Component: any, page: string, pageName: string, outdir: string, outWSdir: string, config: Config) => {
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
        return await createStaticFile(Component, page, pageName, config.security?.csrf === true, tsConfig, { outdir, bundle: true, data: keys.includes("data") });
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
// const tsxTransformOptions = {
//     minify: true,
//     target: "es2019",
//     jsxImportSource: "preact",
//     jsx: "automatic",
//     jsxFactory: "h",
//     jsxFragment: "Fragment"
// }

async function buildEntryClientTs({ pkgs }: any) {
    const tsxPath = join(process.cwd(), "entry.tsx");
    const jsxPath = join(process.cwd(), "entry.jsx");

    const path = existsSync(tsxPath) ? tsxPath : existsSync(jsxPath) ? jsxPath : undefined;
    if (path) {
        console.log("🕧 Building entry.tsx (existsSync(path))");
        return buildSync({
            entryPoints: [path],
            bundle: true,
            outfile: join(process.cwd(), ".ssr/output/entry.js"),
            treeShaking: true,
            tsconfig: isTsConfigFileExists ? tsConfigFile : undefined,
            jsxImportSource: "preact",
            jsx: "automatic",
            jsxFactory: "h",
            jsxFragment: "Fragment",
            platform: "node",
            // loader: {
            //     ".ts": "ts",
            //     ".tsx": "tsx",
            //     ".js": "js",
            //     ".jsx": "jsx",
            //     '.png': 'dataurl',
            //     '.svg': 'text',
            //     '.woff': 'dataurl',
            //     '.woff2': 'dataurl',
            //     '.eot': 'dataurl',
            //     '.ttf': 'dataurl',
            // },
            plugins: [
                {
                    name: 'empty-css-imports',
                    setup(build) {
                        build.onLoad({ filter: /\.css$/ }, () => ({
                            contents: '',
                        }))
                    },
                }
            ],
            allowOverwrite: true,
            external: ["preact", "react", ...Object.keys(pkgs.dependencies || {}), ...Object.keys(pkgs.peerDependencies || {}), ...Object.keys(pkgs.devDependencies || {})]
        })
    }

}



async function buildClient(config: Config) {
    reg();
    try {

        const pkgs = await getProjectPkg()
        const srcDir = config.build?.srcDir || "src";
        const pages = getPages(join(process.cwd(), srcDir), join);
        const ssrdir = join(config.build?.outDir ?? ".ssr");

        if (existsSync(ssrdir))
            rmSync(ssrdir, { recursive: true });

        const outdir = join(ssrdir, "output/static");
        const outWSdir = join(ssrdir, "output/server");

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

            if (isTsConfigFileExists) {
                console.log("🕧 Building entry.tsx (isTsConfigFileExists)");

                await buildEntryClientTs({ pkgs });

            }

            const allBuilds = modulePages.map(async (page: string) => {
                if (isEndsWith([".ws.jsx", ".ev.jsx", ".ws.tsx", ".ev.tsx", ".gql.tsx", ".gql.jsx"], page)) {
                    throw new Error("You cannot create websockets or events as components. Please create them as scripts (.js or .ts).");
                }
                const pageName = getPageName(page);
                console.time(`🕧 Building: ${pageName}`);
                if (page.endsWith(".ts")) {
                    buildReport[`/${pageName}`] = getServerTsStatus(pageName);
                    console.timeEnd(`🕧 Building: ${pageName}`);
                    return await generateServerScript({ comp: page, outdir: outWSdir, pageName });
                } else if (page.endsWith(".tsx")) {
                    const modulePath = join(ssrdir, "tsxpage", `${pageName}.js`);
                    await buildSync({
                        entryPoints: [page],
                        bundle: true,
                        treeShaking: true,
                        tsconfig: isTsConfigFileExists ? tsConfigFile : undefined,
                        jsxImportSource: "preact",
                        jsx: "automatic",
                        jsxFactory: "h",
                        jsxFragment: "Fragment",
                        platform: "neutral",
                        format: "cjs",
                        plugins: [
                            {
                                name: 'empty-css-imports',
                                setup(build) {
                                    build.onLoad({ filter: /\.css$/ }, () => ({
                                        contents: '',
                                    }))
                                },
                            },
                            ignoreUnused()
                        ],
                        outfile: modulePath,
                        write: true,
                        external: ["preact", "react", ...Object.keys(pkgs.dependencies || {}), ...Object.keys(pkgs.peerDependencies || {}), ...Object.keys(pkgs.devDependencies || {})]
                    })

                    try {
                        const Component = require(join(process.cwd(), modulePath));
                        return await buildComponent(Component, page, pageName, outdir, outWSdir, config);

                    } catch (error) {
                        console.error({
                            error,
                            page,
                            modulePath
                        });
                    }
                } else {
                    const Component_2 = await import(page);
                    return await buildComponent(Component_2, page, pageName, outdir, outWSdir, config);

                }
            });

            await Promise.all([...allBuilds, buildMiddleware()]);
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
            if (fileName.includes("/")) {
                const dirArr = fileName.split("/");
                dirArr.pop();

                const dir = dirArr.join("/");
                if (!existsSync(join(outdir, dir))) {
                    mkdirSync(join(outdir, dir), { recursive: true });
                }
            }
            createReadStream(file).pipe(createWriteStream(join(outdir, fileName)));
        })
    }
}

async function buildMiddleware() {
    const middleware = join(process.cwd(), "middleware");
    let path = null;
    if (existsSync(middleware + ".ts")) {
        path = (middleware + ".ts");
    } else if (existsSync(middleware + ".js")) {
        path = (middleware + ".js");
    }

    if (path) {
        console.time(`🕧 Building: middleware`);
        await generateServerScript({ comp: path, outdir: join(".ssr", "output"), pageName: "middleware" });
        console.timeEnd(`✅ Building: middleware`);
        return true;
    }
}

export default async function build(config: Config) {
    try {
        return await buildClient(config);
    } catch (e) {
        logger.error(e);
    }
}