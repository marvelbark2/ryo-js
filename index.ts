#!/usr/bin/env node

import server from './lib';
import build from './lib/build'
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
})
const args = process.argv.slice(2);


(async () => {
    if (args.includes("build")) {
        try {
            const before = new Date().getTime();
            const buildReport = await build();

            if (buildReport) {
                const data = JSON.stringify(buildReport, null, 2);
                console.log("🕧 Building pages report");
                const jsonReportPath = join(process.cwd(), ".ssr/build-report.json")
                writeFileSync(jsonReportPath, Buffer.from(data), { flag: "wx" });
                console.log(`\n✅ Build completed in ${(new Date().getTime() - before)}ms`);
            }
        } catch (e) {
            console.error(e);
        }
    } else if (args.includes("start")) {
        server()
    } else if (args.includes("dev")) {
        let uws: any | null = null;
        try {
            const buildReport = await build();
            const data = JSON.stringify(buildReport, null, 2);
            console.log("🕧 Building pages report");
            const jsonReportPath = join(process.cwd(), ".ssr/build-report.json")
            writeFileSync(jsonReportPath, Buffer.from(data), { flag: "wx" });
            uws = server("dev");
            const unsub = ps.subscribe((msg, at) => {
                if (msg === "restart" && at) {
                    uws();
                    uws = server("dev");
                    const now = Date.now();
                    console.log(`Dev compiled at restarted for ${now - at}ms`)
                    ps.publish("refresh")
                    unsub()
                }
            })
        } catch (e) {
            console.error(e);
            if (uws) {
                uws();
            }
        }
    } else {
        console.error("Invalid command");
    }
})()
