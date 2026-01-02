import type { IncomingMessage, ServerResponse } from "http";
import { ServerRequest, ServerResponse as RyoServerResponse, ServerApp, WebSocketBehavior } from "../interfaces";

// Route trie for O(1) lookups instead of O(n)
interface RouteNode {
    handler?: (res: RyoServerResponse, req: ServerRequest) => void;
    children: Map<string, RouteNode>;
    paramName?: string;
    isParam: boolean;
    wildcardHandler?: (res: RyoServerResponse, req: ServerRequest) => void;
}

class RouteTrie {
    private roots = new Map<string, RouteNode>();

    add(method: string, pattern: string, handler: (res: RyoServerResponse, req: ServerRequest) => void) {
        if (!this.roots.has(method)) {
            this.roots.set(method, { children: new Map(), isParam: false });
        }

        const root = this.roots.get(method)!;
        const segments = pattern.split('/').filter(Boolean);
        let node = root;

        for (const segment of segments) {
            if (segment.startsWith(':')) {
                // Parameter route
                if (!node.children.has(':param')) {
                    node.children.set(':param', {
                        children: new Map(),
                        isParam: true,
                        paramName: segment.slice(1)
                    });
                }
                node = node.children.get(':param')!;
            } else if (segment === '*') {
                // Wildcard
                node.wildcardHandler = handler;
                return;
            } else {
                // Static segment
                if (!node.children.has(segment)) {
                    node.children.set(segment, { children: new Map(), isParam: false });
                }
                node = node.children.get(segment)!;
            }
        }

        node.handler = handler;
    }

    match(method: string, path: string): {
        handler: ((res: RyoServerResponse, req: ServerRequest) => void) | null;
        params: Record<string, string>;
    } {
        const root = this.roots.get(method) || this.roots.get('ANY');
        if (!root) return { handler: null, params: {} };

        const segments = path.split('/').filter(Boolean);
        const params: Record<string, string> = {};
        let node = root;

        for (const segment of segments) {
            // Try exact match first
            if (node.children.has(segment)) {
                node = node.children.get(segment)!;
            }
            // Try parameter match
            else if (node.children.has(':param')) {
                const paramNode = node.children.get(':param')!;
                if (paramNode.paramName) {
                    params[paramNode.paramName] = segment;
                }
                node = paramNode;
            }
            // Try wildcard
            else if (node.wildcardHandler) {
                return { handler: node.wildcardHandler, params };
            }
            // No match
            else {
                return { handler: null, params: {} };
            }
        }

        return { handler: node.handler || node.wildcardHandler || null, params };
    }
}

class NodeRequestAdapter implements ServerRequest {
    private parsedUrl?: URL;
    private cachedHeaders?: Record<string, string>;
    private cachedQuery?: string;
    private cachedQueryParams?: Record<string, string>;
    public params: Record<string, string> = {};

    constructor(private readonly inner: IncomingMessage) { }

    private getParsedUrl(): URL {
        if (!this.parsedUrl) {
            const url = this.inner.url || "/";
            // Use base URL for parsing relative paths
            this.parsedUrl = new URL(url, `http://${this.inner.headers.host || 'localhost'}`);
        }
        return this.parsedUrl;
    }

    getMethod(): string {
        return this.inner.method || "GET";
    }

    getUrl(): string {
        return this.inner.url || "/";
    }

    getHeader(name: string): string {
        const value = this.inner.headers[name.toLowerCase()];
        return typeof value === 'string' ? value : (Array.isArray(value) ? value[0] : "");
    }

    getHeaders(): Record<string, string> {
        if (!this.cachedHeaders) {
            this.cachedHeaders = {};
            for (const [key, value] of Object.entries(this.inner.headers)) {
                if (typeof value === "string") {
                    this.cachedHeaders[key] = value;
                } else if (Array.isArray(value) && value.length > 0) {
                    this.cachedHeaders[key] = value.join(", ");
                }
            }
        }
        return this.cachedHeaders;
    }

    getQuery(): string {
        if (this.cachedQuery === undefined) {
            this.cachedQuery = this.getParsedUrl().search.slice(1);
        }
        return this.cachedQuery;
    }

    getQueryParams(): Record<string, string> {
        if (!this.cachedQueryParams) {
            const params = this.getParsedUrl().searchParams;
            this.cachedQueryParams = {};
            params.forEach((value, key) => {
                this.cachedQueryParams![key] = value;
            });
        }
        return this.cachedQueryParams;
    }

    getRemoteAddress(): string {
        return this.inner.socket.remoteAddress || "unknown";
    }

    getParameter(index: number): string {
        // Support named params from route matching
        const keys = Object.keys(this.params);
        return keys[index] ? this.params[keys[index]] : "";
    }

    forEach(callback: (key: string, value: string) => void): void {
        const headers = this.getHeaders();
        for (const key in headers) {
            callback(key, headers[key]);
        }
    }

    async readBody(): Promise<Buffer> {
        const chunks: Buffer[] = [];
        for await (const chunk of this.inner) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }
}

class NodeResponseAdapter implements RyoServerResponse {
    aborted = false;
    fetched?: boolean;
    id?: number;
    ab?: ArrayBuffer | SharedArrayBuffer;
    abOffset?: number;
    authContext?: any;
    rewriteFrom?: string;
    rewrites?: any;

    private statusCode = 200;
    private headersSent = false;

