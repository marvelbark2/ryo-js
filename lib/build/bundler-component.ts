import { join } from "path";
import { build } from "esbuild";
import compress from "@luncheon/esbuild-plugin-gzip";
import { watchOnDev } from "../utils/global";


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
  import {hydrate, createElement, h} from "preact"
  import * as Module from "${filePath}";

  const Component = Module.default || Module;
  const Parent = Module.Parent;

  document.getElementById("${pageName}").innerHTML = "";

  if(window.getData) {
    const Element = createElement(Component, {data: JSON.parse(window.getData())});
    const W = h("span", {id: "${pageName}"}, Element);
    if(Parent) {
        const ParentElement = createElement(Parent, {}, W);
        hydrate(ParentElement, document.getElementById("root"))
    } else {
        hydrate(W, document.getElementById("${pageName}"))
    }

    const ws = new WebSocket('ws://'+ window.location.host + '/${pageName}.data')
  
    ws.onopen = () => {
      ws.onmessage = (e) => {
          const data = JSON.parse(e.data)
          if(data.type === 'change') {
              const newElement = createElement(Component, {data: data.payload})
              const NW = h("span", {id: "${pageName}"}, newElement);
              document.getElementById("${pageName}").innerHTML = "";
              hydrate(NW, document.getElementById("${pageName}"))
          }
      }
    }
  } else {
    const Element = createElement(Component)
    const ParentElement = createElement(Parent, {id: '${pageName}'}, Element);
    hydrate(ParentElement, document.getElementById('${pageName}'))
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
        inject: [join(__dirname, `preact-shim.js`)],
        loader: { ".ts": "ts", ".tsx": "tsx", ".js": "jsx", ".jsx": "jsx" },
        jsx: "automatic",
        legalComments: "none",
        platform: "browser",
        write: false,
    }
}: { filePath: string; outdir?: string; pageName: string; bundleConstants?: any }) {
    try {
        return await build({
            ...bundleConstants,
            bundle: true,
            minify: true,
            treeShaking: true,
            jsxImportSource: "preact",
            stdin: {
                contents: getHydrationScript(filePath, pageName),
                resolveDir: process.cwd(),
            },
            plugins: [compress({ gzip: true })],
            target: "esnext",
            outfile: join(".ssr/output/static", `${pageName}.bundle.js`),
            ...watchOnDev,
        })
    } catch (e) {
        console.error({ e, filePath });
    }
}

