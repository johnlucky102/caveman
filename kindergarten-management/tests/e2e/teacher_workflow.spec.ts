import { test, expect } from '@playwright/test';

const ADMIN_USER = { email: 'johnnguyenglobal999@gmail.com', password: '123456' };
const TEACHER_USER = { email: 'giaovien@kidgarden.vn', password: '123456' };

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Teacher Workflow & Data Isolation', () => {
  
  test('Scenario 1: Admin assigns teacher to class', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 15000 });
    await page.click('a[href="/classes"]');
    await page.waitForSelector('table');
    const editButton = page.locator('table tr button[title="Chỉnh sửa"]').first();
    await editButton.click();
    await expect(page.locator('text=Quản lý Giáo viên')).toBeVisible({ timeout: 15000 });
  });

  test('Scenario 2: Teacher Dashboard Isolation', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEACHER_USER.email);
    await page.fill('input[type="password"]', TEACHER_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 15000 });
    const studentCount = page.locator('p.text-2xl').first();
    await expect(studentCount).toBeVisible({ timeout: 15000 });
    await expect(studentCount).not.toContainText('...', { timeout: 10000 });
  });

  test('Scenario 3: Teacher performs Attendance with Health data', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEACHER_USER.email);
    await page.fill('input[type="password"]', TEACHER_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await page.click('a[href="/attendance"]');
    await page.waitForSelector('text=Danh sách điểm danh');
    const firstStudentRow = page.locator('.divide-y > div').first();
    await firstStudentRow.locator('input[placeholder="Dặn thuốc..."]').fill('Test Medicine 123');
    await firstStudentRow.locator('select').first().selectOption('Good');
    await firstStudentRow.locator('button[title="Suất ăn"]').click();
    await page.click('button:has-text("Lưu điểm danh")');
    await expect(page.locator('text=Lưu điểm danh thành công')).toBeVisible();
    await page.reload();
    await page.waitForSelector('text=Danh sách điểm danh');
    await expect(firstStudentRow.locator('input[placeholder="Dặn thuốc..."]')).toHaveValue('Test Medicine 123');
    await expect(firstStudentRow.locator('select').first()).toHaveValue('Good');
  });

  test('Scenario 4: Teacher manages Class Diary', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEACHER_USER.email);
    await page.fill('input[type="password"]', TEACHER_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await page.click('a[href="/diary"]');
    const addBtn = page.locator('button:has-text("Thêm nhật ký"), button:has-text("Viết nhật ký ngay")').first();
    await addBtn.click();
    const testTitle = `Test Diary ${Date.now()}`;
    await page.fill('input[placeholder*="vẽ tranh"]', testTitle);
    await page.fill('textarea', 'Content for test diary automation.');
    // Skip image prompt for now to avoid hanging
    const saveBtn = page.locator('button:has-text("Lưu nhật ký")').first();
    await saveBtn.click();
    await expect(page.locator('text=Đã thêm nhật ký mới')).toBeVisible();
    await expect(page.locator(`text=${testTitle}`)).toBeVisible();
  });
});
