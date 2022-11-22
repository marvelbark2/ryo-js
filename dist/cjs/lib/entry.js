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
exports.Wrapper = void 0;
var jsx_runtime_1 = require("preact/jsx-runtime");
var hooks_1 = require("preact/hooks");
var EntryClient = function (_a) {
    var children = _a.children, id = _a.id;
    (0, hooks_1.useEffect)(function () {
        console.log("🚀 ~ file: entry.tsx ~ line 6 ~ useEffect ~ useEffect", hooks_1.useEffect);
    }, []);
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { children: "WRAPPED " }), (0, jsx_runtime_1.jsx)("div", __assign({ id: id }, { children: children }))] }));
};
var Wrapper = function (props) {
    var Parent = props.Parent, Child = props.Child, id = props.id;
    return ((0, jsx_runtime_1.jsx)(Parent, { children: (0, jsx_runtime_1.jsx)("span", __assign({ id: id }, { children: Child })) }));
};
exports.Wrapper = Wrapper;
exports.default = EntryClient;
