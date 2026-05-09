import { test, expect } from '@playwright/test';

test.describe('Fee Management Flow', () => {
  test('should list and filter fee records', async ({ page }) => {
    await page.goto('/fees');
    
    await expect(page.locator('h1')).toContainText('Học phí');

    // 2. Filter by student (using the local search input)
    const searchInput = page.locator('input[placeholder*="Tìm theo học sinh"]').first();
    await searchInput.fill('Nguyễn Văn An');
    await page.waitForTimeout(1000);
    
    // Check if row exists in table
    const row = page.locator('tr').filter({ hasText: 'Nguyễn Văn An' }).first();
    await expect(row).toBeVisible();

    // 3. Check status label
    await expect(row).toContainText('thanh toán'); // Match any status including 'thanh toán'
  });
});
