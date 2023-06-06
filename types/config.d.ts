declare module "RyoConfig" {
    export type Config = {
        port?: number;
        build: {
            outDir?: string;
            srcDir?: string;
        }
    }
}