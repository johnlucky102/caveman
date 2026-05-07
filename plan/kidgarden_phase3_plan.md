# KidGarden – Kế hoạch Coding Phase 3

## Bối cảnh

P1 (Auth + Students + Classes) hoàn thành. P2 (Attendance + Fees + Dashboard stats + Settings school tab + Parents real data + Detail tabs + AttendanceHistory route) đã hardened. Mục tiêu Phase 3: **đưa toàn bộ module còn mock lên real data, hoàn thiện tính năng theo SPEC, và polish UX.**

---

## Phân tích hiện trạng (Post-P2)

### ✅ Đã xong (real data, không cần làm lại)
- Auth (login, signup, session restore, RoleGuard)
- Students CRUD + StudentDetail (tabs Fees + Attendance wired real data)
- Classes CRUD + ClassDetail (attendance real)
- Teachers list (real via `usersService.listTeachers`)
- TeacherForm (create/edit)
- Parents list (real via `usersService.listParents`, hiển thị student links)
- Attendance roll-call (real bulk upsert)
- AttendanceHistory (real, routed `/attendance/history`)
- Fees list + FeeForm (real, search server-side fixed)
- Dashboard stat cards (real: totalStudents, attendance today, debt)
- Dashboard attendance table by class (real, top 5)
- Dashboard notifications panel (real từ `notifications` table)
- Dashboard bar chart "Học sinh theo khối" (real)
- Settings school tab (real via `settingsService`)
- RLS attendance scope (teacher chỉ read/write lớp mình)

### ❌ Còn mock / placeholder / chưa hoàn thiện

| Module | Vấn đề |
|---|---|
| `Notifications.tsx` | 100% mock data (`mockNotifications` local state). CRUD hoàn toàn client-side. Chưa có `notificationsService.ts` |
| `NotificationForm.tsx` | Submit giả (setTimeout 800ms), không gọi API |
| `Dashboard.tsx` – Line chart | `attendanceTrend` hardcoded synthetic (T2–CN) |
| `Dashboard.tsx` – Pie chart | `feeStatus` hardcoded 70/30, không query DB |
| `Reports.tsx` – Tab students | `studentReports` mock array (5 rows) |
| `Reports.tsx` – Tab attendance | `attendanceReports` mock array (5 rows) |
| `Reports.tsx` – Tab financial | `financialSummary` mock object. Revenue/expense/net giả |
| `Reports.tsx` – Tab overview | `recentReports` mock, download buttons chưa hoạt động |
| `Settings.tsx` – Tab academic_year | `mockAcademicYears` local state, CRUD giả |
| `Settings.tsx` – Tab users | `mockUsers` local state, CRUD giả |
| Export CSV | Buttons "Xuất Excel" ở Students, Reports → chưa hoạt động |
| Print biên nhận | FeeForm "In biên nhận" → chưa hoạt động |
| `TestAuth.tsx` | Còn trong build (đã bỏ khỏi router nhưng vẫn trong bundle) |

---

## Các Phase Chi Tiết

---

### Phase 3A – Notifications Service + Real Data *(Ưu tiên cao nhất)*

**Mục tiêu:** Thay mock notifications bằng real CRUD trên Supabase.

**Model khuyên dùng:** 5.4 Medium (nhiều file, cần hiểu schema `notifications` + `notification_reads`)

#### 3A-1: Tạo `notificationsService.ts`

**File mới:** `src/services/notificationsService.ts`

**Việc cần làm:**
- [ ] `listNotifications(query)` – query `notifications` table, join `notification_reads` để tính `is_read`, support filter by `kind`, search by title/body, phân trang
- [ ] `createNotification(data)` – insert vào `notifications`, set `sent_by = auth.uid()`, `sent_at = NOW()`
- [ ] `updateNotification(id, data)` – update title/body/kind/target_type
- [ ] `deleteNotification(id)` – soft delete hoặc hard delete
- [ ] `markAsRead(notificationId)` – insert vào `notification_reads` với `user_id = auth.uid()`
- [ ] `markAllAsRead()` – bulk insert notification_reads cho tất cả unread

