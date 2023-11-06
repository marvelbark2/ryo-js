//@ts-ignore
import flamethrower from 'flamethrower-router';

import { Deserializer } from "../utils/serializer"
//exports["PREACT"] = { ...preact, _react: compat };
exports["ROUTER"] = flamethrower({ prefetch: 'visible', log: true, pageTransitions: true });
exports["DESERIALIZE"] = Deserializer;
// @ts-ignore
module.ROUTER = exports["ROUTER"];