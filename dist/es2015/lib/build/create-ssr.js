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
import { buildSync } from "esbuild";
function getScript(outdir, pageName, path) {
    const outFunc = join(outdir, "pages", `${pageName}.js`);
    buildSync({
        bundle: false,
        entryPoints: [path],
        target: "node15",
        outfile: outFunc,
        //format: "esm",
        //splitting: false,
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        allowOverwrite: false,
        inject: [join(process.cwd(), "lib/build/preact-shim.js")],
    });
    return Promise.resolve("test");
}
export function generateSSRPages({ path, outdir = ".ssr/output/data/", pageName, }) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield getScript(outdir, pageName, path);
        }
        catch (e) {
            console.error(e);
        }
    });
}
