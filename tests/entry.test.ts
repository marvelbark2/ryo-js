import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'lib', 'index.module.js');

describe('ryo-js entry', () => {
    it('lib/index.module.js exists', () => {
        expect(fs.existsSync(entry)).toBe(true);
    });

    it('can import lib/index.module.js', async () => {
        const mod = await import(pathToFileURL(entry).href);
        expect(mod).toBeTruthy();
        expect(Object.keys(mod).length).toBeGreaterThan(0);
    });
});
