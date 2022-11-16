import fs from 'fs';
import { join } from 'path';

export function get({ url }) {
    const path = join(process.cwd(), "./screen.mov");
    const stream = fs.createReadStream(path)
    stream.on("error", () => {
        //Handle error to avoid server crash
        console.log("error");
    })
    const length = fs.statSync(path).size;
    return {
        stream, length
    };
}

export function post({ body }) {
    return {
        message: "Hello from " + body
    };
}