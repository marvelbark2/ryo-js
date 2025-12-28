import { test, expect } from '@playwright/test';

test.describe('Ryo.js Framework - Server-Sent Events', () => {
    test('should receive SSE events', async ({ page }) => {
        await page.goto('/');
        
        const events: any[] = [];
        
        // Set up SSE listener in the page context
        await page.evaluate(() => {
            return new Promise<void>((resolve) => {
                const eventSource = new EventSource('/counter.ev');
                let eventCount = 0;
                
                eventSource.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    (window as any).sseEvents = (window as any).sseEvents || [];
                    (window as any).sseEvents.push(data);
                    
                    eventCount++;
                    if (eventCount >= 3) {
                        eventSource.close();
                        resolve();
                    }
                };
                
                eventSource.onerror = () => {
                    eventSource.close();
                    resolve();
                };
                
                // Timeout after 5 seconds
                setTimeout(() => {
                    eventSource.close();
                    resolve();
                }, 5000);
            });
        });
        
        // Retrieve the collected events
        const receivedEvents = await page.evaluate(() => (window as any).sseEvents || []);
        
        expect(receivedEvents.length).toBeGreaterThan(0);
        expect(receivedEvents[0]).toHaveProperty('count');
        expect(receivedEvents[0]).toHaveProperty('timestamp');
        
        // Verify count is incrementing
        if (receivedEvents.length > 1) {
            expect(receivedEvents[1].count).toBeGreaterThan(receivedEvents[0].count);
        }
    });
});
