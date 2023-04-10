import { join } from "path";
import { build, Plugin } from "esbuild";
import { existsSync } from "fs";
import { getProjectPkg } from "../utils/global";

const externalNativeModulesPlugin: Plugin = {
    name: 'external-native-modules',
    setup(build) {
        const fs = require('fs')
        const path = require('path')
        const isNative = require('is-native-module')
        const notPackagePath = /^(\/|\.(\/|\.\/))/
        const packageName = /^([^@][^/]*|@[^/]*\/[^/]+)(?:\/|$)/

        const nmCache: Record<any, any> = {}
        const isNodeModules = async (nmPath: any) =>
            nmCache[nmPath] !== void 0 ? nmCache[nmPath] : (nmCache[nmPath] =
                fs.promises.stat(nmPath).then((x: any) => x.isDirectory(), () => false))

        const pjCache: Record<any, any> = {}
        const isNativePackage = async (pjPath: any) =>
            pjCache[pjPath] !== void 0 ? pjCache[pjPath] : (pjCache[pjPath] =
                fs.promises.readFile(pjPath, 'utf8').then((pkg: any) => isNative(JSON.parse(pkg)), () => null))

        build.onResolve({ filter: /.*/ }, async (args) => {
            // Check for package imports
            if (notPackagePath.test(args.path)) return
            const p = packageName.exec(args.path)
            if (!p) return

            // Find the package
            let dir = args.resolveDir
            while (true) {
                if (path.basename(dir) !== 'node_modules') {
                    const nmPath = path.join(dir, 'node_modules')
                    if (await isNodeModules(nmPath)) {
                        const pjPath = path.join(nmPath, p[1], 'package.json')

                        const doesExists = existsSync(pjPath)

                        if (!doesExists) return;
                        const isNative = await isNativePackage(require(pjPath))


                        // Stop if this is a native package
                        if (isNative === true) return { path: args.path, external: true }

                        // Stop if this is not a native package
                        if (isNative === false) return
                    }
                }

                // Continue if this was missing
                const parent = path.dirname(dir)
                if (parent === dir) break
                dir = parent
            }
        })
    }
}
async function getScript(outdir: string, pageName: string, path: string, tsConfig?: string) {
    const outFunc = join(outdir, "pages",)
    const pkg = await getProjectPkg();
    return await build({
        entryPoints: {
            [pageName]: path
        },
        bundle: true,
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        jsx: "automatic",
        platform: "node",
        outdir: outFunc,
        //external: ["pg-native"],
        target: 'node14',
        tsconfig: tsConfig,
        external: [...(pkg.dependencies ? Object.keys(pkg.dependencies) : []), ...(pkg.devDependencies ? Object.keys(pkg.devDependencies) : [])],
    });


}
export async function generateSSRPages({
    path,
    outdir = ".ssr/output/data/",
    pageName,
    tsConfig
}: { path: string, outdir?: string; pageName: string; tsConfig?: string }) {
    try {
        return await getScript(outdir, pageName, path, tsConfig);
    } catch (e) {
        throw e;
    }
}