import { readdirSync, statSync } from "fs";

export function getPageName(filePath) {
    const relativePath = filePath.split("/src/")[1];
    return relativePath.replace(/\.[^/.]+$/, "");
}
export function getPages(dirPath, join) {
    return readdirSync(dirPath)
        .map((file) => {
            const filepath = join(dirPath, file);

            if (statSync(filepath).isDirectory()) {
                return getPages(filepath, join);
            } else {
                return filepath;
            }
        })
        .filter(Boolean)
        .flat(2);
}