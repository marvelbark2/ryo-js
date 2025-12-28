
import fs from 'fs';
import { join } from 'path';

export function get() {
    const path = join(process.cwd(), "test-stream.txt");
    // Ensure file exists
    if (!fs.existsSync(path)) {
        fs.writeFileSync(path, "This is a streamed content.");
    }

    const stream = fs.createReadStream(path);
    const length = fs.statSync(path).size;

    return {
        stream,
        length
    };
}
