# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: teachers.spec.ts >> Teacher Management >> should create, update and delete a teacher
- Location: tests\e2e\teachers.spec.ts:4:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('tr').filter({ hasText: 'GV Test Automation 1778337072352' }).first().locator('button[title="Chỉnh sửa"]')

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
            - heading "Quản lý giáo viên" [level=1] [ref=e94]
            - paragraph [ref=e95]: 10 giáo viên
          - button "Thêm giáo viên" [ref=e97] [cursor=pointer]:
            - img [ref=e99]
            - generic [ref=e102]: Thêm giáo viên
        - generic [ref=e107]:
          - generic:
            - img
          - textbox "Tìm kiếm theo tên, mã, email, số điện thoại..." [ref=e108]
        - table [ref=e113]:
          - rowgroup [ref=e114]:
            - row "Giáo viên Mã GV Điện thoại Trạng thái Thao tác" [ref=e115]:
              - columnheader [ref=e116]:
                - checkbox [ref=e117] [cursor=pointer]
              - columnheader "Giáo viên" [ref=e118]:
                - generic [ref=e119]: Giáo viên
              - columnheader "Mã GV" [ref=e120]:
                - generic [ref=e121]: Mã GV
              - columnheader "Điện thoại" [ref=e122]:
                - generic [ref=e123]: Điện thoại
              - columnheader "Trạng thái" [ref=e124]:
                - generic [ref=e125]: Trạng thái
              - columnheader "Thao tác" [ref=e126]:
                - generic [ref=e127]: Thao tác
          - rowgroup [ref=e128]:
            - row "GV Test Automation GV Test Automation Giáo viên — 0123456789 Đang làm việc" [ref=e129]:
              - cell [ref=e130]:
                - checkbox [ref=e131] [cursor=pointer]
              - cell "GV Test Automation GV Test Automation Giáo viên" [ref=e132]:
                - generic [ref=e133]:
                  - generic "GV Test Automation" [ref=e135]:
                    - generic [ref=e136]: GA
                  - generic [ref=e137]:
                    - paragraph [ref=e138]: GV Test Automation
                    - paragraph [ref=e139]: Giáo viên
              - cell "—" [ref=e140]
              - cell "0123456789" [ref=e141]:
                - generic [ref=e142]:
                  - img [ref=e143]
                  - generic [ref=e145]: "0123456789"
              - cell "Đang làm việc" [ref=e146]:
                - generic [ref=e147]: Đang làm việc
              - cell [ref=e148]:
                - generic [ref=e149]:
                  - button "Sửa" [ref=e150] [cursor=pointer]:
                    - img [ref=e151]
                  - button "Xóa" [ref=e153] [cursor=pointer]:
                    - img [ref=e154]
            - row "GV Test Automation GV Test Automation Giáo viên — 0123456789 Đang làm việc" [ref=e157]:
              - cell [ref=e158]:
                - checkbox [ref=e159] [cursor=pointer]
              - cell "GV Test Automation GV Test Automation Giáo viên" [ref=e160]:
                - generic [ref=e161]:
                  - generic "GV Test Automation" [ref=e163]:
                    - generic [ref=e164]: GA
                  - generic [ref=e165]:
                    - paragraph [ref=e166]: GV Test Automation
                    - paragraph [ref=e167]: Giáo viên
              - cell "—" [ref=e168]
              - cell "0123456789" [ref=e169]:
                - generic [ref=e170]:
                  - img [ref=e171]
                  - generic [ref=e173]: "0123456789"
              - cell "Đang làm việc" [ref=e174]:
                - generic [ref=e175]: Đang làm việc
              - cell [ref=e176]:
                - generic [ref=e177]:
                  - button "Sửa" [ref=e178] [cursor=pointer]:
                    - img [ref=e179]
                  - button "Xóa" [ref=e181] [cursor=pointer]:
                    - img [ref=e182]
            - row "GV Test Automation GV Test Automation Giáo viên — 0123456789 Đang làm việc" [ref=e185]:
              - cell [ref=e186]:
                - checkbox [ref=e187] [cursor=pointer]
              - cell "GV Test Automation GV Test Automation Giáo viên" [ref=e188]:
                - generic [ref=e189]:
                  - generic "GV Test Automation" [ref=e191]:
                    - generic [ref=e192]: GA
                  - generic [ref=e193]:
                    - paragraph [ref=e194]: GV Test Automation
                    - paragraph [ref=e195]: Giáo viên
              - cell "—" [ref=e196]
              - cell "0123456789" [ref=e197]:
                - generic [ref=e198]:
                  - img [ref=e199]
                  - generic [ref=e201]: "0123456789"
              - cell "Đang làm việc" [ref=e202]:
                - generic [ref=e203]: Đang làm việc
              - cell [ref=e204]:
                - generic [ref=e205]:
                  - button "Sửa" [ref=e206] [cursor=pointer]:
                    - img [ref=e207]
                  - button "Xóa" [ref=e209] [cursor=pointer]:
                    - img [ref=e210]
            - row "GV Test Automation GV Test Automation Giáo viên — 09542418 Đang làm việc" [ref=e213]:
              - cell [ref=e214]:
                - checkbox [ref=e215] [cursor=pointer]
              - cell "GV Test Automation GV Test Automation Giáo viên" [ref=e216]:
                - generic [ref=e217]:
                  - generic "GV Test Automation" [ref=e219]:
                    - generic [ref=e220]: GA
                  - generic [ref=e221]:
                    - paragraph [ref=e222]: GV Test Automation
                    - paragraph [ref=e223]: Giáo viên
              - cell "—" [ref=e224]
              - cell "09542418" [ref=e225]:
                - generic [ref=e226]:
                  - img [ref=e227]
                  - generic [ref=e229]: "09542418"
              - cell "Đang làm việc" [ref=e230]:
                - generic [ref=e231]: Đang làm việc
              - cell [ref=e232]:
                - generic [ref=e233]:
                  - button "Sửa" [ref=e234] [cursor=pointer]:
                    - img [ref=e235]
                  - button "Xóa" [ref=e237] [cursor=pointer]:
                    - img [ref=e238]
            - row "GV Test Automation GV Test Automation Giáo viên — 0940310894 Đang làm việc" [ref=e241]:
              - cell [ref=e242]:
                - checkbox [ref=e243] [cursor=pointer]
              - cell "GV Test Automation GV Test Automation Giáo viên" [ref=e244]:
                - generic [ref=e245]:
                  - generic "GV Test Automation" [ref=e247]:
                    - generic [ref=e248]: GA
                  - generic [ref=e249]:
                    - paragraph [ref=e250]: GV Test Automation
                    - paragraph [ref=e251]: Giáo viên
              - cell "—" [ref=e252]
              - cell "0940310894" [ref=e253]:
                - generic [ref=e254]:
                  - img [ref=e255]
                  - generic [ref=e257]: "0940310894"
              - cell "Đang làm việc" [ref=e258]:
                - generic [ref=e259]: Đang làm việc
              - cell [ref=e260]:
                - generic [ref=e261]:
                  - button "Sửa" [ref=e262] [cursor=pointer]:
                    - img [ref=e263]
                  - button "Xóa" [ref=e265] [cursor=pointer]:
                    - img [ref=e266]
            - row "GV Test Automation GV Test Automation Giáo viên — 0123456789 Đang làm việc" [ref=e269]:
              - cell [ref=e270]:
                - checkbox [ref=e271] [cursor=pointer]
              - cell "GV Test Automation GV Test Automation Giáo viên" [ref=e272]:
                - generic [ref=e273]:
                  - generic "GV Test Automation" [ref=e275]:
                    - generic [ref=e276]: GA
                  - generic [ref=e277]:
                    - paragraph [ref=e278]: GV Test Automation
                    - paragraph [ref=e279]: Giáo viên
              - cell "—" [ref=e280]
              - cell "0123456789" [ref=e281]:
                - generic [ref=e282]:
                  - img [ref=e283]
                  - generic [ref=e285]: "0123456789"
              - cell "Đang làm việc" [ref=e286]:
                - generic [ref=e287]: Đang làm việc
              - cell [ref=e288]:
                - generic [ref=e289]:
                  - button "Sửa" [ref=e290] [cursor=pointer]:
                    - img [ref=e291]
                  - button "Xóa" [ref=e293] [cursor=pointer]:
                    - img [ref=e294]
            - row "GV Test Automation GV Test Automation Giáo viên — 0123456789 Đang làm việc" [ref=e297]:
              - cell [ref=e298]:
                - checkbox [ref=e299] [cursor=pointer]
              - cell "GV Test Automation GV Test Automation Giáo viên" [ref=e300]:
                - generic [ref=e301]:
                  - generic "GV Test Automation" [ref=e303]:
                    - generic [ref=e304]: GA
                  - generic [ref=e305]:
                    - paragraph [ref=e306]: GV Test Automation
                    - paragraph [ref=e307]: Giáo viên
              - cell "—" [ref=e308]
              - cell "0123456789" [ref=e309]:
                - generic [ref=e310]:
                  - img [ref=e311]
                  - generic [ref=e313]: "0123456789"
              - cell "Đang làm việc" [ref=e314]:
                - generic [ref=e315]: Đang làm việc
              - cell [ref=e316]:
                - generic [ref=e317]:
                  - button "Sửa" [ref=e318] [cursor=pointer]:
                    - img [ref=e319]
                  - button "Xóa" [ref=e321] [cursor=pointer]:
                    - img [ref=e322]
            - row "GV Test Automation GV Test Automation Giáo viên — 0123456789 Đang làm việc" [ref=e325]:
              - cell [ref=e326]:
                - checkbox [ref=e327] [cursor=pointer]
              - cell "GV Test Automation GV Test Automation Giáo viên" [ref=e328]:
                - generic [ref=e329]:
                  - generic "GV Test Automation" [ref=e331]:
                    - generic [ref=e332]: GA
                  - generic [ref=e333]:
                    - paragraph [ref=e334]: GV Test Automation
                    - paragraph [ref=e335]: Giáo viên
              - cell "—" [ref=e336]
              - cell "0123456789" [ref=e337]:
                - generic [ref=e338]:
                  - img [ref=e339]
                  - generic [ref=e341]: "0123456789"
              - cell "Đang làm việc" [ref=e342]:
                - generic [ref=e343]: Đang làm việc
              - cell [ref=e344]:
                - generic [ref=e345]:
                  - button "Sửa" [ref=e346] [cursor=pointer]:
                    - img [ref=e347]
                  - button "Xóa" [ref=e349] [cursor=pointer]:
                    - img [ref=e350]
            - row "GV Test Automation 1778337072352 GV Test Automation 1778337072352 Giáo viên — 0123456789 Đang làm việc" [ref=e353]:
              - cell [ref=e354]:
                - checkbox [ref=e355] [cursor=pointer]
              - cell "GV Test Automation 1778337072352 GV Test Automation 1778337072352 Giáo viên" [ref=e356]:
                - generic [ref=e357]:
                  - generic "GV Test Automation 1778337072352" [ref=e359]:
                    - generic [ref=e360]: G1
                  - generic [ref=e361]:
                    - paragraph [ref=e362]: GV Test Automation 1778337072352
                    - paragraph [ref=e363]: Giáo viên
              - cell "—" [ref=e364]
              - cell "0123456789" [ref=e365]:
                - generic [ref=e366]:
                  - img [ref=e367]
                  - generic [ref=e369]: "0123456789"
              - cell "Đang làm việc" [ref=e370]:
                - generic [ref=e371]: Đang làm việc
              - cell [ref=e372]:
                - generic [ref=e373]:
                  - button "Sửa" [ref=e374] [cursor=pointer]:
                    - img [ref=e375]
                  - button "Xóa" [ref=e377] [cursor=pointer]:
                    - img [ref=e378]
            - row "Nguyễn Thu Dung Nguyễn Thu Dung Giáo viên — 0987654321 Đang làm việc" [ref=e381]:
              - cell [ref=e382]:
                - checkbox [ref=e383] [cursor=pointer]
              - cell "Nguyễn Thu Dung Nguyễn Thu Dung Giáo viên" [ref=e384]:
                - generic [ref=e385]:
                  - generic "Nguyễn Thu Dung" [ref=e387]:
                    - generic [ref=e388]: ND
                  - generic [ref=e389]:
                    - paragraph [ref=e390]: Nguyễn Thu Dung
                    - paragraph [ref=e391]: Giáo viên
              - cell "—" [ref=e392]
              - cell "0987654321" [ref=e393]:
                - generic [ref=e394]:
                  - img [ref=e395]
                  - generic [ref=e397]: "0987654321"
              - cell "Đang làm việc" [ref=e398]:
                - generic [ref=e399]: Đang làm việc
              - cell [ref=e400]:
                - generic [ref=e401]:
                  - button "Sửa" [ref=e402] [cursor=pointer]:
                    - img [ref=e403]
                  - button "Xóa" [ref=e405] [cursor=pointer]:
                    - img [ref=e406]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Teacher Management', () => {
  4  |   test('should create, update and delete a teacher', async ({ page }) => {
  5  |     await page.goto('/teachers');
  6  |     
  7  |     // 1. Create
  8  |     await page.click('text=Thêm giáo viên');
  9  |     await page.waitForURL('**/teachers/new');
  10 |     
  11 |     const testName = 'GV Test Automation ' + Date.now();
  12 |     await page.fill('input[name="full_name"]', testName);
  13 |     await page.fill('input[name="phone"]', '0123456789');
  14 |     await page.fill('input[name="email"]', `gv.test.${Date.now()}@example.com`);
  15 |     await page.fill('input[name="password"]', '123456');
  16 |     
  17 |     await page.click('button[type="submit"]');
  18 |     
  19 |     await page.waitForURL('**/teachers');
  20 |     await expect(page.locator(`text=${testName}`).first()).toBeVisible();
  21 | 
  22 |     // 2. Update
  23 |     // Click the edit button (pencil icon) in the row
  24 |     const row = page.locator('tr').filter({ hasText: testName }).first();
> 25 |     await row.locator('button[title="Chỉnh sửa"]').click();
     |                                                    ^ Error: locator.click: Test timeout of 30000ms exceeded.
  26 |     
  27 |     await page.waitForURL(/\/teachers\/.+\/edit/);
  28 |     const updatedName = testName + ' Updated';
  29 |     await page.fill('input[name="full_name"]', updatedName);
  30 |     await page.click('button[type="submit"]');
  31 |     
  32 |     await page.waitForURL('**/teachers');
  33 |     await expect(page.locator(`text=${updatedName}`).first()).toBeVisible();
  34 | 
  35 |     // 3. Delete
  36 |     const updatedRow = page.locator('tr').filter({ hasText: updatedName }).first();
  37 |     
  38 |     // Handle window.confirm before clicking
  39 |     page.once('dialog', dialog => dialog.accept());
  40 |     
  41 |     await updatedRow.locator('button[title="Xóa"]').click();
  42 |     
  43 |     await expect(page.locator(`text=${updatedName}`)).not.toBeVisible();
  44 |   });
  45 | });
  46 | 
```