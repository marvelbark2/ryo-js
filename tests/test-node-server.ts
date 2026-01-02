import { createNodeServer } from "../lib/server/adapters/node-adapter"

const app = createNodeServer();

app.get("/ping", (res) => {
    res.cork(() => {
        res.end("pong");
    })
});

app.listen(3000, () => {
    console.log("Node server listening on http://localhost:3000");
});