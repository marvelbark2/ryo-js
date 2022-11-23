import * as uws from "uWebSockets.js";
import { AbstractRender, EventStreamHandler, RenderAPI, RenderData, RenderEvent, RenderProps, RenderServer, RenderStatic, Streamable } from "./runtime/render";
import { join } from "path";
import { createReadStream, existsSync, statSync } from 'fs';
import ps from "./utils/pubsub";

import babelRegister from "@babel/register";


import "./polyfills/index";

import { getPages } from "./utils/page";
import { Serializer } from "./utils/serializer";


let uwsToken: uws.us_listen_socket | null;
const requireCaches = new Set<string>()
const shouldRestart: string[] = [];

// TODO: Convert renders to abstracted classes
export default function server(env = "production") {
    babelRegister({
        presets: ["preact", "@babel/preset-env"],
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        cache: true,
        compact: true,
    });
    const _require = require;
    const pwd = process.cwd();

    shouldRestart.push("N");

    const app = uws.App();


    const buildReport = _require(join(pwd, ".ssr", "build-report.json"));
    const isStatic = new Map();




    const getRenderProps = (res: uws.HttpResponse, req: uws.HttpRequest, path = ""): RenderProps => {
        return {
            req, res, buildReport,
            pathname: path,
            isDev: process.env.NODE_ENV === "development",
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
            const filePath = join(pwd, ".ssr", "output", "static", `${pageServerName}.html`)
            const page = pageServerName.replace("/index", "/");

            const isPage = existsSync(filePath);
            const isServer = buildReport[pageServerName] === 'server';
            const isApi = buildReport[pageServerName] === 'api';
            const isEvent = buildReport[pageServerName] === 'event';

            isStatic.set(pageServerName, isPage);

            const pageRouters = new Set([page, (page + "/").replace("//", "/")]);
            let bundleAdded = false;
            pageRouters.forEach((pageName) => {
                if (isServer) {
                    app.any(pageName, (res, req) => {
                        return new RenderServer(getRenderProps(res, req, pageServerName))
                    });
                } else if (isEvent) {
                    app.get(pageName, (res, req) => {
                        return new RenderEvent(getRenderProps(res, req, pageServerName))
                    })
                } else if (isApi || !isPage) {
                    app.any(pageName, (res, req) => {
                        const path = req.getUrl();
                        const isStaticFile = existsSync(join(pwd, ".ssr", "output", "static", path));
                        if (isStaticFile) {
                            return new RenderStatic(getRenderProps(res, req, pageServerName));
                        } else {
                            return new RenderAPI(getRenderProps(res, req, pageServerName));
                        }
                    })
                } else if (isPage) {
                    app.get(pageName, (res, req) => {
                        const path = req.getUrl();
                        if (!(path.endsWith(".bundle.js") || path.endsWith(".data.js"))) {
                            const streamable = new Streamable(getRenderProps(res, req, pageServerName));
                            const stream = createReadStream(filePath);
                            const size = statSync(filePath).size;
                            return streamable.pipeStreamOverResponse(res, stream, size);
                        } else {
                            return new RenderStatic(getRenderProps(res, req, pageServerName));

                        }
                    });
                    if (!bundleAdded) {
                        app.get(`${pageServerName}.bundle.js`, (res, req) => {
                            if (env === "production") {
                                //  cachingBundles(res);
                            }
                            return new RenderStatic(getRenderProps(res, req, pageServerName));
                        })

                        app.get(`${pageServerName}.data.js`, (res, req) => {
                            const path = req.getUrl();
                            const [pageName] = path.split(".");
                            if (buildReport[pageName]) {
                                return new RenderData(getRenderProps(res, req, pageServerName));
                            } else {
                                throw new Error("404");
                            }
                        })
                        bundleAdded = true;
                    }
                } else {
                    app.any(pageName, (res, req) => {
                        return new RenderStatic(getRenderProps(res, req, pageServerName));
                    })
                }

            })
        })

    app.any("/*", async (res, req) => {
        return new RenderStatic(getRenderProps(res, req));
    })

    function loadWSEndpoints() {
        const wsPath = join(pwd, ".ssr", "output", "server", "ws");
        const isExist = existsSync(wsPath);
        if (isExist) {
            const files = getPages(wsPath, join);
            files.forEach(async (file) => {
                requireCaches.add(file);
                const fileName = file.split("/server/ws/");
                const pageName = fileName[1].split(".ws.js")[0];
                const object = _require(file).default;
                if (object) {
                    app.ws(`/${pageName}`, {
                        compression: uws.SHARED_COMPRESSOR,
                        maxPayloadLength: 16 * 1024 * 1024,
                        idleTimeout: 16,
                        open: object.open,
                        message: object.message,
                        drain: object.drain,
                        close: object.close
                    });
                } else {
                    throw new Error(`File: ${pageName} | ` + "You need to export a default object with open, message, drain, and close methods");
                }
            })
        } else {
            console.log("No ws endpoints found");
        }

    }

    loadWSEndpoints();

    const subscriptions = new Map();
    Object.entries(buildReport).forEach(([page, hasData]) => {
        if (hasData || page.includes("/:")) {
            app.ws(`${page}.data`, {
                compression: uws.SHARED_COMPRESSOR,
                maxPayloadLength: 16 * 1024 * 1024,
                idleTimeout: 16,
                open: (ws: uws.WebSocket) => {
                    if (hasData) {
                        const unsub = ps.subscribe((msg, data) => {
                            if (msg === `fetch-${page}` && data) {
                                const serialize = new Serializer(data);
                                ws.send(JSON.stringify({ type: "change", payload: serialize.toJSON() }));
                            }
                        })

                        subscriptions.set(page, unsub);
                    }

                    if (page.includes("/:")) {
                        const params = page.split("/:")[1];
                        ws.send(JSON.stringify({ type: "script", payload: params }));
                    }
                },

                close: (ws, code, message) => {
                    if (hasData && subscriptions.has(page)) {
                        const fn = subscriptions.get(page);
                        if (typeof fn === "function") {
                            fn();
                        }
                    }
                }
            })
        }
    })


    if (process.env.NODE_ENV === "development" || env === "dev") {
        app.get("/ryo_framework", (res) => {
            const eventStreamHandler = new EventStreamHandler(res);
            eventStreamHandler.handle(
                (sendData) => {
                    return ps.subscribe((msg) => {
                        if (msg === "refresh" && shouldRestart.length > 0) {
                            shouldRestart.pop();
                            return sendData({ restart: true })

                        }
                    });
                },
                (unsub) => {
                    unsub();
                }
            )
        })
    }

    app.listen(3000, (token) => {
        if (token) {
            uwsToken = token;
            console.log("Listening to port 3000");
        } else {
            console.log("Failed to listen to port 3000");
        }
    });


    return () => {
        if (uwsToken) {
            console.log('Shutting down now');
            uws.us_listen_socket_close(uwsToken);
            AbstractRender.ClearCache()
            uwsToken = null;
        }
    }
}