**Mapping DB ↔ UI types:**
| DB column | UI field |
|---|---|
| `body` | `message` |
| `kind` | `type` (cần map: general→info, event→announcement, holiday→warning, request→info, absence→error) |
| `sent_by` | `created_by` |
| `recipient_user_id` / `recipient_parent_id` | `target_user_id` |

#### 3A-2: Wire `Notifications.tsx` với service

**File:** `src/pages/Notifications.tsx`

**Việc cần làm:**
- [ ] Xóa `mockNotifications` array
- [ ] Thêm `useEffect` gọi `listNotifications()`
- [ ] Wire `markAsRead`, `markAllRead`, `deleteNotification` qua service
- [ ] Loading / error states
- [ ] Pagination (nếu > 20 notifications)

#### 3A-3: Wire `NotificationForm.tsx` với service

**File:** `src/pages/NotificationForm.tsx`

**Việc cần làm:**
- [ ] Xóa `setTimeout` giả
- [ ] Gọi `createNotification()` / `updateNotification()` qua service
- [ ] Map UI `type` → DB `kind`
- [ ] Handle `target_type`: 'all' / role-based → set `target_type` + `recipient_user_id` / `recipient_parent_id`
- [ ] Schedule feature: nếu `scheduleType === 'schedule'`, set `sent_at` = scheduled datetime, ngược lại `sent_at = NOW()`

#### 3A-4: RLS cho Notifications (kiểm tra / bổ sung)

**File:** `supabase/rls_p3_notifications.sql` *(file mới nếu cần)*

**Việc cần làm:**
- [ ] Kiểm tra Teacher có quyền tạo notification không (hiện chỉ Admin có `FOR ALL`)
- [ ] Nếu SPEC yêu cầu Teacher gửi thông báo cho lớp mình → cần thêm policy
- [ ] Xác nhận Parent chỉ đọc notification gửi cho mình

---

### Phase 3B – Dashboard Chart Hardening *(Ưu tiên cao)*

**Mục tiêu:** Thay synthetic data cho 2 charts còn lại (line chart + pie chart).

**Model khuyên dùng:** 5.4-mini (scope nhỏ, rõ file)

#### 3B-1: Attendance Trend (7 ngày gần nhất)

**Files:**
- `src/services/dashboardService.ts` – thêm function
- `src/pages/Dashboard.tsx` – wire data

**Việc cần làm:**
- [ ] Thêm `getAttendanceTrend()` trong `dashboardService.ts`:
  - Query `attendance` 7 ngày gần nhất
  - Group by `attendance_date`, đếm `present` vs total
  - Return `Array<{ day: string; rate: number }>`
- [ ] Thay `attendanceTrend` hardcoded bằng data từ service
- [ ] Xử lý ngày không có data (weekend) → rate = 0 hoặc skip

#### 3B-2: Fee Status Pie Chart (real)

**Files:**
- `src/services/dashboardService.ts` – thêm function
- `src/pages/Dashboard.tsx` – wire data

**Việc cần làm:**
- [ ] Thêm `getFeeStatusSummary()`:
  - Query `fee_records` group by `status`
  - Return `{ paid: number; unpaid: number; partial: number }`
- [ ] Thay `feeStatus` hardcoded 70/30 bằng data từ service
- [ ] Update pie chart labels phù hợp

---

### Phase 3C – Reports Real Data *(Ưu tiên trung bình)*

**Mục tiêu:** Thay mock data cho tất cả 4 tabs trong Reports.

**Model khuyên dùng:** 5.4 Medium (nhiều query, cần hiểu nhiều bảng)

#### 3C-1: Tab Overview – Real Stats

**File:** `src/pages/Reports.tsx`

