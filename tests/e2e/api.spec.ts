import { test, expect } from '@playwright/test';

test.describe('Ryo.js Framework - API Routes', () => {
    test('should handle GET requests', async ({ request }) => {
        const response = await request.get('/api/hello');
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        expect(data).toHaveProperty('message', 'Hello from API');
        expect(data).toHaveProperty('timestamp');
    });

    test('should handle POST requests', async ({ request }) => {
        const payload = {
            name: 'Test User',
            email: 'test@example.com',
        };
        
        const response = await request.post('/api/hello', {
            data: payload,
        });
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        expect(data).toHaveProperty('received');
        expect(data.received).toMatchObject(payload);
        expect(data.echo).toBe(true);
    });

    test('should fetch users list', async ({ request }) => {
        const response = await request.get('/api/users');
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        expect(data).toHaveProperty('users');
        expect(Array.isArray(data.users)).toBeTruthy();
        expect(data.users.length).toBeGreaterThan(0);
        expect(data.count).toBe(data.users.length);
    });

    test('should create new user', async ({ request }) => {
        const newUser = {
            name: 'Dave',
            email: 'dave@example.com',
        };
        
        const response = await request.post('/api/users', {
            data: newUser,
        });
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.user).toMatchObject(newUser);
        expect(data.user).toHaveProperty('id');
    });
});
