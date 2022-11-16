import preact from 'preact';
import compat from 'preact/compat';
const flamethrower = require('flamethrower-router').default;
exports["PREACT"] = { ...preact, _react: compat };
exports["ROUTER"] = flamethrower({ prefetch: 'visible', log: true, pageTransitions: true });
// @ts-ignore
module.PREACT = exports["PREACT"];
// @ts-ignore
module.ROUTER = exports["ROUTER"];
