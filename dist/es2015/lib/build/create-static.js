var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { join } from "path";
import { generateClientBundle } from "./bundler-component.js";
import fs from "fs";
import { render } from "preact-render-to-string";
import { createElement } from "preact";
import { build } from "esbuild";
function generateData(filePath, pageName) {
    return __awaiter(this, void 0, void 0, function* () {
        const building = yield build({
            bundle: true,
            minify: true,
            treeShaking: true,
            entryPoints: [filePath],
            target: "node15",
            platform: 'node',
            outfile: join(".ssr/output/server/data", `${pageName}.data.js`),
        });
        return building;
    });
}
export function createStaticFile(Component, filePath, pageName, options = { bundle: true, data: false, outdir: ".ssr/output/static", fileName: undefined }) {
    return __awaiter(this, void 0, void 0, function* () {
        const outdir = (options === null || options === void 0 ? void 0 : options.outdir) || join(".ssr/output/static");
        if (options === null || options === void 0 ? void 0 : options.bundle) {
            yield generateClientBundle({ filePath, outdir, pageName });
        }
        try {
            const App = Component.default || Component;
            let data = null;
            if ((options === null || options === void 0 ? void 0 : options.data) && Component.data) {
                if (typeof Component.data === "function") {
                    data = Component.data();
                }
                else if (Object.keys(Component.data).includes('runner')) {
                    data = yield Component.data.runner();
                }
                yield generateData(filePath, pageName);
            }
            const Element = createElement(App, { data: data !== null && data !== void 0 ? data : null });
            fs.writeFileSync(join(outdir, (options === null || options === void 0 ? void 0 : options.fileName) || `${pageName}.html`), `<!DOCTYPE html>
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
    });
}
