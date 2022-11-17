import { join } from "path";
import { build } from "esbuild";
import compress from "@luncheon/esbuild-plugin-gzip"

const fetchParams = (pageName: string) => {
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
    } else return `
    window.fetchParams = () => {
        const currentPage = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        const params = {};
        for(let [key, value] of searchParams.entries()) {
            params[key] = value;
        }
        return params;
      }`;
}
const getHydrationScript = (filePath: string, pageName: string) => `
  import {hydrate, createElement} from "preact"
  import Component from "${filePath}";
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

export async function generateClientBundle({
    filePath,
    outdir = ".ssr/output/static/",
    pageName,
    bundleConstants = {
        bundle: true,
        allowOverwrite: true,
        treeShaking: true,
        minify: true,

        //inject: [`lib/build/preact-shim.js`],

        loader: { ".ts": "ts", ".tsx": "tsx", ".js": "jsx", ".jsx": "jsx" },
        jsx: "automatic",
        legalComments: "none",
        write: false
    }
}: { filePath: string; outdir?: string; pageName: string; bundleConstants?: any }) {
    try {
        return await build({
            ...bundleConstants,
            bundle: true,
            minify: true,
            treeShaking: true,
            write: false,
            stdin: {
                contents: getHydrationScript(filePath, pageName),
                resolveDir: process.cwd(),
            },
            plugins: [compress({ gzip: true })],
            target: "esnext",
            outfile: join(".ssr/output/static", `${pageName}.bundle.js`),
        })
    } catch (e) {
        console.error({ e, filePath });
    }
}

