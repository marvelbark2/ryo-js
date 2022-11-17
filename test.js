const { transform } = require('esbuild');
const { readFileSync } = require('fs');
const { createImportFromStringSync } = require("module-from-string");
const { createElement } = require('preact');
/** @jsx h */
const { render } = require("preact-render-to-string")
var { h } = require("preact");

const page = "/Users/johnnakamura/projects/ryo-tests/src/app.tsx";
const opts = {
    loader: 'tsx',
    target: "node15",
    format: 'cjs',
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    jsxImportSource: 'preact',
    minify: false,
    jsx: 'automatic',
}

//Object.defineProperty(global, 'h', h)


require("@babel/register")({
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    presets: ["@babel/preset-env", "preact"],
    plugins: ["transform-react-jsx", { "pragma": "h" }]
});

transform(readFileSync(page).toString(), {
    ...opts,
    sourceRoot: page,
}).then((result) => {
    const code = result.code;
    console.log({
        code,
    });
    const importModule = createImportFromStringSync({
        useCurrentGlobal: true, globals: {
            h,
        }, filename: page
    })
    const Component = importModule(code, opts);
    const Element = createElement(Component.default);
    console.log({
        Component,
        code: render(Element),
    });
}).catch(e => console.error(e));