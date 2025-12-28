import { join } from "path";
import { BuildOptions, analyzeMetafile, build } from "esbuild";
import compress from "@luncheon/esbuild-plugin-gzip";
import { cssModulesPlugin } from "@asn.aeb/esbuild-css-modules-plugin";
import { existsSync } from "fs";
import { getBuildVersion, nodeBuiltins } from "../utils/build-utils";



const optionHooks = () => `
// import { options } from 'preact';

// // Store previous hook
// const oldHook = options.vnode;

// // Set our own options hook
// options.vnode = vnode => {
//   console.log("Hey I'm a vnode", vnode);

//   // Call previously defined hook if there was any
//   if (oldHook) {
//     oldHook(vnode);
//   }
// }
`
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
        const ws = new WebSocket('ws://'+ window.location.host + '/${pageName}.data');
        ws.onopen = () => {
        ws.onmessage = (e) => {
            const data = JSON.parse(e.data)
            if(data.type === 'change') {
                const deserializedData = new window.framework.DESERIALIZE(data.payload);
                const newElement = h(Component, {data: deserializedData.fromJSON()})
                const EL = document.getElementById("${pageName}")
                //EL.innerHTML = "";
                hydrate(newElement, EL)
            }
        }
        }`
}

const getHydrationScript = (filePath: string, pageName: string, data: any, parent: any, entryPath?: string) => {
    return `
    import "preact/debug";
    import {h, hydrate, render} from "preact"
    ${parent ? `import Component, { Parent } from "${filePath}"` :
            `import Component from "${filePath}";
        ${entryPath ? `import Parent from "${entryPath}"` : `const Parent = undefined;`
            }`}

    ${optionHooks()}
  
    if(window.getData) {
      const data = JSON.stringify(window.getData());
      const deserializedData = new window.framework.DESERIALIZE(data);
      const Element = h( Component, { data: deserializedData.fromJSON() } );
      const W = h("span", {id: "${pageName}"}, Element);
      if(Parent) {
          const ParentElement = h(Parent, {id: '${pageName}', Parent: Parent, Child: W}, W);
          hydrate(ParentElement, document.getElementById("root"))
      } else {
          hydrate(Element, document.getElementById("${pageName}"))
      }
      ${data ? getWSDataReload(data, pageName) : ''}
    } else {
      // No data available - use render() instead of hydrate() since we need to clear and re-render
      document.getElementById("${pageName}").innerHTML = "";
      if(Parent) {
          const Element = h(Component);
          const ParentElement = h(Parent, {id: '${pageName}', Parent: Parent, Child: Element}, Element);
          render(ParentElement, document.getElementById("root"));
      } else {
          const Element = h(Component);
          render(Element, document.getElementById("${pageName}"));
      }
    }
  
    ${fetchParams(pageName)}
  `
};


const getHydrationOfflineScript = (filePath: string, pageName: string, parent: any) => `
  import "preact/debug";
  import {h, hydrate} from "preact"
  ${parent ? `import { Parent, offline } from "${filePath}"` :
        `import {offline} from "${filePath}";
      const Parent = undefined;`}

  document.getElementById("${pageName}").innerHTML = "";

  if(Parent) {
    const Element = h(offline)
    const ParentElement = h(Parent, {id: '${pageName}'}, Element);
    hydrate(ParentElement, document.getElementById("root"))
} else {
        const Element = h(offline);
        hydrate(Element, document.getElementById("${pageName}"));
    }

  ${fetchParams(pageName)}
`;


const entryPath = join(process.cwd(), ".ssr/output/entry.js");
const exisitsEntry = existsSync(entryPath)

const buildId = getBuildVersion();

export async function generateClientBundle({
    filePath,
    tsconfig,
    pageName,
    data,
    parent,
    bundleConstants = {
        bundle: true,
        allowOverwrite: false,
        treeShaking: true,
        minify: false,
        loader: {
            ".ts": "ts",
            ".tsx": "tsx",
            ".js": "js",
            ".jsx": "jsx",
            '.png': 'dataurl',
            '.svg': 'text',
            '.woff': 'dataurl',
            '.woff2': 'dataurl',
            '.eot': 'dataurl',
            '.ttf': 'dataurl',
        },
        jsx: "automatic",
        jsxFactory: "h",
        jsxFragment: "Fragment",
        legalComments: "none",
        write: true,
    }
}: { filePath: string; outdir?: string; pageName: string; bundleConstants?: BuildOptions; data: any; parent?: any, tsconfig?: string }) {
    try {
        const result = await build({
            ...bundleConstants,
            jsxImportSource: "preact",
            stdin: {
                contents: getHydrationScript(
                    filePath,
                    pageName,
                    data,
                    parent,
                    exisitsEntry ? entryPath : undefined
                ),
                resolveDir: process.cwd(),
            },
            plugins: [
                cssModulesPlugin({
                    emitCssBundle: {
                        path: '.ssr/output/static/css',
                        filename: `${pageName}-${buildId}.module`,
                    }
                })
            ],

            define: {
                'process.env.NODE_ENV': `"${process.env.NODE_ENV}"`,
            },

            outfile: join(".ssr/output/static", `${pageName}-${buildId}.bundle.js`),
            keepNames: /**process.env.NODE_ENV === "development" */ true,
            metafile: true,
            tsconfig,
            publicPath: join(".ssr/output/static"),
            absWorkingDir: process.cwd(),
            external: [...nodeBuiltins],
        });

        if (result.metafile) {
            let text = await analyzeMetafile(result.metafile)
            if (text.length < 1500) {
                console.log(text)
            }
        }

        return result;

    } catch (e) {
        console.error({ buildCompo: e });
        throw e;
    }
}

export async function generateOfflineClientBundle({
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
}: { filePath: string; outdir?: string; pageName: string; bundleConstants?: BuildOptions; data: any; parent?: any, tsconfig?: string }) {
    try {
        const result = await build({
            ...bundleConstants,
            jsxImportSource: "preact",
            stdin: {
                contents: await getHydrationOfflineScript(filePath, pageName, parent),
                resolveDir: process.cwd(),
            },
            format: "iife",
            platform: 'neutral',
            plugins: [
                compress({ gzip: true }),
                {
                    name: 'avoid-none-used',
                    setup(build) {
                        build.onResolve({ filter: /.*/ }, async (args) => {
                            try {
                                if (args.pluginData) return // Ignore this if we called ourselves

                                const { path, ...rest } = args
                                rest.pluginData = true // Avoid infinite recursion

                                const result = await build.resolve(path, rest)

                                result.sideEffects = path === 'preact/debug' || path === 'preact/devtools';
                                if (result.errors.length > 0) {
                                    return { path: result.path, external: true }
                                }
                                return result
                            } catch (e) {
                                console.error(e);
                                return { external: true };
                            }
                        });
                    }
                }
            ],

            define: {
                'process.env.NODE_ENV': `"${process.env.NODE_ENV}"`,
            },

            outfile: join(".ssr/output/static", `${pageName}.offline.js`),
            keepNames: /**process.env.NODE_ENV === "development" */ true,
            metafile: true,
            tsconfig,
            publicPath: join(".ssr/output/static"),
            write: false
        });

        return result;

    } catch (e) {
        console.error({ buildOffCompo: e });
        throw e;
    }
}

