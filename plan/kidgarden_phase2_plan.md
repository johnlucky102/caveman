# KidGarden – Kế hoạch Coding Phase 2

## Bối cảnh

P1 (Auth + Students + Classes) đã hoàn thành. P2 core (Attendance + Fees) đã có service layer, nhưng còn nhiều điểm chưa hardened, mock, hoặc placeholder. Mục tiêu Phase 2 là **đưa toàn bộ module P2 lên real data + hardening**, đồng thời chuẩn bị nền cho P3.

---

## Phân tích hiện trạng

### ✅ Đã xong (không cần làm lại)
- `attendanceService.ts` – CRUD đủ (bulk upsert, history query)
- `feesService.ts` – list/create/updateStatus đủ
- `Attendance.tsx` – roll-call real data
- `Fees.tsx` / `FeeForm.tsx` – real data
- `Teachers.tsx` – đã wired `usersService.listTeachers` (thực ra đã real!)

### ❌ Còn mock / placeholder / không dùng
| Module | Vấn đề |
|---|---|
| `Dashboard.tsx` | 100% mock data – stat cards, charts, bảng điểm danh, notifications |
| `StudentDetail.tsx` tab Fees + Attendance | Hiển thị placeholder text "Phase P2" |
| `ClassDetail.tsx` tab Attendance | Tỷ lệ giả (synthetic) |
| `AttendanceHistory.tsx` | Mock, chưa được route vào router |
| `Notifications.tsx` / `NotificationForm.tsx` | Mock hoàn toàn (state local) |
| `Parents.tsx` | Chưa kiểm tra – likely mock |
| `Reports.tsx` / `Settings.tsx` | Mock |

### 🐛 Blockers đã biết
| ID | Severity | Vấn đề |
|---|---|---|
| P2-FEES-SEARCH-PAGING | Major | Search filter trước khi `.range()` nhưng `total` vẫn tính toàn bảng → count sai |
| P2-RLS-ATTENDANCE-SCOPE | Major | Teacher đọc/ghi attendance toàn trường, chưa scope về lớp mình phụ trách |
| Non-blocking | Minor | Delete student placeholder, Export placeholder, forgot-password placeholder |

---

## Các Phase Chi Tiết

---

### Phase 2A – Fix Blockers & Hardening P2 Core *(Ưu tiên cao nhất)*

**Mục tiêu:** Đóng preview gate – không có bug major nào trước khi mở rộng.

#### 2A-1: Fix fees server-side search + total count (P2-FEES-SEARCH-PAGING)

**File:** `src/services/feesService.ts`

**Vấn đề:**  
Logic hiện tại: resolve `studentIds/feeTypeIds` → apply OR filter → `statement.range(from, to)`.  
`count: 'exact'` được tính TRÊN TOÀN statement, nghĩa là count đúng. Tuy nhiên cần xác nhận lại thứ tự `.range()` vs filter không bị Supabase query builder đảo lộn.

**Việc cần làm:**
- [ ] Tách `count` query và `data` query riêng để tránh ambiguity
- [ ] Thêm `debounce` ở `Fees.tsx` khi search (tránh gọi API liên tục)
- [ ] Thêm field-level conflict message cho unique key `(student_id, fee_type_id, school_year, month)` trong `feesService.createFeeRecord`

#### 2A-2: Tighten Attendance RLS (P2-RLS-ATTENDANCE-SCOPE)

**File:** `supabase/rls_p2_attendance_scope.sql` *(file mới)*

**Việc cần làm:**
- [ ] Viết SQL patch: Teacher chỉ write/read attendance cho students trong classes mình phụ trách
- [ ] Pattern tham khảo: `rls_p1_alignment.sql`

#### 2A-3: Wiring AttendanceHistory vào Router

**Files:**  
- `src/App.tsx` – thêm route `/attendance/history`
- `src/pages/AttendanceHistory.tsx` – thay mock bằng real `attendanceService.getAttendanceHistory`
- `src/components/layout/Sidebar.tsx` – thêm link nếu cần

---

### Phase 2B – Real Data cho Detail Tabs *(Ưu tiên cao)*

#### 2B-1: StudentDetail – Tab Fees

**File:** `src/pages/StudentDetail.tsx`

**Việc cần làm:**
- [ ] Gọi `listFees({ studentId: id })` – cần thêm param `studentId` vào `feesService.listFees`
- [ ] Render mini table: loại phí, tháng, số tiền, trạng thái
- [ ] Dependency: `feesService.ts` cần thêm filter `student_id`

#### 2B-2: StudentDetail – Tab Attendance

**File:** `src/pages/StudentDetail.tsx`

**Việc cần làm:**
- [ ] Gọi `attendanceService.getAttendanceHistory({ studentId: id })`
- [ ] Render bảng lịch sử: ngày, trạng thái (present/absent/late)
- [ ] Cần kiểm tra `attendanceService` có hỗ trợ filter `studentId` chưa

#### 2B-3: ClassDetail – Tab Attendance (real)

**File:** `src/pages/ClassDetail.tsx`

