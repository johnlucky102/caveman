import { test, expect } from '@playwright/test';

test.describe('Attendance Flow', () => {
  test('should submit daily attendance for a class', async ({ page }) => {
    await page.goto('/attendance');
    
    // Select class with students (Mầm 1)
    await page.waitForSelector('select');
    const classSelect = page.locator('select').first();
    await classSelect.selectOption({ label: 'Mầm 1' });
    
    await page.waitForTimeout(2000);
    
    // Find Nguyễn Văn An row
    const studentRow = page.locator('div.p-4.flex').filter({ hasText: 'Nguyễn Văn An' }).first();
    await expect(studentRow).toBeVisible();
    
    // Mark as Absent (Vắng)
    await studentRow.locator('button[title="Vắng"]').click();
    await expect(studentRow).toContainText('Vắng mặt');
    
    // Add note
    await studentRow.locator('input[placeholder="Ghi chú..."]').fill('Nghỉ ốm có xin phép');
    
    // Mark as Excused (Nghỉ có phép)
    await studentRow.locator('button[title="Nghỉ có phép"]').click();
    await expect(studentRow).toContainText('Có phép');
    
    // Save
    await page.click('button:has-text("Lưu điểm danh")');
    // Check for success toast
    await expect(page.locator('text=Thành công')).toBeVisible();
  });
});
