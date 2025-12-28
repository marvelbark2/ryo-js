
import { test, expect } from '@playwright/test';

test.describe('Ryo.js Framework - Middleware', () => {
    test('should block unauthorized access to protected route', async ({ request }) => {
        const response = await request.get('/protected');
        expect(response.status()).toBe(401);
        const text = await response.text();
        expect(text).toBe('Unauthorized');
    });

    test('should allow authorized access to protected route', async ({ request }) => {
        const response = await request.get('/protected', {
            headers: {
                'authorization': 'secret'
            }
        });
        // Since /protected doesn't exist as a real route, it will return 404 if middleware passes
        expect(response.status()).toBe(404);
    });
});