**Việc cần làm:**
- [ ] Gọi attendance summary cho class theo ngày hôm nay
- [ ] Hoặc embed inline roll-call selector (nếu scope cho phép)
- [ ] Thay thế `attendanceRate` synthetic bằng số thực từ DB

**Dependencies giữa 2B:**
```
feesService.ts (thêm studentId filter) → StudentDetail tab Fees
attendanceService.ts (verify studentId filter) → StudentDetail tab Attendance
```

---

### Phase 2C – Dashboard Real Data *(Ưu tiên trung bình)*

**File:** `src/pages/Dashboard.tsx`

**Việc cần làm:**
- [ ] **Stat card "Tổng học sinh"**: `studentsService.listStudents({ pageSize: 1 })` → lấy `total`
- [ ] **Stat card "Công nợ học phí"**: cần aggregate query riêng – `SELECT SUM(amount_vnd - paid_amount_vnd) WHERE status != 'paid'`
- [ ] **Bảng điểm danh hôm nay**: query attendance theo ngày hôm nay, group by class
- [ ] **Biểu đồ học sinh theo khối**: query students group by grade_id
- [ ] **Notifications panel**: lấy từ real notifications table (nếu P3 chưa xong thì giữ mock)

**Approach:** Tạo `src/services/dashboardService.ts` – tập trung các aggregate queries

**Rủi ro:** Dashboard cần nhiều query → cân nhắc loading state per-section, không block toàn trang.

---

### Phase 2D – Reports & Settings (Real Data)

**Mục tiêu:** Cập nhật các trang thống kê và cài đặt dựa trên real data từ CSDL.

**File:**
- `src/pages/Reports.tsx`
- `src/pages/Settings.tsx`
- `src/services/settingsService.ts` *(file mới)*

**Việc cần làm:**
- [ ] **Settings**: 
  - Tạo `settingsService.ts` để CRUD bảng `school_settings`.
  - Wire `Settings.tsx` với service để fetch/update cấu hình nhà trường.
- [ ] **Reports**:
  - Dùng các aggregate queries từ Dashboard hoặc tạo các query riêng để render các báo cáo học phí, điểm danh (tuỳ theo logic trong file mock hiện tại).
  
*Lưu ý: Notifications đã được dời sang Phase 3.*

---

### Phase 2E – Clean-up & Polish *(Cuối phase)*

**Files nhiều nơi**

- [ ] **Delete student** – `StudentDetail.tsx`: gọi `studentsService.deleteStudent` (cần thêm hàm)
- [ ] **Export** – `Students.tsx`: export CSV từ data hiện tại (client-side, không cần API)
- [ ] **Forgot password** – `Login.tsx`: gọi `supabase.auth.resetPasswordForEmail`
- [ ] **Parents.tsx**: Trang này hiện đang dùng mock data (dữ liệu giả). Trong DB đã có bảng `parents` và `student_parent`. Việc cần làm là tạo hàm fetch data thực từ DB (`usersService.listParents`) và gắn vào trang này để hiển thị dữ liệu thật.
- [ ] Xóa `TestAuth.tsx` khỏi build (hoặc giữ dev-only guard)

---

## Dependency Map

```
Phase 2A (Blockers) ──────────────────────────────┐
  ├── 2A-1 feesService fix ──────────────┐         │
  ├── 2A-2 RLS SQL patch                 │         │
  └── 2A-3 AttendanceHistory route       │         │
                                         ▼         ▼
Phase 2B (Detail Tabs) ──────────────────────── cần 2A xong
  ├── feesService.ts (studentId filter)
  ├── StudentDetail tab Fees
  ├── StudentDetail tab Attendance
  └── ClassDetail tab Attendance

Phase 2C (Dashboard) ─── parallel với 2B (độc lập)
  └── dashboardService.ts (mới)

Phase 2D (Reports & Settings) ─── có thể làm sau Dashboard

Phase 2E (Clean-up) ─── sau cùng, không block ai
```

---

## Đánh giá Rủi ro Kỹ thuật

| Rủi ro | Mức | Giải pháp |
|---|---|---|
| Aggregate query Dashboard chậm (toàn bảng) | Cao | Thêm DB indexes nếu chưa có; dùng `Promise.all` parallel |
| RLS patch sai scope → Teacher không đọc được gì | Cao | Test kỹ với account Teacher trước khi push production |
| Reports cần query phức tạp | Trung bình | Tái sử dụng các filter hiện có hoặc chia nhỏ query |
| `feesService` search count bị lệch | Trung bình | Viết test case edge (0 kết quả, cross-page search) |
| Encoding UTF-8 Vietnamese artifacts | Thấp | Đảm bảo file mới lưu UTF-8 without BOM |

---

## Thứ tự Thực thi Đề xuất (tiết kiệm token/effort)

```
2A-1 → 2A-2 → 2A-3  (blockers, ~1 session)
2B-1 + 2B-2 + 2B-3  (detail tabs, ~1 session)
2C                   (dashboard, ~1 session)
2D                   (reports & settings, ~1 session)
2E                   (clean-up, quick pass ~30 phút)
```

**Tổng ước tính:** 4–5 sessions tập trung.
