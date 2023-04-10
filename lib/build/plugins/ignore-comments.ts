import type { OnLoadArgs, OnLoadResult, Plugin, PluginBuild } from 'esbuild';
import fs from 'fs';


import { parseSync } from '@babel/core';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

const removeExportedData = (sourceCode: string): string => {
    const ast = parseSync(sourceCode, { sourceType: 'module', });

    traverse(ast, {
        ExportDeclaration(p) {
            // Check if identifier is data then remove it

            console.log(p.node);
        }
    });

    return sourceCode;
};


export interface IgnoreWithCommentsPluginOptions {
    ignore: string[];
}

const ignorePlugin = (opts?: IgnoreWithCommentsPluginOptions): Plugin => {
    return {
        name: 'ignore-with-comments-plugin',
        setup: (build: PluginBuild) => {
            // build.onResolve({ filter: /.*/, namespace: 'ignore' }, (args) => {
            //   return {
            //     path: args.path,
            //     namespace: 'ignore',
            //   };
            // });

            build.onLoad(
                {
                    filter: /\.(ts|tsx)$/,
                },
                async (args: OnLoadArgs): Promise<OnLoadResult> => {
                    const text = await fs.promises.readFile(args.path, 'utf8');

                    //const res = findComments(text);
                    if (mustIgnore(opts?.ignore)) {
                        return {
                            contents: removeExportedData(text),
                            loader: 'ts',
                        };
                    }
                    const type = args.path.endsWith('.ts') ? 'ts' : 'tsx';
                    return {
                        contents: text,
                        loader: type,
                    };
                }
            );

            build.onLoad(
                {
                    filter: /\.(js|jsx)$/,
                },
                async (args: OnLoadArgs): Promise<OnLoadResult> => {
                    const text = await fs.promises.readFile(args.path, 'utf8');

                    if (mustIgnore(opts?.ignore)) {
                        return {
                            contents: removeExportedData(text),
                            loader: 'js',
                        };
                    }
                    const type = args.path.endsWith('.js') ? 'js' : 'jsx';
                    return {
                        contents: text,
                        loader: type,
                    };
                }
            );
        },
    };
};

function mustIgnore(
    ignore: string[] | undefined
): boolean {
    if (!ignore) {
        return true;
    }
    const reducer = (prev: boolean, curr: string): boolean => {
        return (
            prev && curr === "data"
        );
    };
    return ignore.reduce(reducer, true);
}

// function findComments(text: string): string[] {
//     const commentRegex = /^\s*\/\* esbuild-ignore ([^\s\*]*)/gm;
//     const res: string[] = [];
//     let matches: RegExpExecArray | null;
//     do {
//         matches = commentRegex.exec(text);

//         if (matches && matches.length > 1) {
//             const m = matches[1];
//             console.log({ m, text });
//             res.push(m);
//         }
//     } while (matches !== null);

//     return res;
// }

const pluginFactory = (opts?: IgnoreWithCommentsPluginOptions): Plugin => {
    return ignorePlugin(opts);
};

export default pluginFactory;
