# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: attendance.spec.ts >> Attendance Flow >> should submit daily attendance for a class
- Location: tests\e2e\attendance.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('div.p-4.flex').filter({ hasText: 'Nguyễn Văn An' }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('div.p-4.flex').filter({ hasText: 'Nguyễn Văn An' }).first()

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
      - link "Giáo viên" [ref=e31] [cursor=pointer]:
        - /url: /teachers
        - img [ref=e32]
        - generic [ref=e35]: Giáo viên
      - link "Phụ huynh" [ref=e36] [cursor=pointer]:
        - /url: /parents
        - img [ref=e37]
        - generic [ref=e41]: Phụ huynh
      - link "Điểm danh" [ref=e42] [cursor=pointer]:
        - /url: /attendance
        - img [ref=e43]
        - generic [ref=e46]: Điểm danh
      - link "Học phí" [ref=e47] [cursor=pointer]:
        - /url: /fees
        - img [ref=e48]
        - generic [ref=e51]: Học phí
      - link "Báo cáo" [ref=e52] [cursor=pointer]:
        - /url: /reports
        - img [ref=e53]
        - generic [ref=e55]: Báo cáo
      - link "Thông báo" [ref=e56] [cursor=pointer]:
        - /url: /notifications
        - img [ref=e57]
        - generic [ref=e60]: Thông báo
      - link "Cài đặt" [ref=e61] [cursor=pointer]:
        - /url: /settings
        - img [ref=e62]
        - generic [ref=e65]: Cài đặt
    - generic [ref=e66]: Quản trị
    - button "Thu gọn sidebar" [ref=e68] [cursor=pointer]:
      - img [ref=e69]
      - generic [ref=e71]: Thu gọn
  - generic [ref=e72]:
    - banner [ref=e73]:
      - generic [ref=e74]:
        - img [ref=e75]
        - textbox "Tìm kiếm học sinh, lớp học..." [ref=e78]
      - generic [ref=e79]:
        - button "Thông báo" [ref=e80] [cursor=pointer]:
          - img [ref=e81]
        - button "Menu người dùng" [ref=e85] [cursor=pointer]:
          - generic [ref=e86]: "N"
          - generic [ref=e87]: nhat
          - img [ref=e88]
    - main [ref=e90]:
      - generic [ref=e91]:
        - generic [ref=e92]:
          - generic [ref=e93]:
            - heading "Điểm danh" [level=1] [ref=e94]
            - paragraph [ref=e95]: Daily roll call + lịch sử điểm danh
          - button "Lưu điểm danh" [ref=e96] [cursor=pointer]:
            - img [ref=e98]
            - generic [ref=e101]: Lưu điểm danh
        - generic [ref=e104]:
          - generic [ref=e105]:
            - generic [ref=e106]: Lớp học
            - generic [ref=e107]:
              - combobox "Lớp học" [ref=e108] [cursor=pointer]:
                - option "Chồi 1"
                - option "Lá 1"
                - option "Lớp Mầm A1 Test"
                - option "Lớp Test E2E"
                - option "Lớp Test E2E"
                - option "Lớp Test E2E"
                - option "Lớp Test E2E"
                - option "Lớp Test E2E"
                - option "Lớp Test E2E"
                - option "Lớp Test E2E"
                - option "Lớp Test E2E"
                - option "Lớp Test E2E"
                - option "Lớp Test E2E"
                - option "Lớp Test E2E 1778337070635"
                - option "Mầm 1" [selected]
              - generic:
                - img
          - generic [ref=e109]:
            - button "Ngày trước" [ref=e110] [cursor=pointer]:
              - img [ref=e111]
            - generic [ref=e113]:
              - textbox [ref=e114]: 2026-05-09
              - generic [ref=e115]: Thứ Bảy, 09/05/2026
            - button "Ngày sau" [ref=e116] [cursor=pointer]:
              - img [ref=e117]
          - generic [ref=e119]:
            - button "Điểm danh hôm nay" [ref=e120] [cursor=pointer]
            - button "Lịch sử điểm danh" [ref=e121] [cursor=pointer]:
              - img [ref=e122]
              - text: Lịch sử điểm danh
        - generic [ref=e126]:
          - generic [ref=e127]:
            - paragraph [ref=e128]: "2"
            - paragraph [ref=e129]: Có mặt
          - generic [ref=e130]:
            - paragraph [ref=e131]: "2"
            - paragraph [ref=e132]: Vắng
          - generic [ref=e133]:
            - paragraph [ref=e134]: "0"
            - paragraph [ref=e135]: Muộn
          - generic [ref=e136]:
            - paragraph [ref=e137]: 50%
            - paragraph [ref=e138]: Tỷ lệ
        - generic [ref=e139]:
          - generic [ref=e142]:
            - heading "Danh sách điểm danh" [level=3] [ref=e143]
            - paragraph [ref=e144]: 4 học sinh
          - generic [ref=e146]:
            - generic [ref=e147]:
              - generic [ref=e148]:
                - generic [ref=e149]: A
                - paragraph [ref=e151]: Nguyễn Văn An
              - generic [ref=e152]:
                - generic [ref=e153]:
                  - button "Có mặt" [ref=e154] [cursor=pointer]:
                    - img [ref=e155]
                  - button "Vắng" [ref=e157] [cursor=pointer]:
                    - img [ref=e158]
                  - button "Muộn" [ref=e161] [cursor=pointer]:
                    - img [ref=e162]
                  - button "Nghỉ có phép" [ref=e165] [cursor=pointer]:
                    - img [ref=e166]
                - textbox "Ghi chú..." [ref=e168]
                - generic [ref=e169]: Có mặt
            - generic [ref=e171]:
              - generic [ref=e172]:
                - generic [ref=e173]: A
                - paragraph [ref=e175]: Nguyễn Văn An
              - generic [ref=e176]:
                - generic [ref=e177]:
                  - button "Có mặt" [ref=e178] [cursor=pointer]:
                    - img [ref=e179]
                  - button "Vắng" [ref=e181] [cursor=pointer]:
                    - img [ref=e182]
                  - button "Muộn" [ref=e185] [cursor=pointer]:
                    - img [ref=e186]
                  - button "Nghỉ có phép" [ref=e189] [cursor=pointer]:
                    - img [ref=e190]
                - textbox "Ghi chú..." [ref=e192]
                - generic [ref=e193]: Vắng mặt
            - generic [ref=e195]:
              - generic [ref=e196]:
                - generic [ref=e197]: B
                - paragraph [ref=e199]: Trần Thị Bình
              - generic [ref=e200]:
                - generic [ref=e201]:
                  - button "Có mặt" [ref=e202] [cursor=pointer]:
                    - img [ref=e203]
                  - button "Vắng" [ref=e205] [cursor=pointer]:
                    - img [ref=e206]
                  - button "Muộn" [ref=e209] [cursor=pointer]:
                    - img [ref=e210]
                  - button "Nghỉ có phép" [ref=e213] [cursor=pointer]:
                    - img [ref=e214]
                - textbox "Ghi chú..." [ref=e216]
                - generic [ref=e217]: Có mặt
            - generic [ref=e219]:
              - generic [ref=e220]:
                - generic [ref=e221]: B
                - paragraph [ref=e223]: Trần Thị Bình
              - generic [ref=e224]:
                - generic [ref=e225]:
                  - button "Có mặt" [ref=e226] [cursor=pointer]:
                    - img [ref=e227]
                  - button "Vắng" [ref=e229] [cursor=pointer]:
                    - img [ref=e230]
                  - button "Muộn" [ref=e233] [cursor=pointer]:
                    - img [ref=e234]
                  - button "Nghỉ có phép" [ref=e237] [cursor=pointer]:
                    - img [ref=e238]
                - textbox "Ghi chú..." [ref=e240]
                - generic [ref=e241]: Vắng mặt
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Attendance Flow', () => {
  4  |   test('should submit daily attendance for a class', async ({ page }) => {
  5  |     await page.goto('/attendance');
  6  |     
  7  |     // Select class with students (Mầm 1)
  8  |     await page.waitForSelector('select');
  9  |     const classSelect = page.locator('select').first();
  10 |     await classSelect.selectOption({ label: 'Mầm 1' });
  11 |     
  12 |     await page.waitForTimeout(2000);
  13 |     
  14 |     // Find Nguyễn Văn An row
  15 |     const studentRow = page.locator('div.p-4.flex').filter({ hasText: 'Nguyễn Văn An' }).first();
> 16 |     await expect(studentRow).toBeVisible();
     |                              ^ Error: expect(locator).toBeVisible() failed
  17 |     
  18 |     // Mark as Absent (Vắng)
  19 |     await studentRow.locator('button[title="Vắng"]').click();
  20 |     await expect(studentRow).toContainText('Vắng mặt');
  21 |     
  22 |     // Add note
  23 |     await studentRow.locator('input[placeholder="Ghi chú..."]').fill('Nghỉ ốm có xin phép');
  24 |     
  25 |     // Mark as Excused (Nghỉ có phép)
  26 |     await studentRow.locator('button[title="Nghỉ có phép"]').click();
  27 |     await expect(studentRow).toContainText('Có phép');
  28 |     
  29 |     // Save
  30 |     await page.click('button:has-text("Lưu điểm danh")');
  31 |     // Check for success toast
  32 |     await expect(page.locator('text=Thành công')).toBeVisible();
  33 |   });
  34 | });
  35 | 
```