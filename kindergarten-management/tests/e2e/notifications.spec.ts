import { test, expect } from '@playwright/test';

test.describe('Notification System', () => {
  test('should create and display system announcements', async ({ page }) => {
    await page.goto('/notifications');
    
    // 1. Create Notification
    await page.click('button:has-text("Tạo thông báo")');
    
    // Fill title and message in modal
    await page.fill('input[placeholder*="Tiêu đề"]', 'Thông báo E2E Test');
    await page.fill('textarea[placeholder*="Nội dung"]', 'Nội dung thông báo tự động từ kịch bản kiểm thử.');
    
    // Select type: 'Thành công' (using text from screenshot)
    await page.locator('label').filter({ hasText: 'Thành công' }).first().click();
    
    // Select target: 'Tất cả'
    await page.locator('label').filter({ hasText: 'Tất cả' }).first().click();
    
    // Click 'Tạo thông báo' button in modal footer
    await page.locator('button:has-text("Tạo thông báo")').last().click();

    // 2. Verify in list
    await expect(page.locator('text=Thông báo E2E Test').first()).toBeVisible();
    
    // 3. Verify on Dashboard
    await page.goto('/');
    await expect(page.locator('text=Thông báo E2E Test').first()).toBeVisible();
  });
});
