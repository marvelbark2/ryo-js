
import { test, expect } from '@playwright/test';

test.describe('Ryo.js Framework - Websockets', () => {
    test('should handle websocket connection and messages', async ({ page }) => {
        await page.goto('/');

        const messages = await page.evaluate(() => {
            return new Promise<string[]>((resolve, reject) => {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = `${protocol}//${window.location.host}/echo`;
                const ws = new WebSocket(wsUrl);
                const msgs: string[] = [];

                ws.onopen = () => {
                    ws.send('Hello Server');
                };

                ws.onmessage = (event) => {
                    msgs.push(event.data);

                    // Expecting "Welcome to Echo Server" and "Hello Server" (echoed)
                    if (msgs.length >= 2) {
                        ws.close();
                        resolve(msgs);
                    }
                };

                ws.onerror = (err) => {
                    reject(new Error('WebSocket error'));
                };

                // Timeout
                setTimeout(() => {
                    if (msgs.length > 0) resolve(msgs);
                    else reject(new Error('Timeout waiting for messages'));
                }, 5000);
            });
        });

        expect(messages).toContain('Welcome to Echo Server');
        expect(messages).toContain('Hello Server');
    });
});
