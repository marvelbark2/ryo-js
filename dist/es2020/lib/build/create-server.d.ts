export declare function generateServerScript({ comp, outdir, pageName, bundleConstants }: {
    comp: any;
    outdir?: string;
    pageName: string;
    bundleConstants?: any;
}): Promise<(import("esbuild").BuildResult & {
    outputFiles: import("esbuild").OutputFile[];
}) | undefined>;
//# sourceMappingURL=create-server.d.ts.map