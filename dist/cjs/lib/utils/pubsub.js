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
        publish: function (event) {
            listeners.forEach(function (l) { return l(event); });
        },
    };
}
exports.default = createObserver();
