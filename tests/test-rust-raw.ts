let RyoServer: any;

try {
    // Try to load the native module
    RyoServer = require("../native/ryo-server");
} catch (e) {
    console.warn("Rust server module not available, falling back to uWS", e);
    RyoServer = null;
}
if (!RyoServer) {
    throw new Error("Rust server module not available");
}
const server = new RyoServer.RyoServer();

server.get("/ping", (_: any, res: any, req: any) => {
    res.end("pong");
});

server.listen(3000, () => {
    console.log("Rust server listening on http://localhost:3000");
});