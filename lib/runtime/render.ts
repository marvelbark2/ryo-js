import type uws from 'uWebSockets.js';

import { join } from 'path';
import { Fragment, h } from 'preact';
import { render } from "preact-render-to-string";

import { Readable } from 'stream';
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'fs';
import { gzip } from 'zlib';

import { generateClientBundle } from './transpilor';
import { Serializer } from '../utils/serializer';
import ps from "../utils/pubsub";
import logger from '../utils/logger';
import EntryClient from '../entry';
import { getAsyncValue, getMiddleware } from '../utils/global';
import { parse as queryParser } from "querystring"
import { getParts } from 'uWebSockets.js';


/** TODOS:
 * Render Errors: Class handling errors contains methods to handle errors (render404 ...), Logging errors, and sending errors to the client
 *   THEN: Replace this.render404 -> renderError(statucCODE, error)
 * Cache Adaptor: Adding class instance to RenderProps to handle caching: DataCache, FileCache, and MemoryCache
 * MAYBE: Handle Dev env: Adding class instance to RenderProps to handle dev env: DevServer, DevClient, and DevLogger
 */
export interface RenderProps {
    res: uws.HttpResponse;
    req: uws.HttpRequest;
    pathname: string;
    isDev: boolean;
    buildReport: any
    render?: boolean
    context: Map<string, any>
    directRender?: boolean
    params?: any
}

interface RenderErrorProps extends RenderProps {
    error: number;
}


export abstract class AbstractRender {
    static PWD = process.cwd();
    static RequireCaches = new Set<string>();
    static CACHE_API_METHODS = new Map();
    static CACHE_BUNDLES = new Map();
    static middlewareFn = null

    constructor(protected readonly options: RenderProps) {
        /**
         * TODO: Handle Dev env
         * 
         * if (this.options.isDev) {
            this.renderDev();
        } else {
             this.render();
        }
         */



        const { req, pathname, res, render, directRender } = this.options;

        logger.debug("render options: ", { pathname })

        if (render === false)
            return;
        else if (directRender) {
            this.render();
        } else {
            if (res.fetched) {
                this.renderDev();
                logger.warn("Response already fetched, skipping render page: " + pathname);
                return;
            }
            else {
                res.fetched = true;
                if (pathname.includes(":")) {
                    const url = req.getUrl();

                    if (url === "/") {
                        this.render();
                        return;
                    } else {
                        const pathFile = join(AbstractRender.PWD, ".ssr", "output", "static", url);
                        if (existsSync(pathFile) && !statSync(pathFile).isDirectory()) {
                            return new RenderStatic({ ...this.options, directRender: true });
                        } else {
                            this.render();
                        }
                    }
                } else {
                    this.render();
                }
            }

        }

    }

    abstract render(): void;
    abstract renderDev(): void;

    static ClearCache() {
        AbstractRender.CACHE_API_METHODS.clear();
        AbstractRender.CACHE_BUNDLES.clear();
        AbstractRender.RequireCaches.forEach((filePath) => {
            delete require.cache[filePath];
        });
        AbstractRender.RequireCaches.clear();
    }

    static getMiddlewareFn() {
        if (AbstractRender.middlewareFn) return AbstractRender.middlewareFn;
        else {
            const mFn = getMiddleware()
            AbstractRender.middlewareFn = mFn;
            return mFn;
        }
    }

    getParams() {
        const { req, pathname: pageName, params } = this.options;
        if (params) return params;
        const paths = pageName.split("/").filter(x => x.startsWith(":"));
        if (paths.length === 0) return undefined;
        return paths.reduce((acc, curr, i) => {
            const param = curr.replace(":", "");
            this.addParam(acc, param, req.getParameter(i));
            return acc;
        }, new Map<string, string>());
    }

    addParam(map: Map<string, string>, key: string, value: any, i = 0) {
        if (!map.has(key)) {
            map.set(key, value);
        } else {
            ++i;
            this.addParam(map, key + i, value, i);
        }
    }

