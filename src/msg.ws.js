export default {
    // Path: src/msg.ws.js

    open: (ws, req) => {
        console.log("NEW CLIENT on /msg");
    },

    message: (ws, message, isBinary) => { },

    close: (ws, code, message) => {

    }
}