**Việc cần làm:**
- [ ] Thay `overviewStats` mock bằng data từ `getDashboardStats()` (đã có)
- [ ] `recentReports` → Nếu chưa có bảng reports riêng, hiển thị "Chức năng lưu báo cáo sẽ khả dụng trong phiên bản sau" hoặc tạo mock có ý nghĩa từ real data

#### 3C-2: Tab Students – Real Data

**File:** `src/pages/Reports.tsx`, `src/services/studentsService.ts`

**Việc cần làm:**
- [ ] Tạo query `getStudentReport()` trong `studentsService` hoặc `dashboardService`:
  - Join `students` + `classes` + `attendance` (tỷ lệ) + `fee_records` (status)
  - Return list student with attendance_rate, fee_status
- [ ] Wire vào tab Students
- [ ] Hỗ trợ filter theo class, status
- [ ] "Xuất Excel" button → gọi CSV export (Phase 3E)

#### 3C-3: Tab Attendance – Real Data

**File:** `src/pages/Reports.tsx`

**Việc cần làm:**
- [ ] Query `attendance` group by `attendance_date` trong date range
- [ ] Aggregate: total, present, absent, late per day
- [ ] Wire vào table + stat cards
- [ ] "Xuất báo cáo" → CSV export

#### 3C-4: Tab Financial – Real Data

**File:** `src/pages/Reports.tsx`, `src/services/feesService.ts`

**Việc cần làm:**
- [ ] Thay `financialSummary` mock:
  - `totalRevenue` = SUM(paid_amount_vnd) WHERE status IN ('paid','partial')
  - `totalExpenses` → Hiện DB không có bảng expenses → hiển thị "N/A" hoặc bỏ card này
  - `paidCount` = COUNT WHERE status = 'paid'
  - `pendingCount` = COUNT WHERE status = 'unpaid'
  - `overdueCount` = COUNT WHERE status = 'unpaid' AND due_date < NOW()
- [ ] Nếu cần function riêng: `getFinancialSummary()` trong `feesService.ts`
- [ ] Wire vào cards + fee status breakdown

---

### Phase 3D – Settings Completion *(Ưu tiên trung bình)*

**Mục tiêu:** Thay mock cho 2 tabs còn lại trong Settings.

**Model khuyên dùng:** 5.4 Medium (cần tạo service + SQL nếu chưa có bảng)

#### 3D-1: Tab Academic Year – Real Data

**Vấn đề:** Hiện DB chỉ có `school_settings.school_year` (text), KHÔNG có bảng `academic_years` riêng.

> [!IMPORTANT]
> **Quyết định cần user review:**
> - **Option A:** Tạo bảng mới `academic_years` (id, name, start_date, end_date, status, created_at).
> - **Option B:** Dùng `school_settings` table, mỗi row = 1 năm học (hiện đã unique trên `school_year`).
> → Khuyến nghị **Option A** vì logic khác nhau (settings là config key-value, academic year là entity riêng).

**Việc cần làm (nếu Option A):**
- [ ] Tạo migration `supabase/migration_academic_years.sql`
- [ ] Tạo `src/services/academicYearService.ts` (list, create, update, delete, setActive)
- [ ] Wire `Settings.tsx` tab academic_year với service
- [ ] RLS: Admin only

#### 3D-2: Tab Users – Real Data

**File:** `src/pages/Settings.tsx`, `src/services/usersService.ts`

**Việc cần làm:**
- [ ] Thay `mockUsers` bằng `usersService.listUsers()` (kiểm tra nếu function đã có)
- [ ] Wire toggle status → `usersService.updateUser(id, { is_active: boolean })`

> [!WARNING]
> DB `users` table không có cột `is_active`. Cần quyết định:
> - Option: Thêm cột `is_active` vào `users` table (migration nhỏ)
> - Option: Dùng Supabase Auth `ban_user` / `unban_user` (admin API)

