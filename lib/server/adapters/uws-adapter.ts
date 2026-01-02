import { App, SSLApp, getParts } from "uWebSockets.js";

import type { HttpRequest, HttpResponse, TemplatedApp } from "uWebSockets.js";
import type { ServerRequest, ServerResponse, ServerApp, WebSocketBehavior } from "../interfaces";


import { parse as queryParser } from "querystring"

export class UWSRequestAdapter implements ServerRequest {
    constructor(private req: HttpRequest, private res: HttpResponse) { }

    getMethod(): string {
        return this.req.getMethod().toUpperCase();
    }

    getUrl(): string {
        return this.req.getUrl();
    }

    getHeader(name: string): string {
        return this.req.getHeader(name) || "";
    }

    getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {};
        this.req.forEach((key, value) => {
            headers[key] = value;
        });
        return headers;
    }

    getQuery(): string {
        return this.req.getQuery();
    }

    getQueryParams(): Record<string, string> {
        const query = this.req.getQuery();
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
        const addr = this.res.getRemoteAddressAsText();
        return Buffer.from(addr).toString();
    }

    getParameter(index: number): string {
        return this.req.getParameter(index) ?? "";
    }

    forEach(callback: (key: string, value: string) => void): void {
        this.req.forEach(callback);
    }

    readBody(): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            this.res.onData((chunk, isLast) => {
                chunks.push(Buffer.from(chunk));
                if (isLast) {
                    resolve(Buffer.concat(chunks));
                }
            });
            this.res.onAborted(() => {
                reject(new Error("Request aborted"));
            });
        });
    }
}

export class UWSResponseAdapter implements ServerResponse {
    aborted = false;
    fetched = false;
    id = 0;
    ab?: ArrayBuffer | SharedArrayBuffer;
    abOffset?: number;
    authContext?: any;
    rewriteFrom?: string | undefined;
    rewrites?: any;

    private _abortHandlers: Array<() => void> = [];


    constructor(private res: HttpResponse) {
        this.res.onAborted(() => {
            this.aborted = true;
            this._abortHandlers.forEach(h => h());
        });
    }


    readJson(contextType: string, cb: any, err: any): void {
        const res = this.res;

        let buffer: any = Buffer.from('');
        res.onData((ab, isLast) => {
            const chunk = Buffer.from(ab);
            buffer = Buffer.concat([buffer, chunk]);
            if (isLast) {
                if (buffer.length === 0) {
                    cb(undefined);
                } else if (contextType.includes("multipart/form-data")) {
                    const data = getParts(buffer as any, contextType);
                    cb(data);
                } else if (contextType.includes("application/json")) {
                    try {
                        const json = JSON.parse(buffer.toString());
                        cb(json);
                    } catch {
                        cb(buffer);
                    }
                } else if (contextType.includes("application/x-www-form-urlencoded")) {
                    cb(queryParser(buffer.toString()));
                } else {
                    cb(buffer);
                }

            }
        });

        res.onAborted(err);
    }

    writeStatus(status: string): this {
        if (!this.aborted) {
            this.res.writeStatus(status);
        }
        return this;
    }

    writeHeader(key: string, value: string): this {
        if (!this.aborted) {
            this.res.writeHeader(key, value);
        }
        return this;
    }

    write(chunk: string | ArrayBuffer): boolean {
        if (this.aborted) return false;
        return this.res.write(chunk as any);
    }

    end(body?: string | ArrayBuffer): void {
        if (!this.aborted) {
            this.res.end(body as any);
        }
    }

    isAborted(): boolean {
        return this.aborted;
    }

    onAborted(callback: () => void): void {
        this._abortHandlers.push(callback);
    }

    onData(callback: (chunk: ArrayBuffer, isLast: boolean) => void): void {
        this.res.onData(callback);
    }

    cork(callback: () => void): void {
        if (!this.aborted) {
            this.res.cork(callback);
        }
    }

    getWriteOffset(): number {
        return this.res.getWriteOffset();
    }

    tryEnd(data: ArrayBuffer | SharedArrayBuffer, totalSize: number): [boolean, boolean] {
        return this.res.tryEnd(data as ArrayBuffer, totalSize);
    }

    onWritable(callback: (offset: number) => boolean): void {
        this.res.onWritable(callback);
    }
}

export class UWSAppAdapter implements ServerApp {
    private app: TemplatedApp;
    private _uws_token?: any;


    constructor(options?: { ssl?: boolean; key?: string; cert?: string }) {
        if (options?.ssl) {
            this.app = SSLApp({
                key_file_name: options.key,
                cert_file_name: options.cert,
            });
        } else {
            this.app = App();
        }
    }

    private wrapHandler(handler: (res: ServerResponse, req: ServerRequest) => void) {
        return (res: HttpResponse, req: HttpRequest) => {
            const wrappedRes = new UWSResponseAdapter(res);
            const wrappedReq = new UWSRequestAdapter(req, res);
            handler(wrappedRes, wrappedReq);
        };
    }

    get(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this {
        this.app.get(pattern, this.wrapHandler(handler));
        return this;
    }

    post(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this {
        this.app.post(pattern, this.wrapHandler(handler));
        return this;
    }

    put(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this {
        this.app.put(pattern, this.wrapHandler(handler));
        return this;
    }

    delete(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this {
        this.app.del(pattern, this.wrapHandler(handler));
        return this;
    }

    patch(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this {
        this.app.patch(pattern, this.wrapHandler(handler));
        return this;
    }

    options(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this {
        this.app.options(pattern, this.wrapHandler(handler));
        return this;
    }

    any(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this {
        this.app.any(pattern, this.wrapHandler(handler));
        return this;
    }

    ws<UserData>(pattern: string, behavior: WebSocketBehavior<UserData>): this {
        this.app.ws(pattern, behavior as any);
        return this;
    }

    listen(port: number, callback?: (listenSocket: any) => void): this {
        this.app.listen(port, (token) => {
            this._uws_token = token;
            callback?.(token);
        });
        return this;
    }

    close(): void {
        if (this._uws_token) {
            (this.app as any).close(this._uws_token);
            this._uws_token = undefined;
        }
    }
}

export function createUWSServer(options?: { ssl?: boolean; key?: string; cert?: string }): ServerApp {
    console.log("Creating uWS server with options:", options);
    return new UWSAppAdapter(options);
}
