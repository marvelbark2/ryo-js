"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createObserver() {
    var listeners = [];
    return {
        subscribe: function (listener) {
            listeners.push(listener);
            return function () {
                listeners = listeners.filter(function (l) { return l !== listener; });
            };
        },
        publish: function (event, data) {
            listeners.forEach(function (l) { return l(event, data); });
        },
    };
}
exports.default = createObserver();
