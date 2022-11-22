"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (process.env.NODE_ENV === "development") {
    if (window) {
        var eventSource = new EventSource("/ryo_framework");
        eventSource.onmessage = function (e) {
            var data = e.data;
            if (data) {
                console.log("Restarting UI...");
                if (JSON.parse(data).restart) {
                    window.location.reload();
                }
            }
        };
    }
}
//TODO: TO be implemented in the future
exports.default = {
    name: "framework",
};
