export declare function generateClientBundle({ filePath, outdir, pageName, bundleConstants }: {
    filePath: string;
    outdir?: string;
    pageName: string;
    bundleConstants?: any;
}): Promise<(import("esbuild").BuildResult & {
    outputFiles: import("esbuild").OutputFile[];
}) | undefined>;
//# sourceMappingURL=bundler-component.d.ts.map