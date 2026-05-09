import { test, expect } from '@playwright/test';

test.describe('Teacher Management', () => {
  test('should create, update and delete a teacher', async ({ page }) => {
    await page.goto('/teachers');
    
    // 1. Create
    await page.click('text=Thêm giáo viên');
    await page.waitForURL('**/teachers/new');
    
    const testName = 'GV Test Automation ' + Date.now();
    await page.fill('input[name="full_name"]', testName);
    await page.fill('input[name="phone"]', '0123456789');
    await page.fill('input[name="email"]', `gv.test.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', '123456');
    
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/teachers');
    await expect(page.locator(`text=${testName}`).first()).toBeVisible();

    // 2. Update
    // Click the edit button (pencil icon) in the row
    const row = page.locator('tr').filter({ hasText: testName }).first();
    await row.locator('button[title="Chỉnh sửa"]').click();
    
    await page.waitForURL(/\/teachers\/.+\/edit/);
    const updatedName = testName + ' Updated';
    await page.fill('input[name="full_name"]', updatedName);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/teachers');
    await expect(page.locator(`text=${updatedName}`).first()).toBeVisible();

    // 3. Delete
    const updatedRow = page.locator('tr').filter({ hasText: updatedName }).first();
    
    // Handle window.confirm before clicking
    page.once('dialog', dialog => dialog.accept());
    
    await updatedRow.locator('button[title="Xóa"]').click();
    
    await expect(page.locator(`text=${updatedName}`)).not.toBeVisible();
  });
});
