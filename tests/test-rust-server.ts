import { createRustServer } from "../lib/server/adapters/rust-adapter"

const app = createRustServer();

app.get("/ping", (res) => {
    res.end("pong");
});

app.listen(3000, (address) => {
    console.log(`Rust server listening on http://${address}`);
});