- [ ] Wire delete user → confirm modal + `usersService.deleteUser(id)` hoặc disable
- [ ] "Thêm người dùng" button → navigate to `/signup` hoặc mở modal tạo user mới qua admin API

---

### Phase 3E – Polish & Final *(Cuối phase)*

**Mục tiêu:** Hoàn thiện UX, cleanup, export.

**Model khuyên dùng:** 5.4-mini (các task nhỏ, rõ ràng)

#### 3E-1: Export CSV

**Files:**
- `src/utils/exportCsv.ts` *(file mới)*
- `src/pages/Students.tsx` – wire "Xuất Excel"
- `src/pages/Reports.tsx` – wire các nút "Xuất"

**Việc cần làm:**
- [ ] Tạo utility `exportToCsv(data, columns, filename)`:
  - Convert data → CSV string (handle Vietnamese UTF-8 BOM)
  - Trigger download via `Blob` + `URL.createObjectURL`
- [ ] Wire vào Students page "Xuất Excel" button
- [ ] Wire vào Reports page các nút "Tải" / "Xuất báo cáo"

#### 3E-2: Print Biên nhận Học phí

**File:** `src/pages/FeeForm.tsx` hoặc tạo `src/utils/printReceipt.ts`

**Việc cần làm:**
- [ ] Tạo template HTML biên nhận (tên trường, tên HS, loại phí, số tiền, ngày, phương thức)
- [ ] `window.print()` với print-specific CSS
- [ ] Wire vào nút "In biên nhận" trong FeeForm (sau khi tạo phiếu thành công)

#### 3E-3: Cleanup TestAuth

**File:** `src/pages/TestAuth.tsx`

**Việc cần làm:**
- [ ] Xóa file `TestAuth.tsx` hoàn toàn khỏi codebase
- [ ] Xóa import trong `App.tsx` (nếu còn)
- [ ] Verify build không có dead code reference

#### 3E-4: Vietnamese Encoding Fix

**Files:** Kiểm tra toàn bộ repo

**Việc cần làm:**
- [ ] Xác nhận `index.html` có `<meta charset="UTF-8">`
- [ ] Kiểm tra MainLayout.tsx mojibake (line 51 đã report)
- [ ] Đảm bảo CSV export có UTF-8 BOM (`\uFEFF`)

#### 3E-5: Dashboard "Năm học" dynamic

**File:** `src/pages/Dashboard.tsx`

**Việc cần làm:**
- [ ] Thay hardcoded "Năm học 2024 – 2025" bằng data từ `school_settings.school_year`
- [ ] Đã có `settingsService.getSchoolSettings()`, chỉ cần gọi và wire

---

## Dependency Map

```
Phase 3A (Notifications) ──────── độc lập, làm trước
  ├── 3A-1 notificationsService (mới)
  ├── 3A-2 Notifications.tsx wire
  ├── 3A-3 NotificationForm.tsx wire
  └── 3A-4 RLS check

Phase 3B (Dashboard Charts) ──── độc lập, parallel 3A
  ├── 3B-1 attendance trend → dashboardService
  └── 3B-2 fee status → dashboardService

Phase 3C (Reports) ──────────── cần 3B xong (reuse aggregate queries)
  ├── 3C-1 Overview → reuse getDashboardStats
  ├── 3C-2 Students → cần new query
  ├── 3C-3 Attendance → cần new query
  └── 3C-4 Financial → reuse/extend feesService

Phase 3D (Settings) ──────────── có thể parallel 3C
  ├── 3D-1 Academic Year → cần user quyết định (DB migration)
  └── 3D-2 Users → cần kiểm tra usersService

Phase 3E (Polish) ─────────── sau cùng
  ├── 3E-1 Export CSV (dùng ở Students + Reports)
  ├── 3E-2 Print biên nhận
  ├── 3E-3 Cleanup TestAuth
  ├── 3E-4 Vietnamese encoding
  └── 3E-5 Dashboard năm học dynamic
```

