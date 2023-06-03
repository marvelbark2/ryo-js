import { join } from "path";
import { getPages } from "../utils/page";
import { changePageToRoute, isEndsWith } from "../utils/global";
import { buildSync } from "esbuild";
import { existsSync, writeFileSync } from "fs";
import { importFromStringSync } from "module-from-string";

import register from "@babel/register";


export default async function generateApiTypes(workspacePath = 'default') {
    register({
        extensions: [".ts", ".js"],
        presets: ["@babel/preset-env"],
    })
    workspacePath = workspacePath === 'default' ? join(process.cwd(), "src") : workspacePath;
    const tsConfigFile = join(process.cwd(), "tsconfig.json");
    const isTsConfigFileExists = existsSync(tsConfigFile);

    const apis = getPages(workspacePath, join)
        .filter((page) => isEndsWith([".js", ".ts"], page))
        .filter((page) => !page.includes("@"))
        .filter((page) => !page.includes("middleware"))
        .filter((page) => !page.includes("/:"))
        .filter((page) => {
            const fileName = page.split(workspacePath)[1];
            const [_, ...rest] = fileName.split(".");
            if (rest.length === 1) return true;
            else {
                const ext = rest[0];
                return ext !== "gql" && ext !== "ev" && ext !== "ws";
            }
        })

    const apiTypes = await Promise.all(apis.map(async (api) => {
        if (api.includes(".js")) {
            const apiModule = await import(api);
            const apiModuleKeys = Object.keys(apiModule);
            const path = api.split(workspacePath)[1];
            const page = path.replace(".js", "");
            return {
                // [page]: apiModuleKeys.map((key) => {
                //     const keyLowerCase = key.toLowerCase();
                //     return {
                //         [keyLowerCase]: key
                //     }
                // })
                page, api, types: apiModuleKeys.map((key) => ({
                    [key]: key.toLowerCase(),
                }))
            }
        } else {
            const result = buildSync({
                entryPoints: [api],
                bundle: true,
                tsconfig: isTsConfigFileExists ? tsConfigFile : undefined,
                write: false,
                target: "esnext",
                format: "esm",
                platform: "node",
            });

            const code = result.outputFiles[0].text;

            const apiModule = importFromStringSync(code, {
                filename: api
            });
            const apiModuleKeys = Object.keys(apiModule);
            const path = api.split(workspacePath)[1];
            const page = path.replace(".ts", "");
            return {
                page, api, types: apiModuleKeys.map((key) => ({
                    [key]: key.toLowerCase(),
                }))
            }
        }
    }))



    const internalApiTypeCode = apiTypes.reduce((acc, curr) => {
        const page = changePageToRoute(curr.page);
        const api = curr.api.replace(".ts", "");
        const types = curr.types;
        const internalApiType = types.reduce((acc, curr) => {
            const key = Object.keys(curr)[0];
            const value = curr[key];
            return `${acc}'${key}': Awaited<ReturnType<typeof import('${api}').${value}>>,`
        }, "")
        return `${acc}'${page}': {${internalApiType}},`
    }, "")

    const internalApiType = `
    type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T
    interface InternalApi {
        ${internalApiTypeCode}
    }
    export type { InternalApi }
    `

    writeFileSync(join(process.cwd(), ".ryo", "internal-api.ts"), internalApiType);

    /**
     * import type { InternalApi } from './types'
        type InternalApiEndpoint = keyof InternalApi;

        async function fetchDataFromUrl<T extends InternalApiEndpoint>(
            endpoint: T,
            method: "get" | "post" | "put" | "delete",
        ): Promise<Awaited<ReturnType<InternalApi[T][typeof method]>>> {
            const url = `${endpoint}`; // Replace with the base URL for your API
            const response = await fetch(url, { method });
            const data = await response.json();
            return data as Awaited<ReturnType<InternalApi[T][typeof method]>>;
        }

        export default fetchDataFromUrl;
     */

    const fetchDataFromUrl = `
    import type { InternalApi } from './internal-api'
    type InternalApiEndpoint = keyof InternalApi;

    async function fetchDataFromUrl<T extends InternalApiEndpoint>(
        endpoint: T,
        method: "get" | "post" | "put" | "delete",
    ): Promise<InternalApi[T][typeof method]> {
        const url = \`\${endpoint}\`; // Replace with the base URL for your API
        const response = await fetch(url, { method });
        const data = await response.json();
        return data as InternalApi[T][typeof method];
    }

    export default fetchDataFromUrl;
    `

    writeFileSync(join(process.cwd(), ".ryo", "ryo-fetch.ts"), fetchDataFromUrl);

}