    constructor(
        private readonly req: IncomingMessage,
        private readonly inner: ServerResponse<IncomingMessage>
    ) {
        // Setup abort detection early
        this.inner.on("close", () => {
            if (!this.inner.writableEnded) {
                this.aborted = true;
            }
        });
    }
    readJson(contextType: string, cb: any, err: any): void {
        let buffer: any = Buffer.from('');
        this.req.on('data', (chunk: any) => {
            buffer = Buffer.concat([buffer, chunk]);
        });
        this.req.on('end', () => {
            try {
                if (contextType.includes("application/json")) {
                    const json = JSON.parse(buffer.toString());
                    cb(json);
                } else {
                    err(new Error("Unsupported Content-Type for JSON parsing"));
                }
            } catch (e) {
                err(e);
            }
        });
    }

    writeStatus(status: string): this {
        if (!this.headersSent) {
            this.statusCode = parseInt(status, 10);
            this.inner.statusCode = this.statusCode;
        }
        return this;
    }

    writeHeader(key: string, value: string): this {
        if (!this.headersSent) {
            this.inner.setHeader(key, value);
        }
        return this;
    }

    write(chunk: string | ArrayBuffer): boolean {
        if (this.aborted) return false;

        if (!this.headersSent) {
            this.headersSent = true;
        }

        this.inner.write(chunk);
        return true;
    }

    end(body?: string | ArrayBuffer): void {
        if (this.aborted || this.inner.writableEnded) return;

        if (body !== undefined) {
            this.inner.end(body);
        } else {
            this.inner.end();
        }
    }

    cork(callback: () => void): void {
        // Cork prevents multiple TCP packets for multiple writes
        this.inner.cork();
        try {
            callback();
        } finally {
            // Uncork in next tick to batch writes
            process.nextTick(() => this.inner.uncork());
        }
    }

    isAborted(): boolean {
        return this.aborted;
    }

    onAborted(callback: () => void): void {
        const listener = () => {
            if (!this.inner.writableEnded) {
                this.aborted = true;
                callback();
            }
        };
        this.inner.once("close", listener);
    }

    onData(callback: (chunk: ArrayBuffer, isLast: boolean) => void): void {
        this.req.on("data", (chunk: ArrayBuffer) => {
            callback(chunk, false);
        });
        this.req.once("end", () => {
            callback(new ArrayBuffer(0), true);
        });
    }

    getWriteOffset(): number {
        throw new Error("Method not implemented.");
    }

    tryEnd(data: ArrayBuffer | SharedArrayBuffer, totalSize: number): [boolean, boolean] {
        throw new Error("Method not implemented.");
    }

    onWritable(callback: (offset: number) => boolean): void {
        throw new Error("Method not implemented.");
    }
}

class NodeAdapter implements ServerApp {
    private routeTrie = new RouteTrie();
    private server: any;

    get(pattern: string, handler: (res: RyoServerResponse, req: ServerRequest) => void): this {
        this.routeTrie.add("GET", pattern, handler);
        return this;
    }

    post(pattern: string, handler: (res: RyoServerResponse, req: ServerRequest) => void): this {
        this.routeTrie.add("POST", pattern, handler);
        return this;
    }

    put(pattern: string, handler: (res: RyoServerResponse, req: ServerRequest) => void): this {
        this.routeTrie.add("PUT", pattern, handler);
        return this;
    }

    delete(pattern: string, handler: (res: RyoServerResponse, req: ServerRequest) => void): this {
        this.routeTrie.add("DELETE", pattern, handler);
        return this;
    }

    patch(pattern: string, handler: (res: RyoServerResponse, req: ServerRequest) => void): this {
        this.routeTrie.add("PATCH", pattern, handler);
        return this;
    }

    options(pattern: string, handler: (res: RyoServerResponse, req: ServerRequest) => void): this {
        this.routeTrie.add("OPTIONS", pattern, handler);
        return this;
    }

    any(pattern: string, handler: (res: RyoServerResponse, req: ServerRequest) => void): this {
        this.routeTrie.add("ANY", pattern, handler);
        return this;
    }

    ws<UserData>(pattern: string, behavior: WebSocketBehavior<UserData>): this {
        throw new Error("WebSocket not implemented in NodeAdapter.");
    }

    listen(port: number, callback?: (listenSocket: any) => void): this {
        const { createServer } = require("http");

        this.server = createServer((req: IncomingMessage, res: ServerResponse<IncomingMessage>) => {
            const method = req.method || "GET";
            const url = req.url || "/";

            // Extract path without query string
            const pathEnd = url.indexOf('?');
            const path = pathEnd >= 0 ? url.substring(0, pathEnd) : url;

            const { handler, params } = this.routeTrie.match(method, path);

            const wrappedReq = new NodeRequestAdapter(req);
            wrappedReq.params = params;
            const wrappedRes = new NodeResponseAdapter(req, res);

            if (handler) {
                try {
                    handler(wrappedRes, wrappedReq);
                } catch (error) {
                    console.error("Handler error:", error);
                    if (!res.headersSent) {
                        res.statusCode = 500;
                        res.end("Internal Server Error");
                    }
                }
            } else {
                res.statusCode = 404;
                res.end("Not Found");
            }
        });

        const socket = this.server.listen(port, () => {
            if (callback) {
                callback(socket);
            }
        });

        return this;
    }

    close(): void {
        if (this.server) {
            this.server.close();
        }
    }
}

export function createNodeServer(): ServerApp {
    return new NodeAdapter();
}