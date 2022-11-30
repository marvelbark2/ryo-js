import { join } from "path";

import { generateClientBundle } from "./bundler-component.js";
import { existsSync, writeFileSync } from "fs"
import { render } from "preact-render-to-string";
import { createElement, h } from "preact";
import { build, analyzeMetafile } from "esbuild";
import { getProjectPkg, watchOnDev } from "../utils/global.js";
import EntryClient, { Wrapper } from "../entry";

const projectPkg = getProjectPkg()
async function generateData(filePath: string, pageName: string, tsconfig?: string) {
  const pkg = await projectPkg;
  const result = await build({
    stdin: {
      contents: `
        import { data } from "${filePath}";
        export { data };
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
    external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {}), ...Object.keys(pkg.devDependencies || {})].filter(x => !x.includes('ryo.js')),
    ...watchOnDev
  })

  if (result.metafile) {
    let text = await analyzeMetafile(result.metafile, {
      verbose: true,
    })
    console.log(text)
  }
  return result;
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
    }

    if (options?.bundle) {
      await generateClientBundle({ filePath, outdir, pageName, tsconfig, data: Component.data, parent: Component.Parent });
    }

    const Element = h(App, { data: data ?? null }, null);
    const Parent = createElement(Wrapper, { Parent: ParentLayout, Child: Element, id: pageName }, Element);

    await build({
      bundle: true,
      minify: true,
      treeShaking: true,

    })
    writeFileSync(
      join(outdir, options?.fileName || `${pageName}.html`),
      `<!DOCTYPE html>
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
        </body>
        </html>`
    );

  } catch (error) {
    console.error(error);

  }

}