    getModuleFromPage(isDev = false, isGraphql = false) {
        const { pathname: pageName, req } = this.options;
        const xVersion = req.getHeader("X-API-VERSION".toLowerCase());
        const pName = `${(isGraphql && xVersion) ? pageName.replace(".gql", "") : pageName}${xVersion ? (`@${xVersion}${isGraphql ? ".gql" : ""}`) : ""}`;
        const baseFilePath = join(AbstractRender.PWD, ".ssr", "output", "server")
        const filePath = join(baseFilePath, `${pName}.js`);

        if (isDev) {
            AbstractRender.RequireCaches.add(filePath);
        }

        if (!existsSync(filePath)) {
            return require(join(baseFilePath, `${pageName}`, `index.js`))
        }

        return require(filePath);
    }

    render404() {
        this.renderError({ error: 404 });
    }

    renderError({ error, err }: { error: number, err?: Error }) {
        const { res, req, pathname } = this.options;
        const middlewareFn = AbstractRender.getMiddlewareFn()
        return middlewareFn(
            req,
            res,
            () => {
                try {
                    const contentType = req.getHeader("accept");
                    if (contentType.includes("text/html")) {
                        const errRender = new RenderError({ ...this.options, error });
                        errRender.render(() => {
                            res.writeStatus(`${error} Error`);
                            res.end(`${error} Error - page: ${pathname}`);
                        });
                    } else {
                        res.writeStatus(`${error} Error`);
                        res.end(`${error} Error - page: ${pathname}`);
                    }
                } catch (error) {
                    try {
                        res.writeStatus(`${error} Error`);
                        res.end(`${error} Error - page: ${pathname}`);
                    } catch (e) {
                        logger.error("Error in error handler", error, e);
                    }
                }
            },
            {
                errorCode: error,
                pathname,
                error: err
            }
        )
    }
}

export class Streamable extends AbstractRender {
    render(): void {
    }
    renderDev(): void {
    }
    toArrayBuffer(buffer: Buffer) {
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }

    /* Either onAborted or simply finished request */
    onAbortedOrFinishedResponse(res: uws.HttpResponse, readStream: Readable) {

        if (res.id === -1) {
            logger.log('error', "onAbortedOrFinishedResponse called twice for the same res!")
        } else {
            readStream.destroy();
        }

        /* Mark this response already accounted for */
        res.id = -1;
    }

    /* Helper function to pipe the ReadaleStream over an Http responses */
    pipeStreamOverResponse(res: uws.HttpResponse, readStream: Readable, totalSize: number, compressed = false) {


        /* Careful! If Node.js would emit error before the first res.tryEnd, res will hang and never time out */
        /* For this demo, I skipped checking for Node.js errors, you are free to PR fixes to this example */

        readStream.on('data', (chunk) => {
            /* We only take standard V8 units of data */
            const ab = this.toArrayBuffer(chunk);

            /* Store where we are, globally, in our response */
            const lastOffset = res.getWriteOffset();
            res.cork(() => {

                /* Streaming a chunk returns whether that chunk was sent, and if that chunk was last */
                const [ok, done] = res.tryEnd(ab, totalSize);

                /* Did we successfully send last chunk? */
                if (done) {
                    this.onAbortedOrFinishedResponse(res, readStream);
                } else if (!ok) {
                    /* If we could not send this chunk, pause */
                    readStream.pause();

                    /* Save unsent chunk for when we can send it */
                    res.ab = ab;
                    res.abOffset = lastOffset;

                    /* Register async handlers for drainage */
                    res.onWritable((offset) => {
                        /* Here the timeout is off, we can spend as much time before calling tryEnd we want to */

                        /* On failure the timeout will start */
                        const [ok, done] = res.tryEnd(res.ab.slice(offset - res.abOffset), totalSize);
                        if (done) {
                            this.onAbortedOrFinishedResponse(res, readStream);
                        } else if (ok) {
                            /* We sent a chunk and it was not the last one, so let's resume reading.
                             * Timeout is still disabled, so we can spend any amount of time waiting
                             * for more chunks to send. */
                            readStream.resume();
                        }

                        /* We always have to return true/false in onWritable.
                         * If you did not send anything, return true for success. */
                        return ok;
                    });
                }
            })

        }).on('error', (e) => {
            /* Todo: handle errors of the stream, probably good to simply close the response */
            this.render404();
            logger.error(`Error reading file, ${e}`);
        });

        /* If you plan to asyncronously respond later on, you MUST listen to onAborted BEFORE returning */
        res.onAborted(() => {
            this.onAbortedOrFinishedResponse(res, readStream);
        });

    }
}


