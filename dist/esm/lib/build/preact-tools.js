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
import preact from 'preact';
import compat from 'preact/compat';
var flamethrower = require('flamethrower-router').default;
exports["PREACT"] = __assign(__assign({}, preact), { _react: compat });
exports["ROUTER"] = flamethrower({ prefetch: 'visible', log: true, pageTransitions: true });
// @ts-ignore
module.PREACT = exports["PREACT"];
// @ts-ignore
module.ROUTER = exports["ROUTER"];
