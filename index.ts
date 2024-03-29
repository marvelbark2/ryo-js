#!/usr/bin/env node

import server from './lib';
import build from './lib/build'
import register from '@babel/register';
import { join } from 'path';
import { writeFileSync } from 'fs';
import generateApiTypes from './lib/generators/generate-api-types';
import { OFFLINES_PAGES, loadConfig } from './lib/utils/global';
import type { RyoConfig as Config } from './types/index';

require.extensions['.css'] = () => {
    return;
};

// @ts-ignore
globalThis.register = register;
register({
    "presets": [
        "preact",
    ]
})
const args = process.argv.slice(2);


const buildingScript = async (config: Config) => {
    console.time("Build completed in");

    // Check linter and validate config
    // check typescript

    const buildReport = await build(config);

    if (buildReport) {
        const data = JSON.stringify(buildReport, null, 2);
        console.time("🕧 Building pages report");
        const jsonReportPath = join(process.cwd(), ".ssr/build-report.json")
        writeFileSync(jsonReportPath, Buffer.from(data), { flag: "wx" });
        console.timeEnd("🕧 Building pages report");

        console.time("🕧 Building offlines report");
        const offlineReportArr: string[] = [];
        OFFLINES_PAGES.forEach((v) => offlineReportArr.push(v));
        const offlineReport = JSON.stringify(offlineReportArr);
        const jsonReportOfflineReport = join(process.cwd(), ".ssr/build-offline-report.json")
        writeFileSync(jsonReportOfflineReport, Buffer.from(offlineReport), { flag: "wx" });
        console.timeEnd("🕧 Building offlines report");

        console.timeEnd("Build completed in");
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
        const config = await loadConfig();
        await buildingScript(config)
        await server("dev");
    }
})()
