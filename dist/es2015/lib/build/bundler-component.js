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
import { build } from "esbuild";
import compress from '@luncheon/esbuild-plugin-gzip';
const fetchParams = (pageName) => {
    if (pageName.includes(':')) {
        return `window.fetchParams = () => {
            const pageName = '${pageName}'.split('/')
            const currentPage = window.location.pathname.split('/');
            const params = {};
            const searchParams = new URLSearchParams(window.location.search);
            for(let [key, value] of searchParams.entries()) {
                params[key] = value;
            }
            for(let i = 0; i < pageName.length; i++) {
                if(pageName[i].includes(':')) {
                    params[pageName[i].replace(':', '')] = currentPage[i + 1]
                }
            }
            return params;
          }`;
    }
    else
        return `
    window.fetchParams = () => {
        const currentPage = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        const params = {};
        for(let [key, value] of searchParams.entries()) {
            params[key] = value;
        }
        return params;
      }`;
};
const getHydrationScript = (filePath, pageName) => `
  import Component from "${filePath}";
  import {hydrate, createElement} from "preact"
  if(window.getData) {
    hydrate(createElement(Component, {data: JSON.parse(window.getData())}), document.getElementById("root"))

    const ws = new WebSocket('ws://'+ window.location.host + '/${pageName}')
  
    ws.onopen = () => {
      ws.onmessage = (e) => {
          const data = JSON.parse(e.data)
          if(data.type === 'change') {
              hydrate(createElement(Component, {data: data.payload}), document.getElementById("root"))
          }
      }
    }
  } else {
    hydrate(createElement(Component), document.getElementById("root"))
  }

  ${fetchParams(pageName)}
`;
export function generateClientBundle({ filePath, outdir = ".ssr/output/static/", pageName, bundleConstants = {
    bundle: true,
    allowOverwrite: true,
    treeShaking: true,
    minify: true,
    //inject: [`lib/build/preact-shim.js`],
    loader: { ".ts": "ts", ".tsx": "tsx", ".js": "jsx", ".jsx": "jsx" },
    jsx: "automatic",
    legalComments: "none",
    write: false
} }) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield build(Object.assign(Object.assign({}, bundleConstants), { stdin: {
                    contents: getHydrationScript(filePath, pageName),
                    resolveDir: join("."),
                }, plugins: [compress({ gzip: true })], target: "es2020", outfile: join(outdir, `${pageName}.bundle.js`) }));
        }
        catch (e) {
            console.error({ e, filePath });
        }
    });
}
