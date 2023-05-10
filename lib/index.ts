import * as uws from "uWebSockets.js";
import { AbstractRender, EventStreamHandler, RenderAPI, RenderData, RenderEvent, RenderGraphQL, RenderPage, RenderProps, RenderServer, RenderStatic } from "./runtime/render";
import { join } from "path";
import { existsSync } from 'fs';
import ps from "./utils/pubsub";

import babelRegister from "@babel/register";


import "./polyfills/index";

import { getPages } from "./utils/page";
import { Serializer } from "./utils/serializer";
import logger from "./utils/logger";

import { buildSchema, parse as gqlParser, subscribe } from "graphql";
import { getAsyncValue } from "./utils/global";



let uwsToken: uws.us_listen_socket | null;
const requireCaches = new Set<string>()
const shouldRestart: string[] = [];

const pwd = process.cwd();


function getMiddleware() {
    const path = ".ssr/output/middleware.js";
    const middlewarePath = join(pwd, path);

    if (existsSync(middlewarePath)) {
        const middleware = require(middlewarePath);
        return middleware.default ? middleware.default : middleware;
    } else {
        return (_req: any, _res: any, next: any) => next();
    }
}

// TODO: Convert renders to abstracted classes
export default function server(env = "production") {
    babelRegister({
        presets: ["preact", "@babel/preset-env"],
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        cache: true,
        compact: true,
    });
    const _require = require;

    shouldRestart.push("N");

    const app = uws.App();


    const buildReport = _require(join(pwd, ".ssr", "build-report.json"));
    const isStatic = new Map();




    const getRenderProps = (res: uws.HttpResponse, req: uws.HttpRequest, path = ""): RenderProps => {
        return {
            req, res, buildReport,
            pathname: path || req.getUrl(),
            isDev: process.env.NODE_ENV === "development",
        }
    }


    const x = Object.keys(buildReport)
        .sort((a, b) => {
            if (a === "/index") return -1;
            if (b === "/index") return 1;
            if (a.includes("/:") && !b.includes("/:")) return 1;
            if (!a.includes("/:") && b.includes("/:")) return -1;
            return a.split("/").length - b.split("/").length;
        });



    const changePageToRoute = (page: string) => {
        const route = page.replace("/index", "")
        return route.length > 1 ? route : "/";
    }

    const middlewareFn = getMiddleware();

    x.forEach((pageServerName) => {
        const filePath = join(pwd, ".ssr", "output", "static", `${pageServerName}.html`)
        const page = pageServerName.replace("/index", "/");

        const isPage = existsSync(filePath);
        const isServer = buildReport[pageServerName] === 'server';
        const isApi = buildReport[pageServerName] === 'api';
        const isEvent = buildReport[pageServerName] === 'event';
        const isCron = buildReport[pageServerName] === 'cron';
        const isQGL = buildReport[pageServerName] === 'graphql';

        isStatic.set(pageServerName, isPage);

        if (isQGL) {
            const filePath = join(AbstractRender.PWD, ".ssr", "output", "server", `${page}.js`);
            const gqlModule = require(filePath);

            if (gqlModule) {
                const gqlObject = gqlModule.default ? gqlModule.default : gqlModule;
                if (gqlObject) {
                    app.ws(page, {
                        compression: uws.SHARED_COMPRESSOR,
                        maxPayloadLength: 16 * 1024 * 1024,
                        idleTimeout: 16,

                        message: async (ws, message, isBinary) => {
                            const data = Buffer.from(message).toString();
                            const parsed = JSON.parse(data);

                            if (parsed.type === "connection_init") {
                                // Handle connection initiation
                                ws.send(JSON.stringify({ type: "connection_ack" }));

                            } else if (parsed.type === "start") {
                                // Handle GraphQL subscription start
                                const { query, variables, operationName } = parsed.payload;

                                const schema = gqlObject.schema;
                                const execSchema = typeof schema === "string" ? buildSchema(schema) : await getAsyncValue(schema);

                                const resultIterator: any = await subscribe({
                                    schema: execSchema,
                                    document: gqlParser(query),
                                    contextValue: gqlObject.context,
                                    variableValues: variables,
                                    operationName,
                                    rootValue: gqlObject.resolvers,
                                });

                                for await (const result of resultIterator) {
                                    ws.send(
                                        JSON.stringify({
                                            type: "data",
                                            id: parsed.id,
                                            payload: result,
                                        })
                                    );
                                }

                            }
                        }
                    })
                }
            }
        }


        const pageName = changePageToRoute(pageServerName);


        if (isServer) {
            app.any(pageName, (res, req) => {
                return middlewareFn(req, res, () => new RenderServer(getRenderProps(res, req, pageServerName)))
            });
        } else if (isEvent) {
            app.get(pageName, (res, req) => {
                return middlewareFn(req, res, () => new RenderEvent(getRenderProps(res, req, pageServerName)));
            })
        } else if (isCron) {
            app.get(pageName, (res, req) => {
                return new RenderEvent(getRenderProps(res, req, pageServerName))
            })
        } else if (isQGL) {
            app.any(pageName, (res, req) => {
                return middlewareFn(
                    req, res, () => new RenderGraphQL(getRenderProps(res, req, pageServerName))
                )
            });

        } else if (isApi || !isPage) {
            app.any(pageName, (res, req) => {
                return middlewareFn(
                    req, res, () => new RenderAPI(getRenderProps(res, req, pageServerName))
                )
            })
        } else if (isPage) {
            app.get(pageName, (res, req) => {
                return middlewareFn(
                    req, res,
                    () => {
                        const path = req.getUrl();
                        if (!(path.endsWith(".bundle.js") || path.endsWith(".data.js"))) {
                            return new RenderPage(getRenderProps(res, req, filePath));
                        } else {
                            return new RenderStatic(getRenderProps(res, req, pageServerName));
                        }
                    }
                )
            });
            app.get(`${pageServerName}.bundle.js`, (res, req) => {
                return middlewareFn(
                    req, res,
                    () => {
                        if (env === "production") {
                            //  cachingBundles(res);
                        }
                        return new RenderStatic(getRenderProps(res, req, pageServerName));

                    }
                )
            })

            app.get(`${pageServerName}.data.js`, (res, req) => {
                return middlewareFn(req, res, () => {
                    const path = req.getUrl();
                    const [pageName] = path.split(".");
                    if (buildReport[pageName]) {
                        return new RenderData(getRenderProps(res, req, pageServerName));
                    } else {
                        throw new Error("404");
                    }
                })
            })
        } else {
            app.get(pageName, (res, req) => {
                return middlewareFn(req, res, () => new RenderStatic(getRenderProps(res, req, pageServerName)));

            })
        }
        app.get(`${pageName}/`, (res) => {
            res.writeStatus('302')
            res.writeHeader('location', pageName)
            res.end()
        });


    })

    app.get("/*", async (res, req) => {
        return middlewareFn(req, res, () => new RenderStatic(getRenderProps(res, req)));
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
                    throw new Error(`File: ${pageName} | You need to export a default object with open, message, drain, and close methods`);
                }
            })
        }

    }

    loadWSEndpoints();

    const subscriptions = new Map();
    Object.entries(buildReport)
        .forEach(([page, hasData]) => {
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
            logger.info("Listening to port 3000");
        } else {
            logger.error("Failed to listen to port 3000");
        }
    });


    return () => {
        if (uwsToken) {
            logger.debug('Shutting down now');
            uws.us_listen_socket_close(uwsToken);
            AbstractRender.ClearCache()
            uwsToken = null;
        }
    }
}