import { test, expect } from '@playwright/test';

test.describe('Class Management', () => {
  test('should create and manage a class', async ({ page }) => {
    await page.goto('/classes');
    
    // 1. Create
    await page.click('text=Thêm lớp');
    await page.waitForURL('**/classes/new');
    
    const className = 'Lớp Test E2E ' + Date.now();
    await page.fill('input[name="name"]', className);
    await page.fill('input[name="room"]', 'Room-E2E');
    await page.fill('input[name="max_students"]', '20');
    
    await page.click('button[type="submit"]');

    // Wait for redirect back
    await page.waitForURL('**/classes');
    await expect(page.locator(`text=${className}`).first()).toBeVisible();

    // 2. Edit
    // Click on the row to go to details
    await page.click(`text=${className} >> nth=0`);
    await page.waitForURL(/\/classes\/.+/);
    
    // Click edit button in detail page
    await page.click('button:has-text("Chỉnh sửa")');
    await page.waitForURL(/\/classes\/.+\/edit/);
    
    await page.fill('input[name="room"]', 'Room-E2E-Updated');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/classes');
    await expect(page.locator('text=Room-E2E-Updated').first()).toBeVisible();
  });
});
