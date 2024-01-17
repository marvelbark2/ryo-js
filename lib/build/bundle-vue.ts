import { build } from "esbuild"
import vuePlugin from "esbuild-plugin-vue3"
import compress from "@luncheon/esbuild-plugin-gzip";
import { join } from "path";
import { getBuildVersion } from "../utils/build-utils";
import { cssModulesPlugin } from "@asn.aeb/esbuild-css-modules-plugin";
import { existsSync } from "fs";

type BundleVuePageOptions = {
    pageName: string,
    filePath: string,
}

function getHydrationScript(filePath: string) {
    const configPath = process.cwd() + "/vue.config.js";

    const doesExist = existsSync(configPath);

    return `
        import { createApp } from 'vue'
        import App from '${filePath}'
        ${doesExist ?
            `import config from '${configPath}';
            const uses = config.uses || [];`:
            `const uses = [];`
        }

        if(window.getData) {
            const app = createApp(App, {
                data: window.getData()
            })

            uses.forEach(use => {
                app.use(use)
            })

            app.mount('#root')
        } else {
            const app = createApp(App)

            uses.forEach(use => {
                app.use(use)
            })

            app.mount('#root')
        }
    
    `
}

const buildId = getBuildVersion();


export async function bundleVueComponent({ filePath, page }: { filePath: string, page: string }) {
    const outFile = join(".ssr/draft/vue", `${page}-${buildId}.vue.js`)
    await build({
        entryPoints: [filePath],
        bundle: true,
        treeShaking: true,
        minify: true,
        outfile: outFile,
        plugins: [
            vuePlugin() as any,
        ],
        platform: "node",
    })

    return outFile;
}

export default async function bundleVuePage({ pageName, filePath }: BundleVuePageOptions) {
    const result = await build({
        bundle: true,

        stdin: {
            contents: getHydrationScript(filePath),
            resolveDir: process.cwd(),
        },
        format: "iife",
        plugins: [
            compress({ gzip: true }),
            cssModulesPlugin({
                emitCssBundle: {
                    path: '.ssr/output/static/css',
                    filename: `${pageName}-${buildId}.module`,
                }
            }),
            vuePlugin() as any,
        ],
        treeShaking: true,
        allowOverwrite: true,
        minify: true,
        write: false,
        outfile: join(".ssr/output/static", `${pageName}-${buildId}.bundle.js`),
        platform: "browser"
    })

    return result;
}