
export default {
    open: (ws, req) => {
        ws.send("Welcome to Echo Server");
    },
    message: (ws, message, isBinary) => {
        // Echo back the message
        const msg = isBinary ? message : Buffer.from(message).toString();
        ws.send(msg, isBinary);
    },
    close: (ws, code, message) => {
        console.log("Closed");
    }
}
