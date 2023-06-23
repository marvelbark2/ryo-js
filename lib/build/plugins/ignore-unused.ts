import { PluginBuild } from "esbuild";

export default () => (
    {
        name: 'avoid-none-used',
        setup(build: PluginBuild) {
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
)