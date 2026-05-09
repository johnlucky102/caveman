import { test, expect } from '@playwright/test';

test.describe('Settings & Theme', () => {
  test('should update school info and persist theme', async ({ page }) => {
    await page.goto('/settings');
    
    // 1. Update School Info
    await page.fill('input[name="school_name"]', 'KidGarden E2E Academy');
    await page.click('button:has-text("Lưu thay đổi")');
    
    // Verify updated value
    await expect(page.locator('input[name="school_name"]')).toHaveValue('KidGarden E2E Academy');

    // 2. Test Dark Mode Persistence
    const isDark = await page.locator('html').evaluate(el => el.classList.contains('dark'));
    
    // Selectors for theme buttons in Settings page
    const lightButton = page.locator('button[title="Chế độ sáng"]');
    const darkButton = page.locator('button[title="Chế độ tối"]');
    
    if (!isDark) {
      await darkButton.click();
      await expect(page.locator('html')).toHaveClass(/dark/);
    }
    
    // Reload and check if still dark
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    
    // Toggle back to light
    await lightButton.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});
