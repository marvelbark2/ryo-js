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
    private _queryParams: Record<string, string> | null = null;
    private _headers: Record<string, string> | null = null;

    constructor(private readonly inner: any) { }

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
        if (!this._headers) {
            this._headers = this.inner.getHeaders();
        }

        if (!this._headers) {
            this._headers = {};
        }
        return this._headers;
    }

    getQuery(): string {
        return this.inner.getQuery();
    }

    getQueryParams(): Record<string, string> {
        if (!this._queryParams) {
            const query = this.getQuery();
            if (query) {
                this._queryParams = Object.fromEntries(new URLSearchParams(query));
            } else {
                this._queryParams = {};
            }
        }
        return this._queryParams;
    }

    getRemoteAddress(): string {
        return this.inner.getRemoteAddress?.() ?? "unknown";
    }

    getParameter(index: number): string {
        throw new Error("Method not implemented. " + index);
    }

    forEach(callback: (key: string, value: string) => void): void {
        const headers = this.getHeaders();
        for (const key in headers) {
            callback(key, headers[key]);
        }
    }

    async readBody(): Promise<Buffer> {
        return Buffer.from(await this.inner.readBody());
    }
}

class RustResponseAdapter implements ServerResponse {
    fetched?: boolean;
    id?: number;
    ab?: ArrayBuffer | SharedArrayBuffer;
    abOffset?: number;
    authContext?: any;
    rewriteFrom?: string;
    rewrites?: any;
    private _aborted = false;

    constructor(private readonly inner: any) { }

    readJson(contextType: string, cb: any, err: any): void {
        throw new Error("Method not implemented.");
    }

    getWriteOffset(): number {
        return 0;
    }

    tryEnd(data: ArrayBuffer | SharedArrayBuffer, totalSize: number): [boolean, boolean] {
        this.inner.tryEnd?.(Buffer.from(data), totalSize);
        return [true, true];
    }

    onWritable(callback: (offset: number) => boolean): void {
        this.inner.onWritable?.(callback);
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
        return this.inner.write(typeof chunk === "string" ? chunk : Buffer.from(chunk));
    }

    end(body?: string | ArrayBuffer): void {
        if (body !== undefined) {
            this.inner.end(typeof body === "string" ? body : Buffer.from(body));
        } else {
            this.inner.end();
        }
        this._aborted = true;
    }

    isAborted(): boolean {
        return this._aborted || (this.inner.isAborted?.() ?? false);
    }

    onAborted(callback: () => void): void {
        this.inner.onAborted?.(callback);
    }

    onData(callback: (chunk: ArrayBuffer, isLast: boolean) => void): void {
        this.inner.onData?.(callback);
    }

    cork(callback: () => void): void {
        if (this.inner.cork) {
            this.inner.cork(callback);
        } else {
            callback();
        }
    }

    get aborted(): boolean {
        return this._aborted;
    }

    set aborted(value: boolean) {
        if (value) {
            this._aborted = true;
            this.inner.end?.();
        }
    }
}

// Method registration lookup table
const METHOD_REGISTRARS: Record<string, string> = {
    GET: "get",
    POST: "post",
    PUT: "put",
    DELETE: "delete",
    PATCH: "patch",
    OPTIONS: "options",
    HEAD: "head",
    ANY: "any",
};

export class RustAppAdapter implements ServerApp {
    private readonly server: any;

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
        const methodFn = METHOD_REGISTRARS[method];
        if (methodFn && this.server[methodFn]) {
            this.server[methodFn](pattern, (_: any, rustRes: any, rustReq: any) => {
                //handler(rustRes, rustReq);
                handler(new RustResponseAdapter(rustRes), new RustRequestAdapter(rustReq));
            });
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
        console.warn("WebSocket support in Rust backend is not yet implemented");
        return this;
    }

    listen(port: number, callback?: (listenSocket: any) => void): this {
        this.server.listen(port, (url: string) => {
            console.log(`Rust server listening on ${url}`);
            callback?.(url);
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