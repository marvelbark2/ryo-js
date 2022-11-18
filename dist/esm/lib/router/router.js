//@ts-ignore
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
import { useState, useEffect } from 'react';
export default function Router() {
    var _a = useState({
        path: undefined,
        params: {},
        isLoading: true,
        push: function (path) { }
    }), state = _a[0], setState = _a[1];
    useEffect(function () {
        if (document) {
            //@ts-ignore
            var params_1 = window.fetchParams();
            setState(function (p) { return (__assign(__assign({}, p), { params: params_1, isLoading: false, push: function (path) {
                    //@ts-ignore
                    window.framework.ROUTER.go(path);
                    //@ts-ignore
                    setState(function (p) { return (__assign(__assign({}, p), { path: path, params: window.fetchParams() })); });
                }, back: function () {
                    //@ts-ignore
                    window.framework.ROUTER.back();
                    //@ts-ignore
                    setState(function (p) { return (__assign(__assign({}, p), { path: window.location.pathname, params: window.fetchParams() })); });
                } })); });
        }
    }, []);
    return state;
}
