import { join } from "path";

import { generateClientBundle, generateOfflineClientBundle } from "./bundle-component.js";
import { existsSync, read, readFileSync, writeFileSync } from "fs"
import { render } from "preact-render-to-string";
import { createElement, h } from "preact";
import { build, analyzeMetafile } from "esbuild";
import { OFFLINES_PAGES, getProjectPkg } from "../utils/global.js";
import EntryClient from "../entry";
import { Serializer } from "../utils/serializer.js";
import { minify } from "html-minifier";
import { generateFramework } from "./create-framework.js";

const projectPkg = getProjectPkg()
async function generateData(filePath: string, pageName: string, tsconfig?: string) {
  try {
    const pkg = await projectPkg;
    const result = await build({
      stdin: {
        contents: `
        export {data} from "${filePath}"
      `,
        resolveDir: process.cwd(),
      },
      bundle: true,
      format: "esm",
      treeShaking: true,
      metafile: true,
      minify: true,
      outfile: join(".ssr/output/server/data", `${pageName}.data.js`),
      tsconfig: tsconfig,
      platform: "node",
      plugins: [
        {
          name: 'no-side-effects',
          setup(build) {
            build.onResolve({ filter: /.*/ }, async args => {
              if (args.pluginData) return // Ignore this if we called ourselves

              const { path, ...rest } = args
              rest.pluginData = true // Avoid infinite recursion
              const result = await build.resolve(path, rest)

              result.sideEffects = false
              return result
            })
          }
        }
      ],
      external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {}), ...Object.keys(pkg.devDependencies || {}), "react", "preact"].filter(x => !x.includes('ryo.js')),
    })

    if (result.metafile) {
      const text = await analyzeMetafile(result.metafile, {
        verbose: true,
      })
      console.log(text)
    }
    return result;
  } catch (error) {
    throw new Error(`Error while generating data for ${pageName}. ${error}`);
  }
}

async function saveDataIntoJson({ data, pageName }: { data: any; pageName: string; }) {
  const filePath = join(process.cwd(), ".ssr/output/server/data", `${pageName}.data.json`)
  const serialize = new Serializer(data)

  const payload = await Promise.resolve(serialize.toJSON())

  writeFileSync(
    filePath, (payload)
  )
}


export async function createStaticFile(
  Component: any,
  filePath: string,
  pageName: string,
  tsconfig?: string,
  options: { bundle: boolean; data: boolean; outdir: string; fileName?: string } | undefined = { bundle: true, data: false, outdir: ".ssr/output/static", fileName: undefined }
) {
  const outdir = options?.outdir || join(".ssr/output/static");


  try {
    // TODO: Add entry.tsx
    const Wrapper = existsSync(join(process.cwd(), "entry.jsx")) ? require(join(process.cwd(), "entry.jsx")).default : EntryClient;
    const App = Component.default || Component;
    const ParentLayout = Component.Parent || Wrapper;
    let data = null;

    if (options?.data && Component.data) {
      if (typeof Component.data === "function") {
        data = Component.data();
      } else if (Object.keys(Component.data).includes('runner')) {
        data = await Component.data.runner();
      }
      await generateData(filePath, pageName, tsconfig);
      await saveDataIntoJson({ data, pageName });

    }

    if (options?.bundle) {
      await generateClientBundle({ filePath, outdir, pageName, tsconfig, data: Component.data, parent: Component.Parent });
    }

    const Offline = Component.offline
    const isOfflineSupported = typeof Offline !== "undefined";
    if (isOfflineSupported) {
      const OfflineComponent = h(Offline, null)

      const Parent = createElement(Wrapper, { Parent: ParentLayout, Child: OfflineComponent, id: pageName }, OfflineComponent);


      const jsBundleCode = await generateOfflineClientBundle({ filePath, outdir, pageName, tsconfig, data: Component.data, parent: Component.Parent })
      if (!jsBundleCode) return
      if (jsBundleCode.errors.length > 0) throw new Error(jsBundleCode.errors[0].text)
      if (jsBundleCode.outputFiles.length === 0) throw new Error("No output files")


      const jsFramwework = await generateFramework()
      const jsCode = jsBundleCode.outputFiles[0].text

      const publicDir = join(process.cwd(), "public");

      const fileCss = readFileSync(join(publicDir, "styles.css"), "utf-8");
      const oHtml = `<!DOCTYPE html> 
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
          ${fileCss}
          </style> 
          <script defer>
          ${jsFramwework?.outputFiles[0]!.text ?? ""} 
          </script>
        </head>
        <body>
          <div id="root">
            ${render(Parent)}
          </div>
          <script>
          ${jsCode}
          </script>
        </body>
      </html>
      `;


      writeFileSync(
        join(outdir, options?.fileName || `${pageName}.offline.html`),
        minify(oHtml, {
          collapseWhitespace: true,
          removeComments: true,
          minifyJS: true,
          minifyCSS: true
        })
      );

      OFFLINES_PAGES.add(pageName)
    }

    const Element = h(App, { data: data ?? null }, null);
    const Parent = createElement(Wrapper, { Parent: ParentLayout, Child: Element, id: pageName }, Element);

    const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
      <noscript><link rel="stylesheet" href="/styles.css"></noscript>    
      <script src="/framework-system.js" defer></script>
    </head>
    <body>
      <div id="root">${render(Parent)}</div>
      ${Component.data ? `<script src="/${pageName}.data.js" ></script>` : ''}
      <script src="/${pageName}.bundle.js" defer></script>
      ${isOfflineSupported ? `
      <script>
        if (window !== undefined) {
            window.addEventListener("load", () => {
                if ("serviceWorker" in navigator) {
                    navigator.serviceWorker.register("offline-service-${pageName}");
                }
            });
        }
      </script>
      ` : ""}
    </body>
    </html>`;
    writeFileSync(
      join(outdir, options?.fileName || `${pageName}.html`),
      minify(html, {
        collapseWhitespace: true,
        removeComments: true,
        minifyJS: true,
        minifyCSS: true

      })
    );

  } catch (error) {
    console.error(error);
    throw error;
  }
}


