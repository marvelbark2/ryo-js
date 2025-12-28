import { test, expect } from '@playwright/test';

test.describe('Ryo.js Framework - Server-Side Rendering', () => {
    test('should render page with SSR data', async ({ page }) => {
        await page.goto('/');
        
        // Check if the page is server-rendered by inspecting initial HTML
        const content = await page.content();
        expect(content).toContain('Hello from Ryo.js');
        expect(content).toContain('Counter:');
    });

    test('should hydrate client-side functionality', async ({ page }) => {
        await page.goto('/');
        
        // Verify server-rendered content exists
        const heading = await page.locator('h1').textContent();
        expect(heading).toContain('Hello from Ryo.js');
        
        // Verify client-side JavaScript is working
        await page.click('#increment');
        const counter = await page.locator('#counter').textContent();
        expect(counter).toBe('1');
    });

    test('should handle navigation without full page reload', async ({ page }) => {
        await page.goto('/');
        
        // Listen for navigation events
        let navigationCount = 0;
        page.on('framenavigated', () => {
            navigationCount++;
        });
        
        await page.click('a[href="/about"]');
        await page.waitForSelector('#title');
        
        // Should use client-side routing (SPA)
        const title = await page.locator('#title').textContent();
        expect(title).toBe('About Page');
    });
});
