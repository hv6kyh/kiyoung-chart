import { test, expect } from '@playwright/test';

test.describe('UI Improvements Verification', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for data to load if necessary
        await page.waitForTimeout(2000);
    });

    test('Sidebar tooltip should be positioned on the left (right: 100%)', async ({ page }) => {
        const matchItem = page.locator('.match-item').first();
        await matchItem.hover();

        const tooltip = page.locator('.match-tooltip');
        await expect(tooltip).toBeVisible();

        const box = await tooltip.boundingBox();
        const itemBox = await matchItem.boundingBox();

        if (box && itemBox) {
            // Tooltip should be to the left of the item
            expect(box.x + box.width).toBeLessThanOrEqual(itemBox.x);
        }
    });

    test('Match detail modal should have reduced width', async ({ page }) => {
        const matchItem = page.locator('.match-item').first();
        await matchItem.click();

        const modalContent = page.locator('.modal-content');
        await expect(modalContent).toBeVisible();

        const box = await modalContent.boundingBox();
        if (box) {
            expect(box.width).toBeLessThanOrEqual(800);
        }
    });
});
