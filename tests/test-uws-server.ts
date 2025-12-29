import { createUWSServer } from "../lib/server/adapters/uws-adapter"

const app = createUWSServer();

app.get("/ping", (res, req) => {
    res.end("pong");
});

app.listen(3000, () => {
    console.log("Rust server listening on http://localhost:3000");
});