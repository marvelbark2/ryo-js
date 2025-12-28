import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

type PackageJson = {
    name?: string;
    version?: string;
    scripts?: Record<string, string>;
    bin?: Record<string, string> | string;
    peerDependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
};

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');

describe('package.json contract', () => {
    it('has expected metadata', () => {
        const raw = fs.readFileSync(pkgPath, 'utf8');
        const pkg = JSON.parse(raw) as PackageJson;

        expect(pkg.name).toBe('ryo.js');
        expect(typeof pkg.version).toBe('string');
    });

    it('declares required scripts', () => {
        const raw = fs.readFileSync(pkgPath, 'utf8');
        const pkg = JSON.parse(raw) as PackageJson;

        expect(pkg.scripts?.build).toBeTruthy();
        expect(pkg.scripts?.['type-check']).toBeTruthy();
    });

    it('has expected peerDependencies', () => {
        const raw = fs.readFileSync(pkgPath, 'utf8');
        const pkg = JSON.parse(raw) as PackageJson;

        expect(pkg.peerDependencies?.preact).toBeTruthy();
        expect(pkg.peerDependencies?.react).toBeTruthy();
        expect(pkg.peerDependencies?.['react-dom']).toBeTruthy();
    });

    it('has vitest in devDependencies', () => {
        const raw = fs.readFileSync(pkgPath, 'utf8');
        const pkg = JSON.parse(raw) as PackageJson;

        expect(pkg.devDependencies?.vitest).toBeTruthy();
    });
});
