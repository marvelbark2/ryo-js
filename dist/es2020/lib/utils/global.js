import ps from "./pubsub";
export const watchOnDev = {
    watch: process.env.NODE_ENV === "development" ? {
        onRebuild(error, result) {
            if (error)
                console.error("watch build failed:", error);
            else {
                console.log("watch build succeeded:", result);
                ps.publish("restart");
            }
        }
    } : undefined
};
