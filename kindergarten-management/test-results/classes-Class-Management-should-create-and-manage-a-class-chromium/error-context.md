# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: classes.spec.ts >> Class Management >> should create and manage a class
- Location: tests\e2e\classes.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Lớp Test E2E 1778337070635').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Lớp Test E2E 1778337070635').first()

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
            - heading "Quản lý lớp học" [level=1] [ref=e94]
            - paragraph [ref=e95]: 15 lớp học
          - button "Thêm lớp" [ref=e97] [cursor=pointer]:
            - img [ref=e99]
            - generic [ref=e100]: Thêm lớp
        - generic [ref=e101]:
          - generic [ref=e103]:
            - generic [ref=e104]:
              - paragraph [ref=e105]: Tổng lớp
              - paragraph [ref=e106]: "15"
            - img [ref=e108]
          - generic [ref=e113]:
            - generic [ref=e114]:
              - paragraph [ref=e115]: Tổng học sinh (trang hiện tại)
              - paragraph [ref=e116]: "1"
            - img [ref=e118]
          - generic [ref=e124]:
            - generic [ref=e125]:
              - paragraph [ref=e126]: Lớp đầy
              - paragraph [ref=e127]: "0"
            - img [ref=e129]
        - generic [ref=e139]:
          - generic:
            - img
          - textbox "Tìm theo tên lớp..." [ref=e140]
        - generic [ref=e141]:
          - generic [ref=e144]:
            - heading "Danh sách lớp học" [level=3] [ref=e145]
            - paragraph [ref=e146]: 10 kết quả / trang
          - generic [ref=e148]:
            - table [ref=e150]:
              - rowgroup [ref=e151]:
                - row "Lớp học Giáo viên Phòng Sĩ số Trạng thái Hành động" [ref=e152]:
                  - columnheader [ref=e153]:
                    - checkbox [ref=e154] [cursor=pointer]
                  - columnheader "Lớp học" [ref=e155] [cursor=pointer]:
                    - generic [ref=e156]:
                      - text: Lớp học
                      - img [ref=e157]
                  - columnheader "Giáo viên" [ref=e159]:
                    - generic [ref=e160]: Giáo viên
                  - columnheader "Phòng" [ref=e161]:
                    - generic [ref=e162]: Phòng
                  - columnheader "Sĩ số" [ref=e163] [cursor=pointer]:
                    - generic [ref=e164]:
                      - text: Sĩ số
                      - img [ref=e165]
                  - columnheader "Trạng thái" [ref=e168]:
                    - generic [ref=e169]: Trạng thái
                  - columnheader "Hành động" [ref=e170]:
                    - generic [ref=e171]: Hành động
              - rowgroup [ref=e172]:
                - row "Chồi 1 Chưa phân công Chưa phân công P201 0/30 Còn chỗ" [ref=e173] [cursor=pointer]:
                  - cell [ref=e174]:
                    - checkbox [ref=e175]
                  - cell "Chồi 1" [ref=e176]:
                    - generic [ref=e177]:
                      - img [ref=e179]
                      - paragraph [ref=e184]: Chồi 1
                  - cell "Chưa phân công Chưa phân công" [ref=e185]:
                    - generic [ref=e186]:
                      - generic "Chưa phân công" [ref=e188]:
                        - generic [ref=e189]: CC
                      - generic [ref=e190]: Chưa phân công
                  - cell "P201" [ref=e191]
                  - cell "0/30" [ref=e192]:
                    - generic [ref=e193]:
                      - img [ref=e194]
                      - generic [ref=e199]: 0/30
                  - cell "Còn chỗ" [ref=e200]:
                    - generic [ref=e201]: Còn chỗ
                  - cell [ref=e202]:
                    - generic [ref=e203]:
                      - button "Chỉnh sửa" [ref=e204]:
                        - img [ref=e205]
                      - button "Xóa" [ref=e208]:
                        - img [ref=e209]
                - row "Lá 1 Chưa phân công Chưa phân công P301 0/30 Còn chỗ" [ref=e212] [cursor=pointer]:
                  - cell [ref=e213]:
                    - checkbox [ref=e214]
                  - cell "Lá 1" [ref=e215]:
                    - generic [ref=e216]:
                      - img [ref=e218]
                      - paragraph [ref=e223]: Lá 1
                  - cell "Chưa phân công Chưa phân công" [ref=e224]:
                    - generic [ref=e225]:
                      - generic "Chưa phân công" [ref=e227]:
                        - generic [ref=e228]: CC
                      - generic [ref=e229]: Chưa phân công
                  - cell "P301" [ref=e230]
                  - cell "0/30" [ref=e231]:
                    - generic [ref=e232]:
                      - img [ref=e233]
                      - generic [ref=e238]: 0/30
                  - cell "Còn chỗ" [ref=e239]:
                    - generic [ref=e240]: Còn chỗ
                  - cell [ref=e241]:
                    - generic [ref=e242]:
                      - button "Chỉnh sửa" [ref=e243]:
                        - img [ref=e244]
                      - button "Xóa" [ref=e247]:
                        - img [ref=e248]
                - row "Lớp Mầm A1 Test Chưa phân công Chưa phân công A101 1/25 Còn chỗ" [ref=e251] [cursor=pointer]:
                  - cell [ref=e252]:
                    - checkbox [ref=e253]
                  - cell "Lớp Mầm A1 Test" [ref=e254]:
                    - generic [ref=e255]:
                      - img [ref=e257]
                      - paragraph [ref=e262]: Lớp Mầm A1 Test
                  - cell "Chưa phân công Chưa phân công" [ref=e263]:
                    - generic [ref=e264]:
                      - generic "Chưa phân công" [ref=e266]:
                        - generic [ref=e267]: CC
                      - generic [ref=e268]: Chưa phân công
                  - cell "A101" [ref=e269]
                  - cell "1/25" [ref=e270]:
                    - generic [ref=e271]:
                      - img [ref=e272]
                      - generic [ref=e277]: 1/25
                  - cell "Còn chỗ" [ref=e278]:
                    - generic [ref=e279]: Còn chỗ
                  - cell [ref=e280]:
                    - generic [ref=e281]:
                      - button "Chỉnh sửa" [ref=e282]:
                        - img [ref=e283]
                      - button "Xóa" [ref=e286]:
                        - img [ref=e287]
                - row "Lớp Test E2E Chưa phân công Chưa phân công Room-E2E 0/20 Còn chỗ" [ref=e290] [cursor=pointer]:
                  - cell [ref=e291]:
                    - checkbox [ref=e292]
                  - cell "Lớp Test E2E" [ref=e293]:
                    - generic [ref=e294]:
                      - img [ref=e296]
                      - paragraph [ref=e301]: Lớp Test E2E
                  - cell "Chưa phân công Chưa phân công" [ref=e302]:
                    - generic [ref=e303]:
                      - generic "Chưa phân công" [ref=e305]:
                        - generic [ref=e306]: CC
                      - generic [ref=e307]: Chưa phân công
                  - cell "Room-E2E" [ref=e308]
                  - cell "0/20" [ref=e309]:
                    - generic [ref=e310]:
                      - img [ref=e311]
                      - generic [ref=e316]: 0/20
                  - cell "Còn chỗ" [ref=e317]:
                    - generic [ref=e318]: Còn chỗ
                  - cell [ref=e319]:
                    - generic [ref=e320]:
                      - button "Chỉnh sửa" [ref=e321]:
                        - img [ref=e322]
                      - button "Xóa" [ref=e325]:
                        - img [ref=e326]
                - row "Lớp Test E2E Chưa phân công Chưa phân công Room-E2E 0/20 Còn chỗ" [ref=e329] [cursor=pointer]:
                  - cell [ref=e330]:
                    - checkbox [ref=e331]
                  - cell "Lớp Test E2E" [ref=e332]:
                    - generic [ref=e333]:
                      - img [ref=e335]
                      - paragraph [ref=e340]: Lớp Test E2E
                  - cell "Chưa phân công Chưa phân công" [ref=e341]:
                    - generic [ref=e342]:
                      - generic "Chưa phân công" [ref=e344]:
                        - generic [ref=e345]: CC
                      - generic [ref=e346]: Chưa phân công
                  - cell "Room-E2E" [ref=e347]
                  - cell "0/20" [ref=e348]:
                    - generic [ref=e349]:
                      - img [ref=e350]
                      - generic [ref=e355]: 0/20
                  - cell "Còn chỗ" [ref=e356]:
                    - generic [ref=e357]: Còn chỗ
                  - cell [ref=e358]:
                    - generic [ref=e359]:
                      - button "Chỉnh sửa" [ref=e360]:
                        - img [ref=e361]
                      - button "Xóa" [ref=e364]:
                        - img [ref=e365]
                - row "Lớp Test E2E Chưa phân công Chưa phân công Room-E2E 0/20 Còn chỗ" [ref=e368] [cursor=pointer]:
                  - cell [ref=e369]:
                    - checkbox [ref=e370]
                  - cell "Lớp Test E2E" [ref=e371]:
                    - generic [ref=e372]:
                      - img [ref=e374]
                      - paragraph [ref=e379]: Lớp Test E2E
                  - cell "Chưa phân công Chưa phân công" [ref=e380]:
                    - generic [ref=e381]:
                      - generic "Chưa phân công" [ref=e383]:
                        - generic [ref=e384]: CC
                      - generic [ref=e385]: Chưa phân công
                  - cell "Room-E2E" [ref=e386]
                  - cell "0/20" [ref=e387]:
                    - generic [ref=e388]:
                      - img [ref=e389]
                      - generic [ref=e394]: 0/20
                  - cell "Còn chỗ" [ref=e395]:
                    - generic [ref=e396]: Còn chỗ
                  - cell [ref=e397]:
                    - generic [ref=e398]:
                      - button "Chỉnh sửa" [ref=e399]:
                        - img [ref=e400]
                      - button "Xóa" [ref=e403]:
                        - img [ref=e404]
                - row "Lớp Test E2E Chưa phân công Chưa phân công Room-E2E 0/20 Còn chỗ" [ref=e407] [cursor=pointer]:
                  - cell [ref=e408]:
                    - checkbox [ref=e409]
                  - cell "Lớp Test E2E" [ref=e410]:
                    - generic [ref=e411]:
                      - img [ref=e413]
                      - paragraph [ref=e418]: Lớp Test E2E
                  - cell "Chưa phân công Chưa phân công" [ref=e419]:
                    - generic [ref=e420]:
                      - generic "Chưa phân công" [ref=e422]:
                        - generic [ref=e423]: CC
                      - generic [ref=e424]: Chưa phân công
                  - cell "Room-E2E" [ref=e425]
                  - cell "0/20" [ref=e426]:
                    - generic [ref=e427]:
                      - img [ref=e428]
                      - generic [ref=e433]: 0/20
                  - cell "Còn chỗ" [ref=e434]:
                    - generic [ref=e435]: Còn chỗ
                  - cell [ref=e436]:
                    - generic [ref=e437]:
                      - button "Chỉnh sửa" [ref=e438]:
                        - img [ref=e439]
                      - button "Xóa" [ref=e442]:
                        - img [ref=e443]
                - row "Lớp Test E2E Chưa phân công Chưa phân công Room-E2E 0/20 Còn chỗ" [ref=e446] [cursor=pointer]:
                  - cell [ref=e447]:
                    - checkbox [ref=e448]
                  - cell "Lớp Test E2E" [ref=e449]:
                    - generic [ref=e450]:
                      - img [ref=e452]
                      - paragraph [ref=e457]: Lớp Test E2E
                  - cell "Chưa phân công Chưa phân công" [ref=e458]:
                    - generic [ref=e459]:
                      - generic "Chưa phân công" [ref=e461]:
                        - generic [ref=e462]: CC
                      - generic [ref=e463]: Chưa phân công
                  - cell "Room-E2E" [ref=e464]
                  - cell "0/20" [ref=e465]:
                    - generic [ref=e466]:
                      - img [ref=e467]
                      - generic [ref=e472]: 0/20
                  - cell "Còn chỗ" [ref=e473]:
                    - generic [ref=e474]: Còn chỗ
                  - cell [ref=e475]:
                    - generic [ref=e476]:
                      - button "Chỉnh sửa" [ref=e477]:
                        - img [ref=e478]
                      - button "Xóa" [ref=e481]:
                        - img [ref=e482]
                - row "Lớp Test E2E Chưa phân công Chưa phân công Room-E2E 0/20 Còn chỗ" [ref=e485] [cursor=pointer]:
                  - cell [ref=e486]:
                    - checkbox [ref=e487]
                  - cell "Lớp Test E2E" [ref=e488]:
                    - generic [ref=e489]:
                      - img [ref=e491]
                      - paragraph [ref=e496]: Lớp Test E2E
                  - cell "Chưa phân công Chưa phân công" [ref=e497]:
                    - generic [ref=e498]:
                      - generic "Chưa phân công" [ref=e500]:
                        - generic [ref=e501]: CC
                      - generic [ref=e502]: Chưa phân công
                  - cell "Room-E2E" [ref=e503]
                  - cell "0/20" [ref=e504]:
                    - generic [ref=e505]:
                      - img [ref=e506]
                      - generic [ref=e511]: 0/20
                  - cell "Còn chỗ" [ref=e512]:
                    - generic [ref=e513]: Còn chỗ
                  - cell [ref=e514]:
                    - generic [ref=e515]:
                      - button "Chỉnh sửa" [ref=e516]:
                        - img [ref=e517]
                      - button "Xóa" [ref=e520]:
                        - img [ref=e521]
                - row "Lớp Test E2E Chưa phân công Chưa phân công Room-E2E 0/20 Còn chỗ" [ref=e524] [cursor=pointer]:
                  - cell [ref=e525]:
                    - checkbox [ref=e526]
                  - cell "Lớp Test E2E" [ref=e527]:
                    - generic [ref=e528]:
                      - img [ref=e530]
                      - paragraph [ref=e535]: Lớp Test E2E
                  - cell "Chưa phân công Chưa phân công" [ref=e536]:
                    - generic [ref=e537]:
                      - generic "Chưa phân công" [ref=e539]:
                        - generic [ref=e540]: CC
                      - generic [ref=e541]: Chưa phân công
                  - cell "Room-E2E" [ref=e542]
                  - cell "0/20" [ref=e543]:
                    - generic [ref=e544]:
                      - img [ref=e545]
                      - generic [ref=e550]: 0/20
                  - cell "Còn chỗ" [ref=e551]:
                    - generic [ref=e552]: Còn chỗ
                  - cell [ref=e553]:
                    - generic [ref=e554]:
                      - button "Chỉnh sửa" [ref=e555]:
                        - img [ref=e556]
                      - button "Xóa" [ref=e559]:
                        - img [ref=e560]
            - generic [ref=e563]:
              - paragraph [ref=e564]:
                - text: Hiển thị
                - generic [ref=e565]: 1–10
                - text: trong 15 kết quả
              - generic [ref=e566]:
                - button "Trang trước" [disabled] [ref=e567]:
                  - img [ref=e568]
                - button "1" [ref=e570] [cursor=pointer]
                - button "2" [ref=e571] [cursor=pointer]
                - button "Trang tiếp" [ref=e572] [cursor=pointer]:
                  - img [ref=e573]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Class Management', () => {
  4  |   test('should create and manage a class', async ({ page }) => {
  5  |     await page.goto('/classes');
  6  |     
  7  |     // 1. Create
  8  |     await page.click('text=Thêm lớp');
  9  |     await page.waitForURL('**/classes/new');
  10 |     
  11 |     const className = 'Lớp Test E2E ' + Date.now();
  12 |     await page.fill('input[name="name"]', className);
  13 |     await page.fill('input[name="room"]', 'Room-E2E');
  14 |     await page.fill('input[name="max_students"]', '20');
  15 |     
  16 |     await page.click('button[type="submit"]');
  17 | 
  18 |     // Wait for redirect back
  19 |     await page.waitForURL('**/classes');
> 20 |     await expect(page.locator(`text=${className}`).first()).toBeVisible();
     |                                                             ^ Error: expect(locator).toBeVisible() failed
  21 | 
  22 |     // 2. Edit
  23 |     // Click on the row to go to details
  24 |     await page.click(`text=${className} >> nth=0`);
  25 |     await page.waitForURL(/\/classes\/.+/);
  26 |     
  27 |     // Click edit button in detail page
  28 |     await page.click('button:has-text("Chỉnh sửa")');
  29 |     await page.waitForURL(/\/classes\/.+\/edit/);
  30 |     
  31 |     await page.fill('input[name="room"]', 'Room-E2E-Updated');
  32 |     await page.click('button[type="submit"]');
  33 |     
  34 |     await page.waitForURL('**/classes');
  35 |     await expect(page.locator('text=Room-E2E-Updated').first()).toBeVisible();
  36 |   });
  37 | });
  38 | 
```