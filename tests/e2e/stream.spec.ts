
import { test, expect } from '@playwright/test';

test.describe('Ryo.js Framework - Stream API', () => {
    test('should stream content', async ({ request }) => {
        const response = await request.get('/stream');
        expect(response.ok()).toBeTruthy();

        const text = await response.text();
        expect(text).toBe('This is a streamed content.');

        // Check if content-length header is present (it should be if length is returned)
        const headers = response.headers();
        expect(headers['content-length']).toBe(String('This is a streamed content.'.length));
    });
});
