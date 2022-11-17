import * as uws from "uWebSockets.js";
import { join } from "path";
import { gzip } from "zlib";
import { render as preactRender } from "preact-render-to-string";
import { createReadStream, existsSync } from 'fs';
import { PassThrough, Readable } from 'stream';

import babelRegister from "@babel/register";


import "./polyfills/index";

import { createElement } from "preact";

import { generateClientBundle } from "./runtime/transpilor";
import { getPages } from "./utils/page";

export default function server() {
    babelRegister({
        presets: ["preact"],

    });
    const _require = require;

    /* Helper function converting Node.js buffer to ArrayBuffer */
    function toArrayBuffer(buffer: Buffer) {
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }

    /* Either onAborted or simply finished request */
    function onAbortedOrFinishedResponse(res: uws.HttpResponse, readStream: Readable) {

        if (res.id == -1) {
            console.log("ERROR! onAbortedOrFinishedResponse called twice for the same res!");
        } else {
            readStream.destroy();
        }

        /* Mark this response already accounted for */
        res.id = -1;
    }

    /* Helper function to pipe the ReadaleStream over an Http responses */
    function pipeStreamOverResponse(res: uws.HttpResponse, readStream: Readable, totalSize: number) {
        /* Careful! If Node.js would emit error before the first res.tryEnd, res will hang and never time out */
        /* For this demo, I skipped checking for Node.js errors, you are free to PR fixes to this example */
        readStream.on('data', (chunk) => {
            /* We only take standard V8 units of data */
            const ab = toArrayBuffer(chunk);

            /* Store where we are, globally, in our response */
            let lastOffset = res.getWriteOffset();

            /* Streaming a chunk returns whether that chunk was sent, and if that chunk was last */
            let [ok, done] = res.tryEnd(ab, totalSize);

            /* Did we successfully send last chunk? */
            if (done) {
                onAbortedOrFinishedResponse(res, readStream);
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
                    let [ok, done] = res.tryEnd(res.ab.slice(offset - res.abOffset), totalSize);
                    if (done) {
                        onAbortedOrFinishedResponse(res, readStream);
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

        }).on('error', (e) => {
            /* Todo: handle errors of the stream, probably good to simply close the response */
            render404(res);
            console.log("Error reading file, ", e);
        });

        /* If you plan to asyncronously respond later on, you MUST listen to onAborted BEFORE returning */
        res.onAborted(() => {
            onAbortedOrFinishedResponse(res, readStream);
        });
    }

    const app = uws.App();


    const buildReport = _require(join(process.cwd(), ".ssr", "build-report.json"));

    const mimeType = {
        "js": "text/javascript",
        "css": "text/css",
        "html": "text/html"
    }
    function render404(res: uws.HttpResponse) {
        res.writeStatus("404");
        res.end("404 Not Found");
    }

    const cachedData = new Map();
    const cachedChange: string[] = [];
    const cachedDataPages = new Map();

    const getDataModule = (pageName: string) => {
        if (cachedDataPages.has(pageName)) {
            return cachedDataPages.get(pageName);
        } else {
            const filePath = join(process.cwd(), ".ssr", "output", "server", "data", `${pageName}.data.js`);
            const result = _require(filePath);
            cachedDataPages.set(pageName, result);
            return result;
        }
    }

    async function renderData(res: uws.HttpResponse, pageName: string) {
        res.writeHeader("Content-Type", "application/javascript");
        res.writeHeader("Content-Encoding", "gzip");

        const { data } = getDataModule(pageName);
        res.onAborted(() => {
            res.aborted = true;
        });

        if (typeof data === 'function') {

            const dataCall = data();

            const template = `function getData(){return '${JSON.stringify(dataCall)}';}`;

            gzip(template, function (_, result) {  // The callback will give you the 
                res.end(result);                     // result, so just send it.
            });

        } else {
            //
            if (cachedData.has(pageName)) {
                const cachedValue = cachedData.get(pageName);
                if (!res.aborted) {
                    const template = `function getData(){return '${JSON.stringify(cachedValue)}';}`;
                    gzip(template, function (_, result) {
                        res.end(result);
                    });
                }
            } else {
                const dataCall = (await data.runner());

                const template = `function getData(){return '${JSON.stringify(dataCall)}';}`;

                if (!res.aborted) {
                    gzip(template, function (_, result) {
                        if (data.invalidate)
                            cachedData.set(pageName, dataCall);
                        res.end(result);
                    });
                }

                if (data.invalidate) {
                    const token = setInterval(async () => {
                        try {
                            const currentValue = cachedData.get(pageName)
                            const dataCall = (await data.runner(() => clearInterval(token)));
                            const shouldUpdate = data.shouldUpdate;
                            if (currentValue !== dataCall) {
                                cachedData.set(pageName, dataCall);
                                if (shouldUpdate && shouldUpdate(currentValue, dataCall)) {
                                    cachedChange.push(pageName);
                                }
                            }
                        } catch (e) {
                            console.error(e);
                            clearInterval(token);
                        }
                    }, data.invalidate * 1000);
                }
            }

        }

    }

    function readJson(res: uws.HttpResponse, cb: any, err: any) {
        let buffer: Buffer | null = null;
        let bytes = 0;
        /* Register data cb */
        res.onData((ab, isLast) => {
            let chunk = Buffer.from(ab);
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

    const apiModulesCache = new Map();

    const getModuleFromPage = (pageName: string) => {
        if (apiModulesCache.has(pageName)) {
            return apiModulesCache.get(pageName);
        } else {
            const filePath = join(process.cwd(), ".ssr", "output", "server", `${pageName}.js`);
            const result = _require(filePath);
            apiModulesCache.set(pageName, result);
            return result;
        }
    }
    const addParam = (map: Map<string, string>, key: string, value: any, i = 0) => {
        if (!map.has(key)) {
            map.set(key, value);
        } else {
            ++i;
            addParam(map, key + i, value, i);
        }
    }
    function getParams(req: uws.HttpRequest, pageName: string) {
        const paths = pageName.split("/").filter(x => x.startsWith(":"));
        if (paths.length === 0) return undefined;
        return paths.reduce((acc, curr, i) => {
            const param = curr.replace(":", "");
            addParam(acc, param, req.getParameter(i));
            return acc;
        }, new Map());
    }

    async function renderAPI(res: uws.HttpResponse, req: uws.HttpRequest, pageName: string) {
        try {
            const method = req.getMethod();
            const module = getModuleFromPage(pageName);

            if (method.includes(method)) {
                let body = {};
                const api = module[method];
                if (method !== "get") {
                    body = await new Promise((resolve, reject) => {
                        readJson(res, (obj: Buffer | string) => {
                            resolve(obj);
                        }, () => {
                            /* Request was prematurely aborted or invalid or missing, stop reading */
                            reject('Invalid JSON or no data at all!');
                        })
                    })
                }

                const params = getParams(req, pageName)

                const dataCall = api({
                    url: pageName,
                    body: body,
                    params: params ? Object.fromEntries(params) : undefined,
                });
                const data = api.constructor.name === 'AsyncFunction' ? await dataCall : dataCall;

                if (Object.keys(data).includes("stream")) {
                    if (!data.length) {
                        render404(res);
                        console.log("Error reading stream");
                        return;
                    }
                    pipeStreamOverResponse(res, data.stream, data.length);
                } else {
                    res.writeHeader("Content-Type", "application/json");
                    res.end(JSON.stringify(data));
                }
            } else {
                render404(res);
                console.log("Method not allowed");
            }

        } catch (e) {
            console.error(e);
            render404(res);
        }
    }

    function caching(res: uws.HttpResponse) {
        res.writeHeader("Cache-Control", "public, max-age=31536000");
        res.writeHeader("Expires", new Date(Date.now() + 31536000000).toUTCString());
        res.writeHeader("Vary", "Accept-Encoding");
        res.writeHeader("Connection", "keep-alive");
    }


    const cachedBundles = new Map();

    async function renderStatic(res: uws.HttpResponse, exts: string[], path: string) {
        const ext = exts[exts.length - 1];
        const isDataJs = ext === "js" && exts[exts.length - 2] === "data";

        if (isDataJs) {
            const subPath = exts[0]
            const pageName = subPath;
            if (buildReport[pageName]) {
                return await renderData(res, subPath);
            } else {
                return render404(res)
            }
        }

        if (ext === "js" || ext === "css" || ext === 'html') {
            const mime = mimeType[ext];
            if (mime) {
                res.writeHeader("Content-Type", mime);
                if (ext === 'js')
                    res.writeHeader("Content-Encoding", "gzip");

                const isBundle = path.endsWith(".bundle.js");
                if (isBundle && cachedBundles.has(path)) {
                    const cachedStream = cachedBundles.get(path);
                    cachedBundles.set(path, cachedStream.pipe(new PassThrough()));
                    return pipeStreamOverResponse(res, cachedStream, cachedStream.bytesRead);
                }
                const filePath = join(process.cwd(), ".ssr", "output", "static", `${path}${ext === 'js' ? '.gz' : ''}`);
                const stream = createReadStream(filePath);
                const size = stream.bytesRead;
                if (isBundle) {
                    try {
                        const clonedStream = stream.pipe(new PassThrough());
                        cachedBundles.set(path, clonedStream);
                    } catch (error) {
                        console.error(error);
                    }
                }
                return pipeStreamOverResponse(res, stream, size);
            } else {
                // const newPath = exts.slice(0, exts.length - 1).join(".");
                // console.log("Redirecting to", newPath);
                // return render(res, req, newPath);
                return render404(res);
            }
        } else {
            return render404(res);
        }
    }

    async function render(res: uws.HttpResponse, req: uws.HttpRequest, path = req.getUrl(), params?: string): Promise<any> {
        //const path = req.getUrl();
        res.onAborted(() => {
            res.aborted = true;
        });
        const exts = path.split(".");
        if (exts.length > 1) {
            return await renderStatic(res, exts, path);
        } else {
            try {
                // OPTMIIZATION: if the page is not in the build report, then it is not a valid page
                const pageName = Object.keys(buildReport).find((key) => key === path);

                if (pageName) {
                    const staticPath = req.getUrl()
                    const newPageName = Object.keys(buildReport).find((key) => key === staticPath + "/index");
                    if (newPageName && path.includes("/:")) {
                        return render(res, req, newPageName, params);
                    }
                    const filePath = join(process.cwd(), ".ssr", "output", "static", `${pageName}.html`);
                    const fileExists = existsSync(filePath);
                    if (fileExists) {
                        const stream = createReadStream(filePath);
                        const size = stream.bytesRead;
                        return pipeStreamOverResponse(res, stream, size);
                    } else {
                        return await renderAPI(res, req, pageName)
                    }

                } else {
                    console.log("Page not found", path);
                    const splittedPath = path.split("/");
                    const p = splittedPath.pop();
                    const newPath = splittedPath.join("/");

                    const file = Object.keys(buildReport).find((file) => file.startsWith(newPath + "/:"));
                    if (file) {
                        //TODO: render with params
                        return render(res, req, file, p);
                    } else {
                        return render404(res)
                    }

                }
            } catch (error) {
                console.error(error);
                render404(res)
            }
        }
    }

    function loadWSEndpoints() {
        const wsPath = join(process.cwd(), ".ssr", "output", "server", "ws");
        const isExist = existsSync(wsPath);
        if (isExist) {
            const files = getPages(wsPath, join);
            files.forEach((file) => {
                const object = _require(file).default;
                const fileName = file.split("/server/ws/");
                const pageName = fileName[1].split(".ws.js")[0];


                app.ws(`/${pageName}`, {
                    compression: uws.SHARED_COMPRESSOR,
                    maxPayloadLength: 16 * 1024 * 1024,
                    idleTimeout: 16,
                    open: object.open,
                    message: object.message,
                    drain: object.drain,
                    close: object.close
                });
            })
        } else {
            console.log("No ws endpoints found");
        }

    }

    loadWSEndpoints();



    async function renderServer(res: uws.HttpResponse, path: string) {
        res.onAborted(() => {
            res.aborted = true;
        });
        generateClientBundle
        try {
            const componentPath = join(process.cwd(), ".ssr", "output", "server", "pages", path + ".js");
            const component = _require(componentPath);

            /** TODO: Algo to render server component */

            /**
             * 1. Render the component with the data from the server
             * 2. Send the rendered component to the client
             * 3. Extract the html from the rendered component
             * 4. Add client bundle
             * 5. use the html to render the page
             * THUS: the page will be rendered with the data from the server as html and use hooks externally to hydrate the page
             */
            const defaultComponent = component.default.constructor.name === 'AsyncFunction' ? await component.default() : component.default();
            const Element = createElement(() => defaultComponent, null);
            res.writeHeader("Content-Type", "text/html");
            const html = preactRender(Element);

            const clientBundle = await generateClientBundle({ filePath: componentPath, data: null });

            const finalHtml = html.replace("</body>", `<script>${clientBundle}</script></body>`);
            return res.end(finalHtml);

            // const bundled = await generateClientBundle({ Element: component.default, data: serverCall, filePath: componentPath });
            // const code = bundled["outputFiles"][0]["text"];
            // ${preactRender(Element)}
            // const HTML = preactRender(Element);
            // const hydrateScript = `
            // <!DOCTYPE html>
            // <head>
            //   <meta charset="UTF-8">
            //   <meta name="viewport" content="width=device-width, initial-scale=1.0">
            //   <link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
            //   <noscript><link rel="stylesheet" href="styles.css"></noscript>   
            //   <script src="/framework-system.js"></script>       
            // </head>
            // <body>
            //   <div id="root">${HTML}</div>
            //   <script>
            //     var _react = window.framework.PREACT._react;
            //     let h = window.framework.PREACT.h
            //     _react.hydrate(_react.createElement(${component.default.toString()}, {data: ${JSON.stringify(serverCall)}}),document.getElementById("root"));
            //   </script>
            // </body>
            // `;
            //return res.end(hydrateScript);
        } catch (e) {
            console.error(e);
        }


    }

    Object.keys(buildReport)
        .sort((a, b) => {
            if (a === "/index") return -1;
            if (b === "/index") return 1;
            if (a.includes("/:") && !b.includes("/:")) return 1;
            if (!a.includes("/:") && b.includes("/:")) return -1;
            return 0;
        })
        .forEach((pageServerName) => {

            const pageName = pageServerName.replace("/index", "/");

            app.any(pageName, async (res, req) => {
                const path = req.getUrl();
                const exts = path.split(".");
                if (exts.length > 1) {
                    return renderStatic(res, exts, path);
                } else {
                    const isServer = buildReport[pageServerName] === 'server';
                    if (isServer) {
                        return await renderServer(res, pageServerName);
                    }

                    return render(res, req, pageServerName);
                }
            })

            app.get(`${pageServerName}.bundle.js`, (res, req) => {
                const path = req.getUrl();
                const exts = path.split(".");
                return renderStatic(res, exts, path);
            })

            app.get(`${pageServerName}.data.js`, (res, req) => {
                const path = req.getUrl();
                const [pageName] = path.split(".");
                if (buildReport[pageName]) {
                    return renderData(res, pageName);
                } else {
                    return render404(res)
                }
            })
        })

    app.any("/*", async (res, req) => {
        const path = req.getUrl();
        const exts = path.split(".");
        if (exts.length > 1) {
            return renderStatic(res, exts, path);
        } else {
            return render(res, req, path.slice(0, -1));
        }
    })


    const timers = new Map();
    Object.entries(buildReport).forEach(([page, hasData]) => {
        if (hasData || page.includes("/:")) {
            app.ws(page, {
                compression: uws.SHARED_COMPRESSOR,
                maxPayloadLength: 16 * 1024 * 1024,
                idleTimeout: 16,
                open: (ws: uws.WebSocket) => {
                    if (hasData) {
                        const timer = setInterval(() => {
                            if (cachedChange.includes(page)) {
                                ws.send(JSON.stringify({ type: "change", payload: cachedData.get(page) }));
                                const index = cachedChange.indexOf(page);
                                cachedChange.splice(index, 1);
                            }
                        }, 10);

                        timers.set(page, timer);
                    }

                    if (page.includes("/:")) {
                        const params = page.split("/:")[1];
                        ws.send(JSON.stringify({ type: "script", payload: params }));
                    }
                },

                close: (ws, code, message) => {
                    if (hasData && timers.has(page)) {
                        clearInterval(timers.get(page));
                    }
                }
            })
        }
    })

    app.listen(3000, (token) => {
        if (token) {
            console.log("Listening to port 3000");
        } else {
            console.log("Failed to listen to port 3000");
        }
    });
}