export class RenderServer extends AbstractRender {

    async render() {
        const { res, pathname: path, req } = this.options;
        res.onAborted(() => {
            res.aborted = true;
        });

        const pwd = AbstractRender.PWD;
        try {
            const componentPath = join(pwd, ".ssr", "output", "server", "pages", `${path.replace("_subdomains/_subdomains", "_subdomains")}.js`);
            const splittedPath = path.split("/");
            splittedPath.pop();
            const component = require(componentPath);

            const isAsync = false;

            const reqObj: any = req;

            reqObj.getBody = async () => await new Promise((resolve, reject) => {
                res.onData((message, isLast) => {
                    // TODO: is content type is json then parse or then check other
                    resolve(message);
                });
            });

            const dataFn = component.server({
                req: reqObj,
                params: this.getParams()
            });

            const Wrapper = existsSync(join(process.cwd(), "entry.jsx")) ? require(join(process.cwd(), "entry.jsx")).default : EntryClient;
            const ParentLayout = component.Parent || Wrapper;

            const App = component.default;


            const serverData = dataFn ? ((typeof dataFn.then === "function") ? await dataFn : dataFn) : ({

            });

            if (serverData.status) {
                res.writeStatus(serverData.status.toString());
            } else {
                res.writeStatus("200 OK");
            }

            res.writeHeader("Content-Type", "text/html");

            if (serverData.headers) {
                for (const key in serverData.headers) {
                    if (!["Content-Type"].includes(key))
                        res.writeHeader(key, serverData.headers[key]);
                }
            }

            const data = serverData.body;

            const Element = h(App, {});
            //            const Parent = h(Wrapper, { Parent: ParentLayout, id: path }, Element);

            const html = render(Element);

            const head = serverData.head ? render(serverData.head || Fragment) : "";

            const clientBundle = await generateClientBundle({ filePath: componentPath, data: data, id: path, suspend: isAsync });

            const finalHtml = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    ${head}
                </head>
                <body>
                    <div id="root">${html}</div>
                    <script>
                        ${clientBundle ? clientBundle.outputFiles?.[0].text : ""}
                    </script>
                </body>
            </html>
            `
            return res.end(finalHtml);
        } catch (e) {
            console.error(e);
            return this.renderError({
                error: 500
            });
        }
    }
    renderDev() {
        //this.render();
        logger.debug("RenderServer.renderDev")
    }
}

export class EventStreamHandler {
    constructor(private res: uws.HttpResponse) { }
    handle(onSend: (onData: (data: any) => any) => any, onAbort: (chain?: any) => any) {
        const res = this.res;
        this.sendHeaders(res);
        res.writeStatus('200 OK');

        const chainPayload = onSend((data) => {
            res.write(this.serializeData(data))
        })

        res.onAborted(() => {
            onAbort(chainPayload)
        })
    }

    serializeData(data: any) {
        return `data: ${JSON.stringify(data)}\n\n`
    }
    sendHeaders(res: uws.HttpResponse) {
        for (const [header, value] of RenderEvent.HEADERS) {
            res.writeHeader(header, value)
        }
    }

}

export class RenderEvent extends AbstractRender {
    static HEADERS = [
        ['Content-Type', 'text/event-stream'],
        ['Connection', 'keep-alive'],
        ['Cache-Control', 'no-cache']
    ]
    abstractRender(isDev = false) {
        const { res, req, pathname: pageName } = this.options;
        res.onAborted(() => {
            res.aborted = true;
        });
        const getEvent = this.getModuleFromPage(isDev);
        const event = getEvent.default;
        const payload = {
            url: req.getUrl(),
            params: undefined
        }

        if (pageName.includes("/:")) {
            const params = this.getParams();
            if (params) {
                // @ts-ignore
                payload.params = Array.from(params.entries()).reduce((acc, [key, value]) => {
                    // @ts-ignore
                    acc[key.replace(".ev", "")] = value.replace(".ev", "");
                    return acc;
                }, {});

            }
        }

        if (event) {
            const eventStreamHandler = new EventStreamHandler(res);
            eventStreamHandler.handle(
                (sendData) => {
                    return setInterval(async () => {
                        sendData(await event.runner(payload))
                    }, event.invalidate)
                },
                (intervall) => {
                    if (intervall) {
                        clearInterval(intervall)
                    }
                }
            )

        } else {
            logger.error("No event found");
            return this.render404();
        }
    }
    render() {
        this.abstractRender();
    }
    renderDev() {
        this.abstractRender(true);
    }

}


export class RenderAPI extends Streamable {
    async render() {
        const { res, req, pathname: pageName, context, params: p } = this.options;
        try {
            res.onAborted(() => {
                res.aborted = true;
            });
            const method = req.getMethod().toLowerCase();
            const xVersion = req.getHeader("X-API-VERSION".toLowerCase());
            const api = this.getAPIMethod(pageName, method, xVersion);

            if (api) {
                const dataCall = api({
                    url: pageName,
                    body: method !== "get" ? async () => {
                        const contentType = req.getHeader("content-type");
                        return await new Promise<Buffer | string>((resolve, reject) => {
                            RenderAPI.readJson(contentType, res, (obj: Buffer | string) => {
                                resolve(obj);
                            }, () => {
                                /* Request was prematurely aborted or invalid or missing, stop reading */
                                reject('Invalid JSON or no data at all!');
                            })
                        })
                    } : undefined,
                    params: () => {
                        const queries = queryParser(req.getQuery());
                        const params = pageName.includes(":") ? this.getParams() : undefined;
                        if (params && queries) {
                            return { ...queries, ...(p || Object.fromEntries(params)) }
                        }
                        return (params || p) ? (p || Object.fromEntries(params)) : queries ? { ...queries } : undefined;
                    },
                    headers: () => {
                        const headers = new Map<string, string>();
                        req.forEach((key, value) => {
                            headers.set(key, value);
                        });
                        return headers;
                    },
                    setCookie: (key: string, value: string, options: string[][] = []) => {
                        if (options.length === 0) {
                            res.writeHeader("Set-Cookie", `${key}=${value}`);
                        } else {
                            res.writeHeader("Set-Cookie", `${key}=${value};${options.map(x => `${x[0]}=${x[1]}`).join(";")}`);
                        }
                    },
                    getCookies: () => {
                        const cookies = req.getHeader("cookie");
                        if (!cookies) return {};
                        return cookies.split(";")
                            .reduce((acc: any, curr: string) => {
                                const [key, value] = curr.split("=");
                                acc[key.trim()] = value.trim();
                                return acc;
                            }, {});
                    },
                    getCookie: (name: string) => (req.getHeader('cookie')).match(new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`))?.[2],
                    writeHeader: (key: string, value: string) => {
                        res.writeHeader(key, value);
                    },
                    status: (code: number) => {
                        res.writeStatus(code.toString());
                    },
                    context

                });
                const data = (dataCall?.then) ? await dataCall : dataCall;

                if (typeof data === "undefined") {
                    return res.end();
                }
                if (data.stream) {
                    if (!data.length) {
                        logger.error("Error reading stream");
                        return this.renderError({
                            error: 500
                        })
                    }
                    const stream: Readable = data.stream;

                    stream.on("error", (e) => {
                        logger.error(e);
                        return this.renderError({
                            error: 500
                        })
                    });
                    this.pipeStreamOverResponse(res, stream, data.length);
                } else if (data.subscribe) {
                    res.cork(() => {
                        res.writeHeader("Content-Type", "application/json");
                        const dispose = data.subscribe((x: any) => {
                            logger.debug("Streamed data", x);
                            res.write(JSON.stringify(x));

                        });

                        const t = setInterval(() => {
                            if (dispose.closed) {
                                dispose.unsubscribe();
                                res.end();
                                clearInterval(t);
                            }
                        }, 500)
                    })

                } else {
                    if (!res.aborted) {
                        return res.cork(() => {
                            res.writeHeader("Content-Type", "application/json");
                            res.end(JSON.stringify(data));
                        });
                    }
                }
                return;

            } else {
                return this.renderError({
                    error: 405,
                })
            }

        } catch (e) {
            logger.error(e);
            return this.renderError({
                error: 500,
                err: (e as any)
            })
        }
    }

    renderDev() {
        logger.debug("RenderAPI.renderDev");
    }

    getAPIMethod(pageName: string, methodName: string, version: string) {
        const cacheAPIMethods = AbstractRender.CACHE_API_METHODS;
        const key = `${pageName}${version ? `@${version}` : ""}.${methodName}`;
        if (cacheAPIMethods.has(key)) {
            return cacheAPIMethods.get(key);
        } else {
            const api = this.getModuleFromPage(this.options.isDev);
            const result = api[methodName];
            if (!result) return undefined;
            cacheAPIMethods.set(key, result);
            return result;
        }
    }

    static readJson(contextType: string, res: uws.HttpResponse, cb: any, err: any) {
        let buffer: Buffer = Buffer.from('');
        res.onData((ab, isLast) => {
            const chunk = Buffer.from(ab);
            buffer = Buffer.concat([buffer, chunk]);
            if (isLast) {
                if (buffer.length === 0) {
                    cb(undefined);
                } else if (contextType.includes("multipart/form-data")) {
                    const data = getParts(buffer, contextType);
                    cb(data);
                } else if (contextType.includes("application/json")) {
                    try {
                        const json = JSON.parse(buffer.toString());
                        cb(json);
                    } catch (e) {
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
}

export class RenderGraphQL extends Streamable {
    async render() {
        const { res, req } = this.options;
        try {
            const method = req.getMethod().toLowerCase();
            if (method === "post") {
                const gqlModule = this.getModuleFromPage(this.options.isDev, true);

                if (!gqlModule) {
                    return this.renderError({
                        error: 404
                    })
                }
                res.onAborted(() => {
                    res.aborted = true;
                });
                const data = await new Promise((resolve, reject) => {
                    this.readJson(res, (obj: Buffer | string) => {
                        resolve(obj);
                    }, () => {
                        /* Request was prematurely aborted or invalid or missing, stop reading */
                        reject('Invalid JSON or no data at all!');
                    })
                }) as any

                const gqlObject = gqlModule.default ? gqlModule.default : gqlModule;

                if (!gqlObject.schema) {
                    return this.renderError({
                        error: 500
                    })
                }

                try {
                    const { graphql, buildSchema } = await import("graphql");
                    const schema = gqlObject.schema;
                    const result = await graphql({
                        schema: typeof schema === "string" ? buildSchema(schema) : await getAsyncValue(schema),
                        source: data.query,
                        variableValues: data?.variables,
                        rootValue: gqlObject?.resolvers,
                        contextValue: gqlObject?.context,
                        operationName: data?.operationName
                    })
                    res.writeHeader("Content-Type", "application/json");

                    return res.end(JSON.stringify(result));
                } catch (e) {
                    logger.error(e);

                    res.writeStatus("500")
                    res.writeHeader("Content-Type", "application/json");

                    return res.end(JSON.stringify(e));
                }
            } else {
                if (this.options.isDev) {
                    const thisPage = req.getUrl()

                    const html = `
                    <!DOCTYPE html>
                    <html>
                    
                    <head>
                      <meta charset=utf-8/>
                      <meta name="viewport" content="user-scalable=no, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, minimal-ui">
                      <title>GraphQL Playground</title>
                      <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css" />
                      <link rel="shortcut icon" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/favicon.png" />
                      <script src="//cdn.jsdelivr.net/npm/graphql-playground-react/build/static/js/middleware.js"></script>
                    </head>
                    
                    <body>
                      <div id="root">
                        <style>
                          body {
                            background-color: rgb(23, 42, 58);
                            font-family: Open Sans, sans-serif;
                            height: 90vh;
                          }
                    
                          #root {
                            height: 100%;
                            width: 100%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                          }
                    
                          .loading {
                            font-size: 32px;
                            font-weight: 200;
                            color: rgba(255, 255, 255, .6);
                            margin-left: 20px;
                          }
                    
                          img {
                            width: 78px;
                            height: 78px;
                          }
                    
                          .title {
                            font-weight: 400;
                          }
                        </style>
                        <img src='//cdn.jsdelivr.net/npm/graphql-playground-react/build/logo.png' alt=''>
                        <div class="loading"> Loading
                          <span class="title">GraphQL Playground</span>
                        </div>
                      </div>
                      <script>window.addEventListener('load', function (event) {
                          GraphQLPlayground.init(document.getElementById('root'), {
                            endpoint: window.location.origin + '${thisPage}',
                          })
                        })
                     </script>
                    </body>
                    
                    </html>
                    `
                    res.writeHeader("Content-Type", "text/html");
                    return res.end(html.replace(/\n|\t/g, ' '));
                } else {
                    return this.renderError({
                        error: 405,
                    })
                }

            }

        } catch (e) {
            logger.error(e);
            return this.render404()
        }
    }


    executeSubscriptions() {
        const gqlModule = this.getModuleFromPage(this.options.isDev);

        if (gqlModule) {
            const gqlObject = gqlModule.default ? gqlModule.default : gqlModule;
            return gqlObject;
        }
    }

    readJson(res: uws.HttpResponse, cb: any, err: any) {
        let buffer: Buffer | null = null;
        let bytes = 0;
        /* Register data cb */
        res.onData((ab, isLast) => {
            const chunk = Buffer.from(ab);
            bytes += chunk.length;

            if (isLast) {
                if (bytes === 0) {
                    cb(undefined);
                    return;
                }
                let json;
                if (buffer) {
                    try {
                        json = JSON.parse(Buffer.concat([buffer, chunk]) as any);
                    } catch (e) {
                        /* res.close calls onAborted */
                        cb(Buffer.concat([buffer, chunk]))
                        return;
                    }
                    cb(json);
                } else {
                    try {
                        json = JSON.parse(chunk as any);
                    } catch (e) {
                        /* res.close calls onAborted */
                        cb(chunk)
                        return;
                    }
                    cb(json);
                }
            } else {
                if (buffer) {
                    buffer = Buffer.concat([buffer, chunk]);
                } else {
                    buffer = Buffer.concat([chunk]);
                }
            }
        });

    }
}

export class renderDefault extends AbstractRender {
    render() {
        logger.debug("RenderAPI.render");
    }

    renderDev() {
        logger.debug("RenderAPI.renderDev");
    }
}
export class RenderStatic extends Streamable {
    static MIME_TYPE = {
        "js": "text/javascript",
        "css": "text/css",
        "html": "text/html",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "svg": "image/svg+xml",
        "ico": "image/x-icon",
        "json": "application/json",
        "woff": "font/woff",
        "woff2": "font/woff2",
        "ttf": "font/ttf",
        "eot": "font/eot",
        "otf": "font/otf",
        "mp4": "video/mp4",
        "webm": "video/webm",
        "ogg": "video/ogg",
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "webp": "image/webp",
        "pdf": "application/pdf",
        "zip": "application/zip",
        "rar": "application/x-rar-compressed",
        "txt": "text/plain",
    }
    render() {
        const { res, req, buildReport, isDev } = this.options;
        res.cork(() => {
            const path = req.getUrl();
            const exts = path.split(".");
            const ext = exts[exts.length - 1];
            const isDataJs = ext === "js" && exts[exts.length - 2] === "data";

            if (isDataJs) {
                const subPath = exts[0]
                const pageName = subPath;
                if (buildReport[pageName]) {
                    return new RenderData({ ...this.options, directRender: true });
                } else {
                    return this.render404()
                }
            }

            else if (Object.keys(RenderStatic.MIME_TYPE).includes(ext)) {
                //@ts-ignore
                const mime = RenderStatic.MIME_TYPE[ext];
                if (mime) {
                    res.writeHeader("Content-Type", mime);
                    let compressed = false;
                    if (['js', 'css'].includes(ext)) {
                        res.writeHeader("Content-Encoding", "gzip");
                        compressed = true;
                    }
                    const filePath = join(AbstractRender.PWD, ".ssr", "output", "static", path);


                    if (compressed) {
                        if (!isDev)
                            res.writeHeader("Cache-Control", "public, max-age=31536000, immutable");

                        const text = readFileSync(filePath, 'utf-8');

                        res.cork(() => {
                            res.onAborted(() => {
                                res.aborted = true;
                            })
                            gzip(text, function (_, result) {
                                res.end(result);
                            })
                            return;
                        })
                    } else {
                        res.cork(() => {
                            const stream = createReadStream(filePath)
                            const size = stream.bytesRead;
                            return this.pipeStreamOverResponse(res, stream, size, compressed);
                        });
                    }

                } else {
                    return this.render404();
                }
            } else {
                return this.render404();
            }
        })
    }

    renderDev() {
        //this.render();
        logger.debug("RenderStatic.renderDev")

    }
}


const cachedData = new Map<string, any>();
export class RenderData extends AbstractRender {

    async render() {
        const { res, pathname: pageName } = this.options;
        res.onAborted(() => {
            res.aborted = true;
        });
        const dataJson = this.getDataJson(pageName);
        const template = `function getData(){return ${dataJson};}`;

        const r = await new Promise<Buffer>((resolve, reject) => {
            gzip(template, function (err, result) {
                if (err) {
                    reject(err);
                } else
                    resolve(result);
            })
        });

        res.cork(() => {
            res.writeHeader("Content-Type", "application/javascript");
            res.writeHeader("Content-Encoding", "gzip");
            res.end(r);
        })

        const dataModule = await this.getDataModule(pageName);
        const data = dataModule.data;

        if (typeof data === "object" && data !== null) {
            if (data.invalidate) {
                if (!cachedData.has(pageName)) {
                    cachedData.set(pageName, undefined);
                    const token = setInterval(async () => {
                        try {
                            const oldValue = cachedData.get(pageName)
                            const newValue = (await this.getDataFromRunnerOrLoader(
                                data,
                                () => clearInterval(token),
                                oldValue
                            ));
                            const shouldUpdate = data.shouldUpdate;
                            if (oldValue !== newValue) {
                                cachedData.set(pageName, newValue);
                                if (shouldUpdate?.(oldValue, newValue)) {
                                    ps.publish(`fetch-${pageName}`, newValue);
                                }
                            }
                            const serialize = new Serializer(newValue);
                            this.setDataJson(pageName, serialize.toJSON())
                        } catch (e) {
                            logger.error(e);
                            clearInterval(token);
                        }
                    }, data.invalidate * 1000);
                }
            }
        }
    }

    renderDev() {
        // this.render();
        logger.debug("RenderData.renderDev")

    }

    private async getDataFromRunnerOrLoader(
        data: {
            runner?: (s: () => void, oldValue: any) => any,
            source?: {
                file: string
                parser?: (data: any) => Promise<any> | any,
                onChangeData?: (s: () => void, oldValue: any, currentValue: any) => void
            }
        },
        stop: () => void,
        oldValue: any
    ) {
        if (data.runner) {
            return await data.runner(stop, oldValue);
        } else if (data.source) {
            const sourceLoader = data.source;
            const file = join(process.cwd(), sourceLoader.file)
            const loader = sourceLoader.parser || ((data: string) => JSON.parse(data))

            const dataFile = readFileSync(file, "utf-8");

            const futureData = loader(dataFile)

            let currentValue = null;
            if (futureData instanceof Promise || typeof futureData.then === "function") {
                currentValue = await futureData
            } else {
                currentValue = futureData
            }

            if (sourceLoader.onChangeData) {
                sourceLoader.onChangeData(stop, oldValue, currentValue);
            }

            return currentValue;
        }
    }

    async getDataModule(pageName: string) {
        const filePath = join(AbstractRender.PWD, ".ssr", "output", "server", "data", this.options.directRender ? pageName : `${pageName}.data.js`);
        //requireCaches.add(filePath);
        const result = await import(filePath);
        return result;
    }

    getDataJson(pageName: string) {
        const filePath = join(AbstractRender.PWD, ".ssr", "output", "server", "data", `${pageName}.data.json`);
        return readFileSync(filePath, "utf-8");
    }

    setDataJson(pageName: string, data: string) {
        const filePath = join(AbstractRender.PWD, ".ssr", "output", "server", "data", `${pageName}.data.json`);
        writeFileSync(filePath, data)
    }
}

export class RenderPage extends Streamable {
    render(): void {
        const { pathname: filePath, res } = this.options;
        res.cork(() => {
            res.writeHeader("Content-Type", "text/html; charset=utf-8");
            const stream = createReadStream(filePath);
            const size = statSync(filePath).size;
            this.pipeStreamOverResponse(res, stream, size);
        });
    }

    renderDev() {
        logger.debug("RenderPage.renderDev");
    }
}


const loadErrorPages = (buildReport: any, prefixError: string) => {
    const res = Object.keys(buildReport).filter((k) => k.includes(prefixError)).map(
        k => k.replace(prefixError, "")
    )

    return res;
}
export class RenderError {

    constructor(private readonly options: RenderErrorProps) {
        if (!RenderError.errosPage)
            RenderError.errosPage = loadErrorPages(options.buildReport, "/_errors/");
    }

    static errosPage: string[] | undefined = undefined;


    render(altResponse: () => any) {
        if (!RenderError.errosPage)
            return altResponse();
        else {
            const { res } = this.options;
            const errorPage = this.renderErrorPage({
                error: this.options.error + "",
                errosPage: RenderError.errosPage
            })

            if (!errorPage)
                return altResponse();

            const filePath = join(AbstractRender.PWD, ".ssr", "output", "static", "_errors", `${errorPage}.html`);
            const streaming = new Streamable(this.options);
            res.cork(() => {
                res.writeHeader("Content-Type", "text/html; charset=utf-8");
                const stream = createReadStream(filePath);
                const size = statSync(filePath).size;
                streaming.pipeStreamOverResponse(res, stream, size);
            });
        }
    }

    renderDev() {
        logger.debug("RenderError.renderDev");
    }

    renderErrorPage({ error, errosPage }: { error: string, err?: Error, errosPage: string[] }) {
        const errorPageSorted = errosPage
            .sort((a, b) => (a.match(/X/g) || []).length - (b.match(/X/g) || []).length)

        const err = errorPageSorted.find((x) => {
            const regex = new RegExp(x.replace(/X/g, "."), "g");
            return error.match(regex);
        })

        return err;
    }
}