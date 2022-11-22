
import flamethrower from 'flamethrower-router';

//exports["PREACT"] = { ...preact, _react: compat };
exports["ROUTER"] = flamethrower({ prefetch: 'visible', log: true, pageTransitions: true });

// @ts-ignore
module.ROUTER = exports["ROUTER"];