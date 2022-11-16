#!/usr/bin/env node
import server from './lib/index.module';
import build from './lib/build/';
const args = process.argv.slice(2);
if (args.includes("build")) {
    build();
}
else if (args.includes("start")) {
    server();
}
else {
    console.error("Invalid command");
}
