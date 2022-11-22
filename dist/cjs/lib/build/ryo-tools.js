"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var flamethrower_router_1 = __importDefault(require("flamethrower-router"));
//exports["PREACT"] = { ...preact, _react: compat };
exports["ROUTER"] = (0, flamethrower_router_1.default)({ prefetch: 'visible', log: true, pageTransitions: true });
// @ts-ignore
module.ROUTER = exports["ROUTER"];
