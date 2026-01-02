import type { RyoServer } from "../native/ryo-server"

let RyoServerInstance: { RyoServer: typeof RyoServer } | null = null;

try {
    // Try to load the native module
    RyoServerInstance = require("../native/ryo-server");
} catch (e) {
    console.warn("Could not load Rust server module:", e);
    RyoServerInstance = null;
}
if (!RyoServerInstance) {
    throw new Error("Rust server module not available");
}
const server = new RyoServerInstance.RyoServer();

server.get("/ping", (_: any, res: any) => {
    res.end("pong");

});

server.listen(3000, (_: any, url: string) => {
    console.log(`Rust server listening on http://${url}`);
});