---

## Đánh giá Rủi ro Kỹ thuật

| Rủi ro | Mức | Giải pháp |
|---|---|---|
| Notification type mapping DB↔UI phức tạp | Trung bình | Tạo mapping object rõ ràng, unit test |
| Academic Year chưa có table riêng | Cao | Cần user quyết định trước khi implement 3D-1 |
| `users` table thiếu `is_active` column | Trung bình | Thêm migration hoặc dùng Supabase Auth admin API |
| Report queries nặng (join nhiều bảng) | Cao | Dùng `Promise.all`, loading per-section, limit rows |
| Export CSV encoding lỗi Vietnamese | Thấp | Thêm UTF-8 BOM prefix |
| RLS notification – Teacher không tạo được | Trung bình | Thêm policy cho Teacher nếu SPEC yêu cầu |

---

## Open Questions (Cần user trả lời)

> [!IMPORTANT]
> 1. **Academic Year table:** Tạo bảng `academic_years` riêng (Option A) hay dùng `school_settings` (Option B)?
> 2. **User deactivation:** Thêm cột `is_active` vào `users` table hay dùng Supabase Auth ban/unban API?
> 3. **Teacher gửi thông báo:** Teacher có quyền tạo notification hay chỉ Admin?
> 4. **Expenses tracking:** Hiện DB không có bảng expenses. Tab Financial trong Reports nên: (a) bỏ cards Thu/Chi/Thu ròng, chỉ hiện học phí, hay (b) tạo bảng mới?

---

## Thứ tự Thực thi Đề xuất

```
3A-1 → 3A-2 → 3A-3 → 3A-4   (notifications, ~1 session, 5.4 Medium)
3B-1 + 3B-2                  (dashboard charts, ~0.5 session, 5.4-mini)
3C-1 → 3C-2 → 3C-3 → 3C-4   (reports, ~1.5 session, 5.4 Medium)
3D-1 → 3D-2                  (settings, ~1 session, 5.4 Medium)
3E-1 → 3E-2 → 3E-3 → 3E-4 → 3E-5  (polish, ~0.5 session, 5.4-mini)
```

**Tổng ước tính:** 4–5 sessions tập trung.

---

## Model Tier Recommendation (Tối ưu token)

| Phase | Độ phức tạp | Model khuyên dùng | Lý do |
|---|---|---|---|
| 3A (Notifications) | Vừa – nhiều file, mapping | 5.4 Medium | Cần hiểu schema + map types |
| 3B (Dashboard Charts) | Nhỏ – 2 queries | 5.4-mini | Scope rõ, ít file |
| 3C (Reports) | Vừa-Cao – queries phức tạp | 5.4 Medium | Aggregate joins, nhiều tab |
| 3D-1 (Academic Year) | Cao nếu tạo table mới | 5.5 High nếu migration, 5.4 Medium nếu không | DDL + service + UI |
| 3D-2 (Users) | Nhỏ-Vừa | 5.4-mini | Reuse existing service |
| 3E (Polish) | Nhỏ – tasks rời rạc | 5.4-mini | Mỗi task < 1 file |
| Bug khó phát sinh | Tùy | 5.5 High | Chỉ khi model thấp bị kẹt |

---

## Verification Plan

### Automated Tests
- `tsc -b` – typecheck pass
- `eslint .` – no new errors
- `vitest --run` – all existing tests pass
- Thêm test cho `notificationsService` (list, create, markRead)
- Thêm test cho `exportToCsv` utility

### Manual Verification
- Login → Dashboard → verify 3 charts đều real data
- Notifications → tạo → xem list → mark read → delete
- Reports → 4 tabs đều load data, không còn mock
- Settings → 3 tabs đều load/save real data
- Students → "Xuất Excel" → download CSV đúng encoding
- FeeForm → tạo phiếu → "In biên nhận" → print preview
- Build production → verify TestAuth không còn
