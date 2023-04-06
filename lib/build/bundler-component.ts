import type { Plugin } from "esbuild"
import { join } from "path";
import { build, analyzeMetafile } from "esbuild";
import compress from "@luncheon/esbuild-plugin-gzip";


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
    if (data?.invalidate)
        return `
        const ws = new WebSocket('ws://'+ window.location.host + '/${pageName}.data')
        ws.onopen = () => {
        ws.onmessage = (e) => {
            const data = JSON.parse(e.data)
            if(data.type === 'change') {
                const deserializedData = new window.framework.DESERIALIZE(data.payload);
                const newElement = h(Component, {data: deserializedData.fromJSON()})
                hydrate(newElement, document.getElementById("${pageName}"))
            }
        }
        }`
}
const getHydrationScript = async (filePath: string, pageName: string, data: any, parent: any) => `
    ${process.env.NODE_ENV === "development" ? 'import "preact/debug";' : ""}
  import {hydrate, h, render} from "preact"
  ${parent ? `import Component, { Parent } from "${filePath}"` :
        `import Component from "${filePath}";
      const Parent = undefined;`}

  document.getElementById("${pageName}").innerHTML = "";

  if(window.getData) {
    const data = window.getData();
    const deserializedData = new window.framework.DESERIALIZE(data);
    const Element = h( Component, { data: deserializedData.fromJSON() } );
    const W = h("span", {id: "${pageName}"}, Element);
    if(Parent) {
        const ParentElement = h(Parent, {}, W);
        render(ParentElement, document.getElementById("root"))
    } else {
        render(Element, document.getElementById("${pageName}"))
    }
    ${getWSDataReload(data, pageName)}
  } else {
    if(Parent) {
        const Element = h(Component)
        const ParentElement = h(Parent, {id: '${pageName}'}, Element);
        hydrate(ParentElement, document.getElementById("root"))
    } else {
        const Element = h(Component);
        hydrate(Element, document.getElementById("${pageName}"));
    }
   
  }

  ${fetchParams(pageName)}
`;

// function resolveUnresolvablePackages(): Plugin {
//     const externalPackages = new Set<string>();

//     return {
//         name: 'resolve-unresolvable-packages',
//         setup(build) {
//             const unresolvedPackages = new Set<string>();

//             // Add unresolved packages to the set
//             build.onResolve({ filter: /.*/ }, (args) => {
//                 const { path: unresolvedPath } = args;
//                 unresolvedPackages.add(unresolvedPath);

//                 return args;
//             });

//             // Resolve packages in the set and mark unresolvable packages as external
//             build.onEnd(() => {
//                 for (const unresolvedPath of unresolvedPackages) {
//                     if (externalPackages.has(unresolvedPath)) {
//                         continue;
//                     }
//                     try {
//                         const resolvedPath = build.resolve(unresolvedPath, {
//                             kind: "import-statement"
//                         });
//                         externalPackages.delete(unresolvedPath);
//                         build.resolve({ path: unresolvedPath, pluginData: { resolvedPath } });
//                     } catch {
//                         externalPackages.add(unresolvedPath);
//                         build.resolve({ path: unresolvedPath, external: true });
//                     }
//                 }
//             });
//         },
//     };
// }

export async function generateClientBundle({
    filePath,
    tsconfig,
    pageName,
    data,
    parent,
    bundleConstants = {
        bundle: true,
        allowOverwrite: true,
        treeShaking: true,
        minify: true,
        loader: { ".ts": "ts", ".tsx": "tsx", ".js": "js", ".jsx": "jsx" },
        jsx: "automatic",
        jsxFactory: "h",
        jsxFragment: "Fragment",
        legalComments: "none",
        write: false,
    }
}: { filePath: string; outdir?: string; pageName: string; bundleConstants?: any; data: any; parent?: any, tsconfig?: string }) {
    try {
        const result = await build({
            ...bundleConstants,
            jsxImportSource: "preact",
            stdin: {
                contents: await getHydrationScript(filePath, pageName, data, parent),
                resolveDir: process.cwd(),
            },
            format: "esm",
            platform: 'neutral',
            //target: ["chrome99", "firefox99", "safari15"],

            plugins: [compress({ gzip: true })],
            outfile: join(".ssr/output/static", `${pageName}.bundle.js`),
            keepNames: /**process.env.NODE_ENV === "development" */ true,
            metafile: true,
            tsconfig,
        });

        // if (result.metafile) {
        //     let text = await analyzeMetafile(result.metafile, {
        //         verbose: true,
        //     })
        //     console.log(text)
        // }

        return result;

    } catch (e) {
        console.error({ buildCompo: e });
        throw e;
    }
}

