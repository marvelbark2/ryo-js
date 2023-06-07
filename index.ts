#!/usr/bin/env node

import server from './lib';
import build from './lib/build'
import register from '@babel/register';
import { join } from 'path';
import { writeFileSync } from 'fs';
import generateApiTypes from './lib/generators/generate-api-types';
import { OFFLINES_PAGES, loadConfig } from './lib/utils/global';
import type { Config } from 'RyoConfig';

// @ts-ignore
globalThis.register = register;

register({
    "presets": [
        "preact"
    ],
    "ignore": [
        /\.css$/
    ]
})
const args = process.argv.slice(2);

require.extensions['.css'] = () => {
    return;
};

const buildingScript = async (config: Config) => {
    const before = new Date().getTime();

    // Check linter and validate config
    // check typescript

    const buildReport = await build(config);

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
        const config = await loadConfig();
        try {
            await buildingScript(config)
        } catch (e) {
            console.error(e);
        }
    } else if (args.includes("start")) {
        await server()
    } else if (args.includes("dev")) {
        const config = await loadConfig();
        await buildingScript(config)
        await server("dev");
    } else if (args.includes("generate")) {
        if (args.includes("apis.type")) {
            await generateApiTypes()
        }

    } else {
        console.error("Invalid command");
    }
})()
