import { test, expect } from '@playwright/test';

test.describe('Student Management', () => {
  test('should list students and navigate to details', async ({ page }) => {
    await page.goto('/students');
    
    // Check if seeded students are present
    await expect(page.locator('text=Nguyễn Văn An').first()).toBeVisible();
    await expect(page.locator('text=Trần Thị Bình').first()).toBeVisible();

    // Navigate to details
    await page.click('text=Nguyễn Văn An >> nth=0');
    await expect(page).toHaveURL(/\/students\/.+/);
    
    // Verify Info tab content
    await expect(page.locator('h1, h2').filter({ hasText: 'Nguyễn Văn An' }).first()).toBeVisible();
    await expect(page.locator('text=Thông tin học sinh')).toBeVisible();
    await expect(page.locator('text=Thông tin phụ huynh')).toBeVisible();
  });
});
