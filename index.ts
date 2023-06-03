#!/usr/bin/env node

import server from './lib';
import build from './lib/build'
import register from '@babel/register';
import { join } from 'path';
import { writeFileSync } from 'fs';
import ps from "./lib/utils/pubsub";
import generateApiTypes from './lib/generators/generate-api-types';
import { OFFLINES_PAGES } from './lib/utils/global';

// @ts-ignore
globalThis.register = register;

register({
    "presets": [
        "preact"
    ]
})
const args = process.argv.slice(2);

const buildingScript = async () => {
    const before = new Date().getTime();
    const buildReport = await build();

    if (buildReport) {
        const data = JSON.stringify(buildReport, null, 2);
        console.log("🕧 Building pages report");
        const jsonReportPath = join(process.cwd(), ".ssr/build-report.json")
        writeFileSync(jsonReportPath, Buffer.from(data), { flag: "wx" });

        const offlineReportArr: string[] = [];
        OFFLINES_PAGES.forEach((v) => offlineReportArr.push(v));
        const offlineReport = JSON.stringify(offlineReportArr);
        const jsonReportOfflineReport = join(process.cwd(), ".ssr/build-offline-report.json")
        writeFileSync(jsonReportOfflineReport, Buffer.from(offlineReport), { flag: "wx" });
        console.log("🕧 Building offlines report");

        console.log(`\n✅ Build completed in ${(new Date().getTime() - before)}ms`);
    }
}
(async () => {
    if (args.includes("build")) {
        try {
            await buildingScript()
        } catch (e) {
            console.error(e);
        }
    } else if (args.includes("start")) {
        server()
    } else if (args.includes("dev")) {
        let uws: any | null = null;
        try {
            await buildingScript()
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
    } else if (args.includes("generate")) {
        if (args.includes("apis.type")) {
            await generateApiTypes()
        }

    } else {
        console.error("Invalid command");
    }
})()
