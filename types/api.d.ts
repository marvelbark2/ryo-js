declare module "RyoApi" {
    type MapContext = Map<string, any>;
    type Context = MapContext & {
        emit(key: string, value: any): void;
        subscribe(key: string, listener: (value: any) => void): () => void;
    }
    export type GetApiPayload = {
        url: string;
        params: () => { [k: string]: (string | string[]) } | undefined;
        headers: () => Map<string, string>;
        setCookie: (key: string, value: string, options?: string[][]) => void;
        getCookie: (name: string) => string | undefined;
        getCookies: () => { [k: string]: string }
        writeHeader: (key: string, value: string) => void
        status: (code: number) => void
        context: Context;
    }

    export type ApiPayload = GetApiPayload & {
        body: (() => Promise<Buffer | string | { [key: string]: any }>)
    }

    export type SSEPayload = {
        url: string;
        params: { [k: string]: (string | string[]) } | undefined;
        headers: Map<string, string>;
        getCookie: (name: string) => string | undefined;
        context: Context;
    }
}