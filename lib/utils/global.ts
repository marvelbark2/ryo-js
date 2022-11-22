import { join } from "path";
import ps from "./pubsub";

export const watchOnDev = {
    watch: process.env.NODE_ENV === "development" ? {
        onRebuild(error: any, result: any) {
            const at = Date.now();
            if (error) console.error("watch build failed:", error);
            else {
                console.log("watch build succeeded: ", result.outputFiles[0].path);
                ps.publish("restart-" + at);
            }
        }
    } : undefined
}


export async function getProjectPkg() {
    const pkg = await import(join(process.cwd(), "package.json"));
    return pkg;
}