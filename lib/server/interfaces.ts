export interface ServerRequest {
    getMethod(): string;
    getUrl(): string;
    getHeader(name: string): string;
    getHeaders(): Record<string, string>;
    getQuery(): string;
    getQueryParams(): Record<string, string>;
    getRemoteAddress(): string;
    getParameter(index: number): string;
    forEach(callback: (key: string, value: string) => void): void;
    readBody(): Promise<Buffer>;
}

export interface ServerResponse {
    // State flags for streaming
    aborted?: boolean;
    fetched?: boolean;
    id?: number;
    ab?: ArrayBuffer | SharedArrayBuffer;
    abOffset?: number;

    // Framework-specific properties
    authContext?: any;
    rewriteFrom?: string;
    rewrites?: any;

    // Core response methods
    writeStatus(status: string): this;
    writeHeader(key: string, value: string): this;
    write(chunk: string | ArrayBuffer): boolean;
    end(body?: string | ArrayBuffer): void;
    cork(callback: () => void): void;

    // Abort handling
    isAborted(): boolean;
    onAborted(callback: () => void): void;

    // Request body reading
    onData(callback: (chunk: ArrayBuffer, isLast: boolean) => void): void;

    // Streaming backpressure support
    getWriteOffset(): number;
    tryEnd(data: ArrayBuffer | SharedArrayBuffer, totalSize: number): [boolean, boolean];
    onWritable(callback: (offset: number) => boolean): void;
}

export interface WebSocketBehavior<UserData = unknown> {
    compression?: number;
    maxPayloadLength?: number;
    idleTimeout?: number;
    open?: (ws: WebSocketConnection<UserData>) => void;
    message?: (ws: WebSocketConnection<UserData>, message: ArrayBuffer, isBinary: boolean) => void;
    drain?: (ws: WebSocketConnection<UserData>) => void;
    close?: (ws: WebSocketConnection<UserData>, code: number, message: ArrayBuffer) => void;
}

export interface WebSocketConnection<UserData = unknown> {
    send(message: string | ArrayBuffer, isBinary?: boolean): void;
    close(): void;
    subscribe(topic: string): void;
    unsubscribe(topic: string): void;
    publish(topic: string, message: string | ArrayBuffer): void;
    getUserData(): UserData;
}

export interface ServerApp {
    get(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this;
    post(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this;
    put(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this;
    delete(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this;
    patch(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this;
    options(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this;
    any(pattern: string, handler: (res: ServerResponse, req: ServerRequest) => void): this;
    ws<UserData>(pattern: string, behavior: WebSocketBehavior<UserData>): this;
    listen(port: number, callback?: (listenSocket: any) => void): this;
    close(): void;
}
