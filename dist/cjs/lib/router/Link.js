"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("preact/jsx-runtime");
function Link(props) {
    return (
    //@ts-ignore
    (0, jsx_runtime_1.jsx)("a", __assign({ href: props.href }, { children: props.children })));
}
exports.default = Link;
