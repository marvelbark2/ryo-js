import { build } from "esbuild"
import { join } from "path";


const getHydrationScript = (filePath: string, data: any, id: string, suspend?: boolean) => `
    import { default as Component } from "${filePath}";
    import {hydrate, createElement} from "preact"

    const Element = createElement(Component,{ data: ${JSON.stringify(data)} });
    hydrate(Element, document.getElementById("${id}"))
`;

export async function generateClientBundle({
    data,
    filePath,
    bundleConstants = {
        bundle: true,
        allowOverwrite: true,
        treeShaking: true,
        minify: true,
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        loader: { ".ts": "ts", ".tsx": "tsx", ".js": "jsx", ".jsx": "jsx" },
        jsx: "automatic",
        legalComments: "none",
        write: false,
    },
    id,
    suspend = false,
}: { data: any, filePath: string, id: string, bundleConstants?: any, suspend?: boolean }) {
    try {
        return await build(
            {
                ...bundleConstants,
                keepNames: true,
                stdin: {
                    contents: getHydrationScript(filePath, data, id, suspend),
                    resolveDir: process.cwd(),
                },
                target: "esnext",
                platform: "node",
                external: ["pg-native"],
                format: "esm",
            }
        );
    } catch (e) {
        console.error({ e });
    }
}

