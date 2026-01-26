import type { ServerApp } from "./interfaces";
import { createUWSServer } from "./adapters/uws-adapter";

export type ServerBackend = "uws" | "rust" | "node";

export function createServer(
    backend: ServerBackend = "uws",
    options?: { ssl?: boolean; key?: string; cert?: string, outDir?: string }
): ServerApp {
    switch (backend) {
        case "uws":
            return createUWSServer(options);
        case "rust":
            const { createRustServer } = require("./adapters/rust-adapter");
            return createRustServer(options);
        case "node":
            const { createNodeServer } = require("./adapters/node-adapter");
            return createNodeServer();
        default:
            throw new Error(`Unknown backend: ${backend}`);
    }
}

export * from "./interfaces";
export { UWSRequestAdapter, UWSResponseAdapter, UWSAppAdapter } from "./adapters/uws-adapter";
