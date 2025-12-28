import { test, expect } from '@playwright/test';

test.describe('Ryo.js Framework - GraphQL', () => {
    test('should execute GraphQL query', async ({ request }) => {
        const query = {
            query: `
                query {
                    hello
                    users {
                        id
                        name
                    }
                }
            `,
        };
        
        const response = await request.post('/test.gql', {
            data: query,
        });
        
        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        
        expect(data).toHaveProperty('data');
        expect(data.data.hello).toBe('Hello from GraphQL');
        expect(Array.isArray(data.data.users)).toBeTruthy();
        expect(data.data.users.length).toBeGreaterThan(0);
    });

    test('should execute GraphQL mutation', async ({ request }) => {
        const mutation = {
            query: `
                mutation AddUser($name: String!) {
                    addUser(name: $name) {
                        id
                        name
                    }
                }
            `,
            variables: {
                name: 'Eve',
            },
        };
        
        const response = await request.post('/test.gql', {
            data: mutation,
        });
        
        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        
        expect(data).toHaveProperty('data');
        expect(data.data.addUser).toHaveProperty('id');
        expect(data.data.addUser.name).toBe('Eve');
    });

    test('should handle GraphQL errors', async ({ request }) => {
        const query = {
            query: `
                query {
                    nonExistentField
                }
            `,
        };
        
        const response = await request.post('/test.gql', {
            data: query,
        });
        
        const data = await response.json();
        expect(data).toHaveProperty('errors');
        expect(Array.isArray(data.errors)).toBeTruthy();
    });
});
