#!/usr/bin/env node
import server from './lib';
import build from './lib/build';
import register from '@babel/register';
import { join } from 'path';
import { writeFileSync } from 'fs';
import ps from "./lib/utils/pubsub";
// @ts-ignore
globalThis.register = register;
register({
    "presets": [
        "preact"
    ]
});
const args = process.argv.slice(2);
(async () => {
    if (args.includes("build")) {
        const before = new Date().getTime();
        const buildReport = await build();
        const data = JSON.stringify(buildReport, null, 2);
        console.log("🕧 Building pages report");
        const jsonReportPath = join(process.cwd(), ".ssr/build-report.json");
        writeFileSync(jsonReportPath, Buffer.from(data), { flag: "wx" });
        console.log("\n✅ Build completed in " + (new Date().getTime() - before) + "ms");
    }
    else if (args.includes("start")) {
        server();
    }
    else if (args.includes("dev")) {
        const buildReport = await build();
        const data = JSON.stringify(buildReport, null, 2);
        console.log("🕧 Building pages report");
        const jsonReportPath = join(process.cwd(), ".ssr/build-report.json");
        writeFileSync(jsonReportPath, Buffer.from(data), { flag: "wx" });
        let uws = server("dev");
        ps.subscribe((msg) => {
            console.log(msg);
            if (msg === "restart") {
                uws();
                uws = server("dev");
            }
        });
    }
    else {
        console.error("Invalid command");
    }
})();
