import { test, expect } from '@playwright/test';

test.describe('Ryo.js Framework - Basic Routing', () => {
    test('should render homepage with static data', async ({ page }) => {
        await page.goto('/');

        const heading = await page.locator('h1').textContent();
        expect(heading).toContain('Hello from Ryo.js');

        const counter = await page.locator('#counter').textContent();
        expect(counter).toBe('0');
    });

    test('should handle client-side interactions', async ({ page }) => {
        await page.goto('/');

        const incrementButton = page.locator('#increment');
        await incrementButton.click();

        const counter = await page.locator('#counter').textContent();
        expect(counter).toBe('1');

        await incrementButton.click();
        await incrementButton.click();

        const newCounter = await page.locator('#counter').textContent();
        expect(newCounter).toBe('3');
    });

    test('should navigate to about page', async ({ page }) => {
        await page.goto('/');

        await page.click('a[href="/about"]');
        await page.waitForLoadState('networkidle');

        const title = await page.locator('#title').textContent();
        expect(title).toBe('About Page');

        const description = await page.locator('#description').textContent();
        expect(description).toBe('This is the about page');
    });

    test('should handle dynamic routes', async ({ page }) => {
        await page.goto('/users/123');

        const userId = await page.locator('#user-id').textContent();
        expect(userId).toContain('123');
    });
});