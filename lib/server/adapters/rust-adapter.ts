import type { ServerRequest, ServerResponse, ServerApp, WebSocketBehavior } from "../interfaces";

// This will be the compiled Rust addon
let RyoServer: any;

try {
    // Try to load the native module
    RyoServer = require("../../../native/ryo-server");
} catch (e) {
    console.warn("Rust server module not available, falling back to uWS", e);
    RyoServer = null;
}

class RustRequestAdapter implements ServerRequest {
    constructor(private inner: any) { }


    getMethod(): string {
        return this.inner.getMethod();
    }

    getUrl(): string {
        return this.inner.getUrl();
    }

    getHeader(name: string): string {
        return this.inner.getHeader(name);
    }

    getHeaders(): Record<string, string> {
        return this.inner.getHeaders();
    }

    getQuery(): string {
        return this.inner.getQuery();
    }

    getQueryParams(): Record<string, string> {
        const query = this.getQuery();
        const params: Record<string, string> = {};
        if (query) {
            const searchParams = new URLSearchParams(query);
            searchParams.forEach((value, key) => {
                params[key] = value;
            });
        }
        return params;
    }

    getRemoteAddress(): string {
        return this.inner.getRemoteAddress?.() ?? "unknown";
    }


    getParameter(index: number): string {
        throw new Error("Method not implemented. " + index);
    }
    forEach(callback: (key: string, value: string) => void): void {
        throw new Error("Method not implemented." + callback);
    }

    async readBody(): Promise<Buffer> {
        return Buffer.from(await this.inner.readBody());
    }
}

class RustResponseAdapter implements ServerResponse {
    constructor(private inner: any) { }
    aborted?: boolean | undefined;
    fetched?: boolean | undefined;
    id?: number | undefined;
    ab?: ArrayBuffer | SharedArrayBuffer | undefined;
    abOffset?: number | undefined;
    authContext?: any;
    rewriteFrom?: string | undefined;
    rewrites?: any;
    getWriteOffset(): number {
        throw new Error("Method not implemented.");
    }
    tryEnd(data: ArrayBuffer | SharedArrayBuffer, totalSize: number): [boolean, boolean] {
        throw new Error("Method not implemented.");
    }
    onWritable(callback: (offset: number) => boolean): void {
        throw new Error("Method not implemented.");
    }

    writeStatus(status: string): this {
        this.inner.writeStatus(status);
        return this;
    }

    writeHeader(key: string, value: string): this {
        this.inner.writeHeader(key, value);
        return this;
    }

    write(chunk: string | ArrayBuffer): boolean {
        const buf = typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk);
        return this.inner.write(buf);
    }

    end(body?: string | ArrayBuffer): void {
        const buf = body === undefined ? undefined : (typeof body === "string" ? Buffer.from(body) : Buffer.from(body));
        this.inner.end(buf);
    }

    isAborted(): boolean {
        return this.inner.isAborted?.() ?? false;
    }

    onAborted(callback: () => void): void {
        this.inner.onAborted?.(callback);
    }

    onData(callback: (chunk: ArrayBuffer, isLast: boolean) => void): void {
        this.inner.onData?.(callback);
    }

    cork(callback: () => void): void {
        this.inner.cork?.(callback) ?? callback();
    }
}

export class RustAppAdapter implements ServerApp {
    private server: any;
    private handlers: Map<string, (res: ServerResponse, req: ServerRequest) => void> = new Map();

    constructor(options?: { ssl?: boolean; key?: string; cert?: string }) {
        if (!RyoServer) {
            throw new Error("Rust server module not available");
        }
        this.server = new RyoServer.RyoServer();

        if (options?.ssl) {
            this.server.setSsl(options.key, options.cert);
        }
    }

    private registerHandler(
        method: string,
        pattern: string,
        handler: (res: ServerResponse, req: ServerRequest) => void
    ): this {
        const key = `${method}:${pattern}`;
        this.handlers.set(key, handler);

        // Register with Rust, providing a callback
        const callback = (_: any, rustRes: any, rustReq: any) => {
            const res = new RustResponseAdapter(rustRes);
            const req = new RustRequestAdapter(rustReq);
            handler(res, req);
        };

        switch (method) {
            case "GET":
                this.server.get(pattern, callback);
                break;
            case "POST":
                this.server.post(pattern, callback);
                break;
            case "ANY":
                this.server.any(pattern, callback);
                break;
            // ... other methods
        }

        return this;
    }

    get(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this {
        return this.registerHandler("GET", pattern, handler);
    }

    post(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this {
        return this.registerHandler("POST", pattern, handler);
    }

    put(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this {
        return this.registerHandler("PUT", pattern, handler);
    }

    delete(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this {
        return this.registerHandler("DELETE", pattern, handler);
    }

    patch(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this {
        return this.registerHandler("PATCH", pattern, handler);
    }

    options(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this {
        return this.registerHandler("OPTIONS", pattern, handler);
    }

    any(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this {
        return this.registerHandler("ANY", pattern, handler);
    }

    ws<UserData>(pattern: string, behavior: WebSocketBehavior<UserData>): this {
        // WebSocket support would need additional Rust implementation
        console.warn("WebSocket support in Rust backend is not yet implemented");
        return this;
    }

    listen(port: number, callback?: (listenSocket: any) => void): this {
        this.server.listen(port).then(() => {
            callback?.("RUST_LISTEN_SOCKET");
        });
        return this;
    }

    close(): void {
        this.server.close?.();
    }
}

export function createRustServer(options?: { ssl?: boolean; key?: string; cert?: string }): ServerApp {
    return new RustAppAdapter(options);
}

export function isRustAvailable(): boolean {
    return RyoServer !== null;
}