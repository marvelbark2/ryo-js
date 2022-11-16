#!/usr/bin/env node

import server from './lib';
import build from './lib/build'
import register from '@babel/register';
import { join } from 'path';
import { writeFileSync } from 'fs';

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
        const buildReport = await build();
        const data = JSON.stringify(buildReport, null, 2);
        console.log("🕧 Building pages report from " + data);
        const jsonReportPath = join(process.cwd(), ".ssr/build-report.json")
        writeFileSync(jsonReportPath, Buffer.from(data), { flag: "wx" });
    } else if (args.includes("start")) {
        server()
    } else {
        console.error("Invalid command");
    }
})()
