const preact = require('preact');
const compat = require('preact/compat');
const flamethrower = require('flamethrower-router').default;

exports["PREACT"] = { ...preact, _react: compat };
exports["ROUTER"] = flamethrower({ prefetch: 'visible', log: true, pageTransitions: true });
module.PREACT = exports["PREACT"];
module.ROUTER = exports["ROUTER"];