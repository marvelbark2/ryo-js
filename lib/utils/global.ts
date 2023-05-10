import { join } from "path";
import ps from "./pubsub";

// export const watchOnDev = {
//     watch: process.env.NODE_ENV === "development" ? {
//         onRebuild(error: any, result: any) {
//             const at = Date.now();
//             if (error) console.error("watch build failed: ", error);
//             else {
//                 ps.publish("restart", at);

//                 if (result.outputFiles && result.outputFiles.length > 0)
//                     console.log("watch build succeeded: ", result.outputFiles[0].path);
//                 else {
//                     console.log("[esbuild]: No chnages detected");
//                 }
//             }
//         }
//     } : undefined
// }


export async function getProjectPkg() {
    const pkg = await import(join(process.cwd(), "package.json"));
    return pkg;
}

export async function getAsyncValue<T>(value: T | Promise<T>) {
    if (value instanceof Promise) {
        return await value;
    } else {
        return value;
    }
}