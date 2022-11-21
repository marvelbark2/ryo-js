"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//@ts-ignore
var react_1 = require("react");
function EventSignal(source) {
    var _a = (0, react_1.useState)(""), value = _a[0], setValue = _a[1];
    var eventSource = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        if (window) {
            if (!eventSource.current) {
                eventSource.current = new EventSource(source);
            }
            eventSource.current.onmessage = function (event) {
                setValue(event.data);
            };
        }
        return function () {
            if (window)
                eventSource.current.close();
        };
    }, []);
    return value;
}
exports.default = EventSignal;
