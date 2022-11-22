import { join } from "path";

import { generateClientBundle } from "./bundler-component.js";
import { writeFileSync } from "fs"
import { render } from "preact-render-to-string";
import { createElement, h } from "preact";
import { build, analyzeMetafile } from "esbuild";
import { getProjectPkg, watchOnDev } from "../utils/global.js";
import EntryClient, { Wrapper } from "../entry";

const projectPkg = getProjectPkg();


async function generateData(filePath: string, pageName: string) {
  const pkg = await projectPkg;

  const result = await build({
    entryPoints: [filePath],
    bundle: true,
    format: "esm",
    treeShaking: true,
    external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {}), ...Object.keys(pkg.devDependencies || {})].filter(x => !x.includes('ryo.js')),
    metafile: true,
    outfile: join(".ssr/output/server/data", `${pageName}.data.js`),
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
  options: { bundle: boolean; data: boolean; outdir: string; fileName?: string } | undefined = { bundle: true, data: false, outdir: ".ssr/output/static", fileName: undefined }
) {
  const outdir = options?.outdir || join(".ssr/output/static");

  try {
    const App = Component.default || Component;
    const ParentLayout = Component.Parent || EntryClient;
    let data = null;

    if (options?.data && Component.data) {
      if (typeof Component.data === "function") {
        data = Component.data();
      } else if (Object.keys(Component.data).includes('runner')) {
        data = await Component.data.runner();
      }
      await generateData(filePath, pageName);
    }

    if (options?.bundle) {
      await generateClientBundle({ filePath, outdir, pageName, data: Component.data });
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