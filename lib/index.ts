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
import crypto from "crypto";
import { changePageToRoute, getAsyncValue, getMiddleware, getMiddlewareInitMode, isEndsWith, loadConfig } from "./utils/global";

import { pathToRegexp, match } from "path-to-regexp"
import { isAuth, sessionPassword } from "./utils/security";

let uwsToken: uws.us_listen_socket | null;
const requireCaches = new Set<string>()
const shouldRestart: string[] = [];

const pwd = process.cwd();

const globalContext: Map<string, any> = new Map();

interface ClassType<T extends AbstractRender> {
    new(args: RenderProps): T
}

type RenderType = {
    clazz: ClassType<any>,
    path: string,
}
const paths = new Map<string, RenderType>();

export default async function server(env = "production") {
    babelRegister({
        presets: ["preact", "@babel/preset-env"],
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        cache: true,
        compact: true,
    });
    const _require = require;

    shouldRestart.push("N");

    const app = uws.App();

    const ryoConfig = await loadConfig()

    const buildReport = _require(join(pwd, ".ssr", "build-report.json"));
    const buildOfflineReport = _require(join(pwd, ".ssr", "build-offline-report.json"));

    const isStatic = new Map();

    const subdomainsInfo = new Map<string, (RenderType & { route: string })[]>();

    const isSubdomains = ryoConfig.subdomain && typeof ryoConfig.subdomain?.baseHost === "string";

    const baseHost = ryoConfig.subdomain?.baseHost;
    const isSecureContext = typeof ryoConfig.security !== "undefined";


    const handleAuth = (req: uws.HttpRequest, res: uws.HttpResponse, next: any) => {
        if (isSecureContext && ryoConfig.security) {
            const loginPath = ryoConfig.security.loginPath || "/login";
            const authorizeHttpRequests = ryoConfig.security.authorizeHttpRequests;
            const path = req.getUrl() as string;
            if ((ryoConfig.security?.sessionManagement?.sessionCreationPolicy || "ifRequired") !== "stateless") {
                const session = (req.getHeader('cookie')).match(new RegExp(`(^|;)\\s*${"SESSION"}\\s*=\\s*([^;]+)`))?.[2]
                if (session) {
                    const encryptPass = crypto.createHash("sha1")
                        .update(sessionPassword.password)
                        .digest("hex");
                    if (session === encryptPass) {
                        res.authContext = {
                            id: 1
                        };
                    }
                }
            }
            if (!authorizeHttpRequests || authorizeHttpRequests.length === 0) {
                if (path === loginPath) {
                    return next(req, res);
                } else {
                    return res.writeStatus("301").writeHeader("Location", loginPath).end();
                }
            } else {
                res.onAborted(() => {
                    res.aborted = true;
                })
                for (let index = 0; index < authorizeHttpRequests.length; index++) {
                    const authorizeHttpRequest = authorizeHttpRequests[index];
                    const match = pathToRegexp(authorizeHttpRequest.path).exec(path);
                    //console.log("match", match, authorizeHttpRequest.path, path);
                    if (match) {
                        if ("status" in authorizeHttpRequest) {
                            const status = authorizeHttpRequest.status;
                            if (status === "allow") {
                                return next(req, res);
                            } else if (status === "deny") {
                                return res.writeStatus("403 Forbidden").end();
                            } else if (isAuth(res) && status === "auth") {
                                return next(req, res);
                            } else if (!isAuth(res)) {
                                return res.writeStatus("301").writeHeader("Location", loginPath).end();

                            } else {
                                return res.writeStatus("403 Forbidden").end();
                            }
                        } else if ("roles" in authorizeHttpRequest && isAuth(res)) {
                            const roles = authorizeHttpRequest.roles;
                            if (roles.length === 0) {
                                throw new Error("roles must be an array of string");
                            } else {
                                if (isAuth(res) && roles.includes(res.authContext?.role)) {
                                    return next(req, res);
                                } else {
                                    return res.writeStatus("403 Forbidden").end();
                                }
                            }
                        } else {
                            return res.writeStatus("301").writeHeader("Location", loginPath).end();
                        }
                    }
                }

                if ((path === loginPath) || isAuth(res)) {
                    next(req, res);
                } else {
                    return res.writeStatus("301").writeHeader("Location", loginPath).end();
                }
            }

        }
    }

    const authFilter = (req: uws.HttpRequest, res: uws.HttpResponse, next: any) => {
        if (ryoConfig.security && ryoConfig.security?.filter) {
            const filter = ryoConfig.security.filter;
            if (filter.length === 0) {
                return handleAuth(req, res, next);
            } else {
                const setAuthContext = (authContext: any) => {
                    res.authContext = authContext;
                }
                const doFilter = (index: number) => {
                    if (index >= filter.length) {
                        return handleAuth(req, res, next);
                    } else {
                        filter[index]
                            .doFilter(req, res, setAuthContext, () => doFilter(index + 1))
                    }
                }
                doFilter(0);
            }
        } else {
            handleAuth(req, res, next);
        }
    }
    const handleSubdomains = (req: any, res: any, next: any) => {
        if (isSubdomains && baseHost) {
            const host = req.getHeader("host");
            if (!host) return true;

            const hostname = host.split("." + baseHost)[0];

            if (!hostname || !subdomainsInfo.has(hostname)) return true;

            const path = req.getUrl() as string;

            const routes = subdomainsInfo.get(hostname);
            if (!routes) return true;


            const page = routes.find((page) => {
                const vPath = page.route.replace("/" + hostname, "");
                const paReg = pathToRegexp(vPath);
                return paReg.test(path)
            })

            if (page) {
                const regexpMatcher = match(page.route);
                const regParams = regexpMatcher(path);
                let params: object | undefined = undefined
                if (regParams) {
                    params = regParams.params
                }


                return next(req, res, () => new page.clazz(getRenderProps(res, req, page.path, params))
                )
            } else {
                if (path.includes(".")) {
                    return next(req, res, () => new RenderStatic(getRenderProps(res, req)))

                } else {
                    const error = "404";
                    const pathname = path;
                    const err = new Error("Not Found");
                    return next(
                        req,
                        res,
                        () => {
                            res.fetched = true
                            res.writeStatus(`${error} Error`);
                            res.end(`${error} Error - page: ${pathname}`);
                        },
                        {
                            errorCode: error,
                            pathname,
                            error: err
                        }
                    )
                }
            }
        } else {
            return true
        }
    }


    const middleware = getMiddleware()

    const middlewareFn = (req: any, res: any, next: () => any) => {
        res.rewrites = rewrites;

        if (isSubdomains) {
            if (isSecureContext && ryoConfig.security) {
                authFilter(
                    req,
                    res,
                    () => {
                        const f = handleSubdomains(req, res, (req: any, res: any, next: () => void) => middleware(req, res, next))
                        if (f)
                            return middleware(req, res, next)
                    }
                )
            } else {
                const f = handleSubdomains(req, res, (req: any, res: any, next: () => void) => middleware(req, res, next))
                if (f)
                    return middleware(req, res, next)
            }

        } else {
            if (isSecureContext && ryoConfig.security) {
                authFilter(req, res, next);
            } else {
                return middleware(req, res, next)
            }
        }
    }


    const getRenderProps = (res: uws.HttpResponse, req: uws.HttpRequest, path = "", params?: any): RenderProps => {
        return {
            req, res, buildReport,
            pathname: path || req.getUrl(),
            isDev: (process.env.NODE_ENV === "development") || (env === "dev"),
            context: globalContext,
            params: params
        }
    }

    function rewrites({ req, res }: { req: uws.HttpRequest, res: uws.HttpResponse }, { path, params, withStatic }: { path: string, params?: Record<string, string>, withStatic?: boolean }) {
        const p = changePageToRoute(params && path.includes("/:") ? Object.keys(params).reduce((acc, key) => {
            return acc.replace(`:${key}`, params[key]);
        }, path) : path);

        if (withStatic) {
            const url = req.getUrl();
            const pStatic = join(pwd, ".ssr", "output", "static", url);

            if (existsSync(pStatic) && !url.endsWith(".data.js") && isEndsWith([".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".woff", ".woff2", ".ttf", ".eot", ".otf"], url)) {
                res.rewriteFrom = url;
                req.getUrl = () => url;
                return new RenderStatic(getRenderProps(res, req, url));
            } else {
                const page = paths.get(changePageToRoute(path));

                if (page) {
                    req.getUrl = () => p;
                    res.rewriteFrom = p;
                    return new page.clazz(getRenderProps(res, req, page.path));
                } else {
                    res.rewriteFrom = p;
                    req.getUrl = () => p;

                    return new RenderStatic(getRenderProps(res, req, p));
                }
            }
        } else {
            const page = paths.get(changePageToRoute(path));
            if (page) {
                req.getUrl = () => p;
                res.rewriteFrom = p;
                return new page.clazz(getRenderProps(res, req, page.path));
            } else {
                res.rewriteFrom = p;
                req.getUrl = () => p;

                return new RenderStatic(getRenderProps(res, req, p));
            }
        }

    }

    const subdomains: {
        path: string,
        type: string
    }[] = [];
    const x = Object.keys(buildReport)
        .filter((p) => {
            const isDomain = p.startsWith("/_subdomains");
            if (isDomain) {
                subdomains.push({
                    path: p,
                    type: buildReport[p]
                });
            }
            return !isDomain;
        })
        .sort((a, b) => {
            if (a === "/index") return -1;
            if (b === "/index") return 1;
            if (a.includes(":/") && !b.includes("/:")) return 1;
            if (!a.includes(":/") && b.includes("/:")) return -1;
            return a.split("/").length - b.split("/").length;
        });

    if (isSubdomains) {
        subdomains.forEach(({ path, type }) => {
            const pageServerName = path.replace("/_subdomains", "");

            const sub = pageServerName.split("/")[1];
            const filePath = join(pwd, ".ssr", "output", "static", `${path}.html`)
            const page = pageServerName.replace("/index", "/");
            const isPage = existsSync(filePath);

            const isServer = type === 'server';
            const isApi = type === 'api';
            const isEvent = type === 'event';
            const isCron = type === 'cron';
            const isQGL = type === 'graphql';

            isStatic.set(path, isPage);

            // if (isQGL) {
            //     const filePath = join(AbstractRender.PWD, ".ssr", "output", "server", `${page}.js`);
            //     const gqlModule = require(filePath);

            //     if (gqlModule) {
            //         const gqlObject = gqlModule.default ? gqlModule.default : gqlModule;
            //         if (gqlObject) {
            //             app.ws(page, {
            //                 compression: uws.SHARED_COMPRESSOR,
            //                 maxPayloadLength: 16 * 1024 * 1024,
            //                 idleTimeout: 16,

            //                 message: async (ws, message, isBinary) => {
            //                     const data = Buffer.from(message).toString();
            //                     const parsed = JSON.parse(data);

            //                     if (parsed.type === "connection_init") {
            //                         // Handle connection initiation
            //                         ws.send(JSON.stringify({ type: "connection_ack" }));

            //                     } else if (parsed.type === "start") {
            //                         // Handle GraphQL subscription start
            //                         const { query, variables, operationName } = parsed.payload;

            //                         const schema = gqlObject.schema;
            //                         const execSchema = typeof schema === "string" ? buildSchema(schema) : await getAsyncValue(schema);

            //                         const resultIterator: any = await subscribe({
            //                             schema: execSchema,
            //                             document: gqlParser(query),
            //                             contextValue: gqlObject.context,
            //                             variableValues: variables,
            //                             operationName,
            //                             rootValue: gqlObject.resolvers,
            //                         });

            //                         for await (const result of resultIterator) {
            //                             ws.send(
            //                                 JSON.stringify({
            //                                     type: "data",
            //                                     id: parsed.id,
            //                                     payload: result,
            //                                 })
            //                             );
            //                         }

            //                     }
            //                 }
            //             })
            //         }
            //     }
            // }

            const pageName = changePageToRoute(pageServerName);

            const subInfo: RenderType & { route: string } = {
                path: "",
                route: pageName,
                clazz: RenderStatic
            }
            if (isServer) {
                paths.set(pageName, {
                    clazz: RenderServer,
                    path: path,
                });

                subInfo.path = "_subdomains" + path;
                subInfo.clazz = RenderServer;
            } else if (isEvent) {
                paths.set(pageName, {
                    clazz: RenderEvent,
                    path: pageServerName,
                });

                subInfo.path = "_subdomains" + pageServerName;
                subInfo.clazz = RenderEvent;
            } else if (isCron) {
                paths.set(pageName, {
                    clazz: RenderEvent,
                    path: pageServerName,
                });

                subInfo.path = pageServerName;
                subInfo.clazz = RenderEvent;
            } else if (isQGL) {
                paths.set(pageName, {
                    clazz: RenderGraphQL,
                    path: pageServerName,
                });

                subInfo.path = pageServerName;
                subInfo.clazz = RenderGraphQL;
            } else if (isApi || !isPage) {
                paths.set(pageName, {
                    clazz: RenderAPI,
                    path: pageServerName,
                });

                subInfo.path = "_subdomains" + pageServerName;
                subInfo.clazz = RenderAPI;
            } else if (isPage) {
                paths.set(pageName, {
                    clazz: RenderPage,
                    path: filePath,
                });

                subInfo.path = filePath;
                subInfo.clazz = RenderPage;

                paths.set(`${pageServerName}.data.js`, {
                    clazz: RenderData,
                    path: pageServerName,
                });
            }
            // else {
            //     app.get(pageName, (res, req) => {
            //         return middlewareFn(req, res, () => new RenderStatic(getRenderProps(res, req, pageServerName)));
            //     })
            // }

            if (subdomainsInfo.has(sub)) {
                (subdomainsInfo.get(sub) ?? []).push(subInfo);
            } else {
                subdomainsInfo.set(sub, [subInfo]);
            }
        })
    }
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
            paths.set(pageName, {
                clazz: RenderServer,
                path: pageServerName,
            });
            app.any(pageName, (res, req) => {
                return middlewareFn(req, res, () => new RenderServer(getRenderProps(res, req, pageServerName)))
            });
        } else if (isEvent) {
            paths.set(pageName, {
                clazz: RenderEvent,
                path: pageServerName,
            });
            app.get(pageName, (res, req) => {
                return middlewareFn(req, res, () => new RenderEvent(getRenderProps(res, req, pageServerName)));
            })
        } else if (isCron) {
            paths.set(pageName, {
                clazz: RenderEvent,
                path: pageServerName,
            });
            app.get(pageName, (res, req) => {
                return new RenderEvent(getRenderProps(res, req, pageServerName))
            })
        } else if (isQGL) {
            paths.set(pageName, {
                clazz: RenderGraphQL,
                path: pageServerName,
            });
            app.any(pageName, (res, req) => {
                return middlewareFn(
                    req, res, () => new RenderGraphQL(getRenderProps(res, req, pageServerName))
                )
            });

        } else if (isApi || !isPage) {
            paths.set(pageName, {
                clazz: RenderAPI,
                path: pageServerName,
            });
            app.any(pageName, (res, req) => {
                return middlewareFn(
                    req, res, () => new RenderAPI(getRenderProps(res, req, pageServerName))
                )
            })
        } else if (isPage) {
            if (!pageName.includes("/_errors/")) {
                paths.set(pageName, {
                    clazz: RenderPage,
                    path: filePath,
                });
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
            }

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

            paths.set(`${pageServerName}.data.js`, {
                clazz: RenderData,
                path: pageServerName,
            });
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

        const pageWithoutSlash = pageServerName.slice(1)

        if (buildOfflineReport.includes(pageWithoutSlash)) {
            app.get(`/offline-service-${pageWithoutSlash}`, (res) => {
                const SCRIPT = `
                
                const OFFLINE_VERSION = "${pageWithoutSlash}";
                const CACHE_NAME = "${pageWithoutSlash}.offline";
                const OFFLINE_URL = CACHE_NAME + ".html";
                const OFFLINE_URL_JS = CACHE_NAME + ".js"
                
                self.addEventListener("install", (event) => {
                    event.waitUntil(
                        (async () => {
                            const cachePage = await caches.open(CACHE_NAME + ".page");
                            await cachePage.add(new Request(OFFLINE_URL, { cache: "reload" }));

                            const cacheJs = await caches.open(CACHE_NAME + ".javascript");
                            await cacheJs.add(new Request(OFFLINE_URL_JS, { cache: "reload" }));
                        })()
                    );
                    self.skipWaiting();
                });
                
                self.addEventListener("activate", (event) => {
                    event.waitUntil(
                        (async () => {
                            if ("navigationPreload" in self.registration) {
                                await self.registration.navigationPreload.enable();
                            }
                        })()
                    );
                
                    self.clients.claim();
                });
                
                self.addEventListener("fetch", (event) => {
                    if (event.request.mode === "navigate") {
                        event.respondWith(
                            (async () => {
                                try {
                                    const preloadResponse = await event.preloadResponse;
                                    if (preloadResponse) {
                                        return preloadResponse;
                                    }
                
                                    const networkResponse = await fetch(event.request);
                                    return networkResponse;
                                } catch (error) {
                                    console.log("Fetch failed; returning offline page instead.", error);
                                    
                                    const destination = event.request.destination;
                                    if(destination === "document") {
                                        const cache = await caches.open(CACHE_NAME + ".page");
                                        const cachedResponse = await cache.match(OFFLINE_URL);
                                        return cachedResponse;
                                    } else {
                                        const cache = await caches.open(CACHE_NAME + ".javascript");
                                        const cachedResponse = await cache.match(OFFLINE_URL_JS);
                                        return cachedResponse;  
                                    }
                                }
                            })()
                        );
                    }
                });
                `
                res.writeHeader("Content-Type", "text/javascript");
                res.end(SCRIPT);
            });
        }

    })

    app.get("/*", async (res, req) => {
        // const ps = x.filter((x) => x.includes(":"))
        // if (ps.length < 0) {
        //     const path = req.getUrl();
        //     const pageName = ps.find((x) => pathToRegexp(x).test(path));

        //     if (pageName) {
        //         const page = paths.get(pageName);
        //         if (page) {
        //             const regexpMatcher = match(pageName);
        //             const regParams = regexpMatcher(path);
        //             let params: object | undefined = undefined
        //             if (regParams) {
        //                 params = regParams.params
        //             }
        //             return middlewareFn(req, res, () => new page.clazz(getRenderProps(res, req, page.path, params)));
        //         }
        //         return middlewareFn(req, res, () => new RenderStatic(getRenderProps(res, req)));
        //     }
        //     return middlewareFn(req, res, () => new RenderStatic(getRenderProps(res, req)));
        // } else {
        //     return middlewareFn(req, res, () => new RenderStatic(getRenderProps(res, req)));
        // }
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


    const port = ryoConfig.port || process.env.PORT || 3000;


    if (isSecureContext) {
        if (ryoConfig.security && !ryoConfig.security.authProvider) {
            sessionPassword.password = Math.random().toString(36).slice(-8);
            logger.info(`Session password: ${sessionPassword.password}`);
        }
        const sessionCreationPolicy = ryoConfig.security?.sessionManagement?.sessionCreationPolicy || "always";
        app.post(`${ryoConfig.security?.loginPath || "/login"}`, async (res, req) => {
            res.onAborted(() => {
                res.aborted = true;
            });
            const contentType = req.getHeader("content-type");
            const o = await new Promise((resolve) => {
                RenderAPI.readJson(contentType, res, (o: any) => {
                    resolve(o);
                }, (e: any) => {
                    console.log({ e })
                    res.writeStatus("401 Unauthorized").end("Bad credentials");
                });
            })

            const { username, password } = o as any;

            if (username === "user" && password === sessionPassword.password) {
                if (sessionCreationPolicy !== "stateless") {
                    const token = crypto.createHash("sha1")
                        .update(sessionPassword.password)
                        .digest("hex");
                    res.writeHeader("Set-Cookie", `SESSION=${token}; SameSite=Strict; Path=/; Max-Age=86400`)
                        .writeStatus("200 OK")
                        .end("OK");
                }
            } else {
                res.writeStatus("401 Unauthorized").end("Bad credentials");
            }

        })
    }
    app.listen(+port, (token) => {
        if (token) {
            const initFn = getMiddlewareInitMode();

            if (typeof initFn === "function") {
                initFn({
                    context: globalContext
                });
            }
            uwsToken = token;
            logger.info("Listening to port " + port);
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

