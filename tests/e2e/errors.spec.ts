
import { test, expect } from '@playwright/test';

test.describe('Ryo.js Framework - Error Pages', () => {
    test('should render custom 404 page', async ({ page }) => {
        await page.goto('/non-existent-page-12345');

        const title = await page.locator('h1').textContent();
        expect(title).toBe('Custom 404 Page');

        const text = await page.locator('p').textContent();
        expect(text).toBe('The page you are looking for does not exist.');
    });
});
