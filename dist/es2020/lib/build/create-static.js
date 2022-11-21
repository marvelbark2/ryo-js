import { join } from "path";
import { generateClientBundle } from "./bundler-component.js";
import { writeFileSync } from "fs";
import { render } from "preact-render-to-string";
import { createElement } from "preact";
import { build } from "esbuild";
import { watchOnDev } from "../utils/global.js";
async function generateData(filePath, pageName) {
    const building = await build({
        bundle: true,
        minify: true,
        treeShaking: true,
        entryPoints: [filePath],
        target: "node15",
        platform: 'node',
        outfile: join(".ssr/output/server/data", `${pageName}.data.js`),
        ...watchOnDev
    });
    return building;
}
export async function createStaticFile(Component, filePath, pageName, options = { bundle: true, data: false, outdir: ".ssr/output/static", fileName: undefined }) {
    const outdir = options?.outdir || join(".ssr/output/static");
    if (options?.bundle) {
        await generateClientBundle({ filePath, outdir, pageName });
    }
    try {
        const App = Component.default || Component;
        let data = null;
        if (options?.data && Component.data) {
            if (typeof Component.data === "function") {
                data = Component.data();
            }
            else if (Object.keys(Component.data).includes('runner')) {
                data = await Component.data.runner();
            }
            await generateData(filePath, pageName);
        }
        const Element = createElement(<App />, { data: data ?? null });
        writeFileSync(join(outdir, options?.fileName || `${pageName}.html`), `<!DOCTYPE html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
          <noscript><link rel="stylesheet" href="/styles.css"></noscript>    
          <script src="/framework-system.js" defer></script>

        </head>
        <body>
          <div id="root">${render(Element)}</div>
          ${Component.data ? `<script src="/${pageName}.data.js" ></script>` : ''}
          <script src="/${pageName}.bundle.js" defer></script>
          
        </body>`);
    }
    catch (error) {
        console.error(error);
    }
}
