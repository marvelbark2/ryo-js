"use strict";
exports.__esModule = true;
var node_fetch_1 = require("node-fetch");
//@ts-ignore
if (!globalThis.fetch) {
    //@ts-ignore
    globalThis.fetch = node_fetch_1["default"];
    //@ts-ignore
    globalThis.Headers = node_fetch_1.Headers;
    //@ts-ignore
    globalThis.Request = node_fetch_1.Request;
    //@ts-ignore
    globalThis.Response = node_fetch_1.Response;
}
