declare module "RyoApi" {
    export type GetApiPayload = {
        url: string;
        params: () => { [k: string]: (string | string[]) } | undefined;
        headers: () => Map<string, string>;
        setCookie: (key: string, value: string, options?: string[][]) => void;
        getCookie: (name: string) => string | undefined;
        getCookies: () => { [k: string]: string }
        writeHeader: (key: string, value: string) => void
        status: (code: number) => void
        context: Map<string, any>
    }

    export type ApiPayload = GetApiPayload & {
        body: (() => Promise<Buffer | string>)
    }
}