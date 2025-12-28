import { test, expect } from '@playwright/test';

test.describe('Ryo.js Framework - Performance', () => {
    test('should load homepage within acceptable time', async ({ page }) => {
        const startTime = Date.now();
        await page.goto('/');
        const loadTime = Date.now() - startTime;

        expect(loadTime).toBeLessThan(3000); // 3 seconds max

        // Check for server-rendered content
        const heading = await page.locator('h1').textContent();
        expect(heading).toBeTruthy();
    });

    test('should have fast client-side navigation', async ({ page }) => {
        await page.goto('/');

        const startTime = Date.now();
        await page.click('a[href="/about"]');
        await page.waitForSelector('#title');
        const navTime = Date.now() - startTime;

        expect(navTime).toBeLessThan(1000); // SPA navigation should be fast
    });
});

test.describe('Ryo.js Framework - Error Handling', () => {
    test('should handle 404 pages', async ({ page }) => {
        const response = await page.goto('/non-existent-page');
        expect(response?.status()).toBe(404);
    });

    test('should handle API errors gracefully', async ({ request }) => {
        // This assumes the API validates input
        const response = await request.get('/api/non-existent');
        expect([404, 500]).toContain(response.status());
    });
});

test.describe('Ryo.js Framework - Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
        await page.goto('/');

        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBeGreaterThan(0);
    });

    test('should have accessible links', async ({ page }) => {
        await page.goto('/');

        const links = await page.locator('a').all();
        for (const link of links) {
            const href = await link.getAttribute('href');
            const text = await link.textContent();

            expect(href).toBeTruthy();
            expect(text?.trim()).toBeTruthy();
        }
    });
});
