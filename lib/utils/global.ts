import { join } from "path";
import { existsSync } from "fs";
import { Config } from "RyoConfig";

// export const watchOnDev = {
//     watch: process.env.NODE_ENV === "development" ? {
//         onRebuild(error: any, result: any) {
//             const at = Date.now();
//             if (error) console.error("watch build failed: ", error);
//             else {
//                 ps.publish("restart", at);

//                 if (result.outputFiles && result.outputFiles.length > 0)
//                     console.log("watch build succeeded: ", result.outputFiles[0].path);
//                 else {
//                     console.log("[esbuild]: No chnages detected");
//                 }
//             }
//         }
//     } : undefined
// }


export async function getProjectPkg() {
    const pkg = await import(join(process.cwd(), "package.json"));
    return pkg;
}

export async function getAsyncValue<T>(value: T | Promise<T>) {
    if (value instanceof Promise) {
        return await value;
    } else {
        return value;
    }
}

export const isEndsWith = (collection: string[], name: string) => {
    return collection.some((item) => name.endsWith(item));
}

export const changePageToRoute = (page: string) => {
    const route = page.replace("/index", "")
    return route.length > 1 ? route : "/";
}

export const loadConfig = async (): Promise<Config> => {
    const confPath = join(process.cwd(), "ryo.config.js")
    if (existsSync(confPath)) {
        const config = await import(confPath);
        return config;
    } else {
        return {
            port: 3000,
            build: {
                outDir: ".ssr",
                srcDir: "src",
            }
        }
    }
}

let middlewareInitMode: any = null;
export function getMiddlewareModule() {
    if (middlewareInitMode === null) {
        const path = ".ssr/output/middleware.js";
        const middlewarePath = join(process.cwd(), path);

        if (existsSync(middlewarePath)) {
            const middleware = require(middlewarePath);
            return middleware
        } else {
            middlewareInitMode = undefined
        }
    }

    return middlewareInitMode;

}
export function getMiddleware() {
    const middleware = getMiddlewareModule();

    if (middleware && middleware.default) {
        return middleware.default;
    } else {
        return (_req: any, _res: any, next: any) => next();
    }
}


export function getMiddlewareInitMode() {
    const middleware = getMiddlewareModule();

    if (middleware && middleware.init) {
        return middleware.init;
    }
}

const OFFLINES_PAGES = new Set<string>();

export { OFFLINES_PAGES }