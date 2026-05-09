# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notifications.spec.ts >> Notification System >> should create and display system announcements
- Location: tests\e2e\notifications.spec.ts:4:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[placeholder*="Tiêu đề"]')

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
              - heading "Thông báo" [level=1] [ref=e94]
              - paragraph [ref=e95]: 3 thông báo chưa đọc · Tổng 3
            - generic [ref=e96]:
              - button "Đánh dấu tất cả đã đọc" [ref=e97] [cursor=pointer]:
                - img [ref=e99]
                - generic [ref=e102]: Đánh dấu tất cả đã đọc
              - button "Tạo thông báo" [ref=e103] [cursor=pointer]:
                - img [ref=e105]
                - generic [ref=e106]: Tạo thông báo
          - generic [ref=e107]:
            - generic [ref=e108]:
              - img [ref=e109]
              - textbox "Tìm kiếm thông báo..." [ref=e112]
            - generic [ref=e113]:
              - img
              - combobox [ref=e114] [cursor=pointer]:
                - option "Tất cả loại" [selected]
                - option "Chung"
                - option "Sự kiện"
                - option "Nghỉ lễ"
                - option "Yêu cầu"
                - option "Vắng mặt"
          - generic [ref=e115]:
            - generic [ref=e118]:
              - img [ref=e120]
              - generic [ref=e123]:
                - generic [ref=e125]:
                  - paragraph [ref=e126]: Nhắc nhở nộp học phí
                  - generic [ref=e127]: Cảnh báo
                - paragraph [ref=e129]: Quý phụ huynh vui lòng hoàn tất học phí tháng 10 trước ngày 10/10.
                - generic [ref=e130]:
                  - generic [ref=e131]:
                    - generic [ref=e132]: 21:05:46 9/5/2026
                    - generic [ref=e133]: "Gửi: Tất cả"
                  - generic [ref=e134]:
                    - button "Đánh dấu đã đọc" [ref=e135] [cursor=pointer]:
                      - img [ref=e136]
                    - button "Chỉnh sửa" [ref=e139] [cursor=pointer]:
                      - img [ref=e140]
                    - button "Xóa" [ref=e142] [cursor=pointer]:
                      - img [ref=e143]
            - generic [ref=e148]:
              - img [ref=e150]
              - generic [ref=e153]:
                - generic [ref=e155]:
                  - paragraph [ref=e156]: Thông báo họp phụ huynh
                  - generic [ref=e157]: Thông tin
                - paragraph [ref=e159]: Kính mời phụ huynh tham gia buổi họp đầu năm.
                - generic [ref=e160]:
                  - generic [ref=e161]:
                    - generic [ref=e162]: 17:55:25 9/5/2026
                    - generic [ref=e163]: "Gửi: Tất cả"
                  - generic [ref=e164]:
                    - button "Đánh dấu đã đọc" [ref=e165] [cursor=pointer]:
                      - img [ref=e166]
                    - button "Chỉnh sửa" [ref=e169] [cursor=pointer]:
                      - img [ref=e170]
                    - button "Xóa" [ref=e172] [cursor=pointer]:
                      - img [ref=e173]
            - generic [ref=e178]:
              - img [ref=e180]
              - generic [ref=e183]:
                - generic [ref=e185]:
                  - paragraph [ref=e186]: Sự kiện Trung Thu
                  - generic [ref=e187]: Thông báo
                - paragraph [ref=e189]: Trường tổ chức múa lân vào tối thứ 6.
                - generic [ref=e190]:
                  - generic [ref=e191]:
                    - generic [ref=e192]: 17:55:25 9/5/2026
                    - generic [ref=e193]: "Gửi: Tất cả"
                  - generic [ref=e194]:
                    - button "Đánh dấu đã đọc" [ref=e195] [cursor=pointer]:
                      - img [ref=e196]
                    - button "Chỉnh sửa" [ref=e199] [cursor=pointer]:
                      - img [ref=e200]
                    - button "Xóa" [ref=e202] [cursor=pointer]:
                      - img [ref=e203]
  - dialog "Tạo thông báo mới" [ref=e206]:
    - generic [active] [ref=e208]:
      - generic [ref=e209]:
        - generic [ref=e210]:
          - heading "Tạo thông báo mới" [level=2] [ref=e211]
          - paragraph [ref=e212]: Tạo thông báo mới gửi đến phụ huynh hoặc giáo viên
        - button "Đóng" [ref=e213] [cursor=pointer]:
          - img [ref=e214]
      - generic [ref=e218]:
        - generic [ref=e219]:
          - generic [ref=e220]: Tiêu đề*
          - textbox "Tiêu đề*" [ref=e222]:
            - /placeholder: Nhập tiêu đề thông báo...
        - generic [ref=e223]:
          - generic [ref=e224]: Nội dung *
          - textbox "Nhập nội dung thông báo..." [ref=e225]
        - generic [ref=e226]:
          - generic [ref=e227]: Loại thông báo *
          - generic [ref=e228]:
            - generic [ref=e229] [cursor=pointer]:
              - radio "Thông tin" [checked] [ref=e230]
              - text: Thông tin
            - generic [ref=e231] [cursor=pointer]:
              - radio "Thông báo" [ref=e232]
              - text: Thông báo
            - generic [ref=e233] [cursor=pointer]:
              - radio "Thành công" [ref=e234]
              - text: Thành công
            - generic [ref=e235] [cursor=pointer]:
              - radio "Cảnh báo" [ref=e236]
              - text: Cảnh báo
            - generic [ref=e237] [cursor=pointer]:
              - radio "Lỗi" [ref=e238]
              - text: Lỗi
        - generic [ref=e239]:
          - generic [ref=e240]: Gửi đến
          - generic [ref=e241]:
            - generic [ref=e242] [cursor=pointer]:
              - radio "Tất cả" [checked] [ref=e243]
              - text: Tất cả
            - generic [ref=e244] [cursor=pointer]:
              - radio "Giáo viên" [ref=e245]
              - text: Giáo viên
            - generic [ref=e246] [cursor=pointer]:
              - radio "Phụ huynh" [ref=e247]
              - text: Phụ huynh
            - generic [ref=e248] [cursor=pointer]:
              - radio "Quản trị viên" [ref=e249]
              - text: Quản trị viên
        - generic [ref=e251]:
          - generic [ref=e252]: Thời gian gửi
          - generic [ref=e253]:
            - generic [ref=e254] [cursor=pointer]:
              - radio "Gửi ngay" [checked] [ref=e255]
              - text: Gửi ngay
            - generic [ref=e256] [cursor=pointer]:
              - radio "Hẹn lịch" [ref=e257]
              - text: Hẹn lịch
        - generic [ref=e258]:
          - button "Hủy" [ref=e259] [cursor=pointer]:
            - generic [ref=e260]: Hủy
          - button "Tạo thông báo" [ref=e261] [cursor=pointer]:
            - generic [ref=e262]: Tạo thông báo
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Notification System', () => {
  4  |   test('should create and display system announcements', async ({ page }) => {
  5  |     await page.goto('/notifications');
  6  |     
  7  |     // 1. Create Notification
  8  |     await page.click('button:has-text("Tạo thông báo")');
  9  |     
  10 |     // Fill title and message in modal
> 11 |     await page.fill('input[placeholder*="Tiêu đề"]', 'Thông báo E2E Test');
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  12 |     await page.fill('textarea[placeholder*="Nội dung"]', 'Nội dung thông báo tự động từ kịch bản kiểm thử.');
  13 |     
  14 |     // Select type: 'Thành công' (using text from screenshot)
  15 |     await page.locator('label').filter({ hasText: 'Thành công' }).first().click();
  16 |     
  17 |     // Select target: 'Tất cả'
  18 |     await page.locator('label').filter({ hasText: 'Tất cả' }).first().click();
  19 |     
  20 |     // Click 'Tạo thông báo' button in modal footer
  21 |     await page.locator('button:has-text("Tạo thông báo")').last().click();
  22 | 
  23 |     // 2. Verify in list
  24 |     await expect(page.locator('text=Thông báo E2E Test').first()).toBeVisible();
  25 |     
  26 |     // 3. Verify on Dashboard
  27 |     await page.goto('/');
  28 |     await expect(page.locator('text=Thông báo E2E Test').first()).toBeVisible();
  29 |   });
  30 | });
  31 | 
```