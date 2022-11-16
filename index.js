#!/usr/bin/env node
const args = process.argv.slice(2);


if(args.includes("build")) {
    import("./lib/build/index.mjs");
} else if(args.includes("start")) {
    require("./lib/index.module.js");
} else {
    console.error("Invalid command");
}
