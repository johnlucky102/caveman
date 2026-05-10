# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: teacher_workflow.spec.ts >> Teacher Workflow & Data Isolation >> Scenario 4: Teacher manages Class Diary
- Location: tests\e2e\teacher_workflow.spec.ts:54:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Đã thêm nhật ký mới')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Đã thêm nhật ký mới')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e6]:
      - generic [ref=e8]: K
      - generic [ref=e9]:
        - paragraph [ref=e10]: KidGarden
        - paragraph [ref=e11]: Quản lý mầm non
    - navigation [ref=e12]:
      - link "Dashboard" [ref=e13] [cursor=pointer]:
        - /url: /
        - img [ref=e14]
        - generic [ref=e17]: Dashboard
      - link "Học sinh" [ref=e18] [cursor=pointer]:
        - /url: /students
        - img [ref=e19]
        - generic [ref=e24]: Học sinh
      - link "Lớp học" [ref=e25] [cursor=pointer]:
        - /url: /classes
        - img [ref=e26]
        - generic [ref=e30]: Lớp học
      - link "Điểm danh" [ref=e31] [cursor=pointer]:
        - /url: /attendance
        - img [ref=e32]
        - generic [ref=e35]: Điểm danh
      - link "Nhật ký lớp" [ref=e36] [cursor=pointer]:
        - /url: /diary
        - img [ref=e37]
        - generic [ref=e40]: Nhật ký lớp
      - link "Báo cáo" [ref=e41] [cursor=pointer]:
        - /url: /reports
        - img [ref=e42]
        - generic [ref=e44]: Báo cáo
      - link "Thông báo" [ref=e45] [cursor=pointer]:
        - /url: /notifications
        - img [ref=e46]
        - generic [ref=e49]: Thông báo
    - generic [ref=e50]: Giáo viên
    - button "Thu gọn sidebar" [ref=e52] [cursor=pointer]:
      - img [ref=e53]
      - generic [ref=e55]: Thu gọn
  - generic [ref=e56]:
    - banner [ref=e57]:
      - generic [ref=e58]:
        - img [ref=e59]
        - textbox "Tìm kiếm học sinh, lớp học..." [ref=e62]
      - generic [ref=e63]:
        - button "Thông báo" [ref=e64] [cursor=pointer]:
          - img [ref=e65]
        - button "Menu người dùng" [ref=e69] [cursor=pointer]:
          - generic [ref=e70]: TD
          - generic [ref=e71]: Nguyễn Thu Dung
          - img [ref=e72]
    - main [ref=e74]:
      - generic [ref=e75]:
        - generic [ref=e77]:
          - heading "Nhật ký lớp học" [level=1] [ref=e78]
          - paragraph [ref=e79]: Lưu lại các hoạt động hàng ngày của bé
        - generic [ref=e80]:
          - generic [ref=e81]:
            - generic [ref=e84]:
              - generic [ref=e85]:
                - generic [ref=e86]: Chọn lớp
                - generic [ref=e87]:
                  - combobox "Chọn lớp" [ref=e88] [cursor=pointer]:
                    - option "Lớp Mầm A1 Test" [selected]
                  - generic:
                    - img
              - generic [ref=e89]:
                - generic [ref=e90]: Ngày
                - textbox "Ngày" [ref=e92]: 2026-05-10
            - generic [ref=e93]:
              - heading "Nhật ký trong ngày" [level=3] [ref=e94]
              - generic [ref=e95]: Chưa có nhật ký cho ngày này
          - generic [ref=e97]:
            - heading "Tạo nhật ký mới" [level=3] [ref=e101]
            - generic [ref=e103]:
              - generic [ref=e104]:
                - generic [ref=e105]: Tiêu đề
                - textbox "Tiêu đề" [ref=e107]:
                  - /placeholder: "Ví dụ: Hoạt động vẽ tranh buổi sáng"
                  - text: Test Diary 1778375951831
              - generic [ref=e108]:
                - text: Nội dung
                - textbox "Mô tả chi tiết các hoạt động, tâm trạng của trẻ..." [ref=e109]: Content for test diary automation.
              - generic [ref=e110]:
                - generic [ref=e111]:
                  - img [ref=e112]
                  - text: Hình ảnh hoạt động
                - button "Thêm ảnh" [ref=e117] [cursor=pointer]:
                  - img [ref=e118]
                  - generic [ref=e119]: Thêm ảnh
              - generic [ref=e120]:
                - button "Hủy bỏ" [ref=e121] [cursor=pointer]:
                  - generic [ref=e122]: Hủy bỏ
                - button "Lưu nhật ký" [ref=e123] [cursor=pointer]:
                  - generic [ref=e124]: Lưu nhật ký
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const ADMIN_USER = { email: 'johnnguyenglobal999@gmail.com', password: '123456' };
  4  | const TEACHER_USER = { email: 'giaovien@kidgarden.vn', password: '123456' };
  5  | 
  6  | test.use({ storageState: { cookies: [], origins: [] } });
  7  | 
  8  | test.describe('Teacher Workflow & Data Isolation', () => {
  9  |   
  10 |   test('Scenario 1: Admin assigns teacher to class', async ({ page }) => {
  11 |     await page.goto('/login');
  12 |     await page.fill('input[type="email"]', ADMIN_USER.email);
  13 |     await page.fill('input[type="password"]', ADMIN_USER.password);
  14 |     await page.click('button[type="submit"]');
  15 |     await expect(page).toHaveURL('/', { timeout: 15000 });
  16 |     await page.click('a[href="/classes"]');
  17 |     await page.waitForSelector('table');
  18 |     const editButton = page.locator('table tr button[title="Chỉnh sửa"]').first();
  19 |     await editButton.click();
  20 |     await expect(page.locator('text=Quản lý Giáo viên')).toBeVisible({ timeout: 15000 });
  21 |   });
  22 | 
  23 |   test('Scenario 2: Teacher Dashboard Isolation', async ({ page }) => {
  24 |     await page.goto('/login');
  25 |     await page.fill('input[type="email"]', TEACHER_USER.email);
  26 |     await page.fill('input[type="password"]', TEACHER_USER.password);
  27 |     await page.click('button[type="submit"]');
  28 |     await expect(page).toHaveURL('/', { timeout: 15000 });
  29 |     const studentCount = page.locator('p.text-2xl').first();
  30 |     await expect(studentCount).toBeVisible({ timeout: 15000 });
  31 |     await expect(studentCount).not.toContainText('...', { timeout: 10000 });
  32 |   });
  33 | 
  34 |   test('Scenario 3: Teacher performs Attendance with Health data', async ({ page }) => {
  35 |     await page.goto('/login');
  36 |     await page.fill('input[type="email"]', TEACHER_USER.email);
  37 |     await page.fill('input[type="password"]', TEACHER_USER.password);
  38 |     await page.click('button[type="submit"]');
  39 |     await expect(page).toHaveURL('/', { timeout: 10000 });
  40 |     await page.click('a[href="/attendance"]');
  41 |     await page.waitForSelector('text=Danh sách điểm danh');
  42 |     const firstStudentRow = page.locator('.divide-y > div').first();
  43 |     await firstStudentRow.locator('input[placeholder="Dặn thuốc..."]').fill('Test Medicine 123');
  44 |     await firstStudentRow.locator('select').first().selectOption('Good');
  45 |     await firstStudentRow.locator('button[title="Suất ăn"]').click();
  46 |     await page.click('button:has-text("Lưu điểm danh")');
  47 |     await expect(page.locator('text=Lưu điểm danh thành công')).toBeVisible();
  48 |     await page.reload();
  49 |     await page.waitForSelector('text=Danh sách điểm danh');
  50 |     await expect(firstStudentRow.locator('input[placeholder="Dặn thuốc..."]')).toHaveValue('Test Medicine 123');
  51 |     await expect(firstStudentRow.locator('select').first()).toHaveValue('Good');
  52 |   });
  53 | 
  54 |   test('Scenario 4: Teacher manages Class Diary', async ({ page }) => {
  55 |     await page.goto('/login');
  56 |     await page.fill('input[type="email"]', TEACHER_USER.email);
  57 |     await page.fill('input[type="password"]', TEACHER_USER.password);
  58 |     await page.click('button[type="submit"]');
  59 |     await expect(page).toHaveURL('/', { timeout: 10000 });
  60 |     await page.click('a[href="/diary"]');
  61 |     const addBtn = page.locator('button:has-text("Thêm nhật ký"), button:has-text("Viết nhật ký ngay")').first();
  62 |     await addBtn.click();
  63 |     const testTitle = `Test Diary ${Date.now()}`;
  64 |     await page.fill('input[placeholder*="vẽ tranh"]', testTitle);
  65 |     await page.fill('textarea', 'Content for test diary automation.');
  66 |     // Skip image prompt for now to avoid hanging
  67 |     const saveBtn = page.locator('button:has-text("Lưu nhật ký")').first();
  68 |     await saveBtn.click();
> 69 |     await expect(page.locator('text=Đã thêm nhật ký mới')).toBeVisible();
     |                                                            ^ Error: expect(locator).toBeVisible() failed
  70 |     await expect(page.locator(`text=${testTitle}`)).toBeVisible();
  71 |   });
  72 | });
  73 | 
```