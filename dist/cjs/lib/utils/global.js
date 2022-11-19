"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchOnDev = void 0;
var pubsub_1 = __importDefault(require("./pubsub"));
exports.watchOnDev = {
    watch: process.env.NODE_ENV === "development" ? {
        onRebuild: function (error, result) {
            if (error)
                console.error("watch build failed:", error);
            else {
                console.log("watch build succeeded:", result);
                pubsub_1.default.publish("restart");
            }
        }
    } : undefined
};
