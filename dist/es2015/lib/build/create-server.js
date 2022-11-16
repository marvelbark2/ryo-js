var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { join } from "path";
import { build } from "esbuild";
import { readFileSync } from "fs";
export function generateServerScript({ comp, outdir = ".ssr/output/data/", pageName, bundleConstants = {
    allowOverwrite: true,
    treeShaking: true,
    minify: true,
    loader: { ".ts": "ts", ".js": "js" },
} }) {
    return __awaiter(this, void 0, void 0, function* () {
        const isWS = comp.endsWith(".ws.js");
        try {
            const out = join(outdir, isWS ? "ws" : ".", `${pageName}.js`);
            return yield build(Object.assign(Object.assign({}, bundleConstants), { stdin: {
                    contents: readFileSync(comp).toString("utf-8"),
                    resolveDir: join("."),
                }, bundle: false, target: "node14", outfile: out }));
        }
        catch (e) {
            console.error(e);
        }
    });
}
