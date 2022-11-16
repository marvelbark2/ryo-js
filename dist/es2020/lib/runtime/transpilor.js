import { build } from "esbuild";
import { join } from "path";
const getHydrationScript = (filePath, data) => `
import Component from "${filePath}";
import {hydrate, createElement} from "preact"
  hydrate(createElement(Component), document.getElementById("root"))
`;
export function generateClientBundle({ data, filePath, bundleConstants = {
    bundle: true,
    allowOverwrite: false,
    treeShaking: true,
    minify: true,
    inject: [filePath],
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    loader: { ".ts": "ts", ".tsx": "tsx", ".js": "jsx", ".jsx": "jsx" },
    jsx: "automatic",
    legalComments: "none",
    outdir: 'out',
    write: false,
} }) {
    try {
        return build({
            ...bundleConstants,
            stdin: {
                contents: getHydrationScript(filePath, data),
                resolveDir: join("."),
            },
            target: "esnext",
        });
    }
    catch (e) {
        console.error({ e });
    }
}
