import { join } from "path";
import { build, analyzeMetafile } from "esbuild";
import compress from "@luncheon/esbuild-plugin-gzip";
import { getProjectPkg, watchOnDev } from "../utils/global";


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

const getWSDataReload = (data: any, pageName: string) => {
    if (data && data.invalidate)
        return `const ws = new WebSocket('ws://'+ window.location.host + '/${pageName}.data')
        ws.onopen = () => {
        ws.onmessage = (e) => {
            const data = JSON.parse(e.data)
            if(data.type === 'change') {
                const deserializedData = new window.framework.DESERIALIZE(data.payload);
                const newElement = createElement(Component, {data: deserializedData.fromJSON()})
                hydrate(newElement, document.getElementById("${pageName}"))
            }
        }
        }`
}
const getHydrationScript = async (filePath: string, pageName: string, data: any) => `
    ${process.env.NODE_ENV === "development" ? 'import "preact/debug";' : ""}
  import {hydrate, createElement, h} from "preact"
  import * as Module from "${filePath}";

  const Component = Module.default || Module;
  const Parent = Module.Parent;

  document.getElementById("${pageName}").innerHTML = "";

  if(window.getData) {
    const data = window.getData();
    const deserializedData = new window.framework.DESERIALIZE(data);
    const Element = createElement( Component, { data: deserializedData.fromJSON() } );
    const W = h("span", {id: "${pageName}"}, Element);
    if(Parent) {
        const ParentElement = createElement(Parent, {}, W);
        hydrate(ParentElement, document.getElementById("root"))
    } else {
        hydrate(Element, document.getElementById("${pageName}"))
    }
    ${getWSDataReload(data, pageName)}
  } else {
    if(Parent) {
        const Element = createElement(Component)
        const ParentElement = createElement(Parent, {id: '${pageName}'}, Element);
        hydrate(ParentElement, document.getElementById("root"))
    } else {
        const Element = createElement(Component);
        hydrate(Element, document.getElementById("${pageName}"));
    }
   
  }

  ${fetchParams(pageName)}
`;

export async function generateClientBundle({
    filePath,
    outdir = ".ssr/output/static/",
    pageName,
    data,
    bundleConstants = {
        bundle: true,
        allowOverwrite: true,
        treeShaking: true,
        minify: true,
        //        inject: [join(__dirname, `preact-shim.js`)],
        loader: { ".ts": "ts", ".tsx": "tsx", ".js": "jsx", ".jsx": "jsx" },
        jsx: "automatic",
        legalComments: "none",
        platform: "browser",
        write: false,
    }
}: { filePath: string; outdir?: string; pageName: string; bundleConstants?: any; data: any }) {
    try {
        const pkg = await getProjectPkg();

        const result = await build({
            ...bundleConstants,
            bundle: true,
            minify: true,
            treeShaking: true,
            jsxImportSource: "preact",
            stdin: {
                contents: await getHydrationScript(filePath, pageName, data),
                resolveDir: process.cwd(),
            },
            plugins: [compress({ gzip: true })],
            target: "esnext",
            outfile: join(".ssr/output/static", `${pageName}.bundle.js`),
            keepNames: process.env.NODE_ENV === "development",
            metafile: true,
            ...watchOnDev,
            external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {}), ...Object.keys(pkg.devDependencies || {})].filter(x => !x.includes('ryo.js')),
        });

        if (result.metafile) {
            let text = await analyzeMetafile(result.metafile, {
                verbose: true,
            })
            console.log(text)
        }

        return result;

    } catch (e) {
        console.error({ e, filePath });
    }
}

