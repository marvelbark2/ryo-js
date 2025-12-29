import { createRustServer } from "../lib/server/adapters/rust-adapter"

const app = createRustServer();

app.get("/ping", (res, req) => {
    res.end("pong");
});

app.listen(3000, () => {
    console.log("Rust server listening on http://localhost:3000");
});