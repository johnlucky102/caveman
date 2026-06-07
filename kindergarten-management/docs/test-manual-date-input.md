# Test Manual: DatePicker với Manual Input

## Ngày test: 2026-05-31

### Test Cases

#### ✅ TC1: Nhập ngày hợp lệ (với auto-format)
**Bước:**
1. Mở form "Thêm học sinh mới" (`/students/new`)
2. Click vào ô "Ngày sinh"
3. Nhập: `15052020` (chỉ số, không cần gõ "/")
4. Click ra ngoài (blur)

**Kết quả mong đợi:**
- Tự động format thành: `15/05/2020` khi gõ
- Ngày được parse thành công
- Không có lỗi validation
- Khi submit form, backend nhận `2020-05-15`

**Cách hoạt động auto-format:**
- Gõ `1` → hiển thị `1`
- Gõ `15` → hiển thị `15`
- Gõ `150` → hiển thị `15/0`
- Gõ `1505` → hiển thị `15/05`
- Gõ `15052` → hiển thị `15/05/2`
- Gõ `15052020` → hiển thị `15/05/2020`

---

#### ✅ TC2: Nhập ngày không hợp lệ
**Bước:**
1. Mở form "Thêm học sinh mới"
2. Nhập vào ô "Ngày sinh": `32/13/2020`
3. Click ra ngoài

**Kết quả mong đợi:**
- Hiển thị lỗi: "Ngày không hợp lệ. Định dạng: dd/MM/yyyy"
- Text màu đỏ
- Border input màu đỏ

---

#### ✅ TC3: Chọn từ calendar
**Bước:**
1. Mở form "Thêm học sinh mới"
2. Click nút calendar (icon lịch)
3. Chọn ngày 20/05/2020 từ popup

**Kết quả mong đợi:**
- Popup đóng tự động
- Input text hiển thị: `20/05/2020`
- Không có lỗi

---

#### ✅ TC4: Xóa ngày
**Bước:**
1. Nhập ngày: `15/05/2020`
2. Click nút X (clear button)

**Kết quả mong đợi:**
- Input trống
- Không có lỗi
- Nút X biến mất

---

#### ✅ TC5: Nhập một phần rồi blur
**Bước:**
1. Nhập: `15/05/`
2. Click ra ngoài

**Kết quả mong đợi:**
- Hiển thị lỗi validation
- Text input giữ nguyên `15/05/`

---

#### ✅ TC6: Xóa hết text trong input
**Bước:**
1. Nhập ngày: `15/05/2020`
2. Xóa hết text (Ctrl+A, Delete)
3. Click ra ngoài

**Kết quả mong đợi:**
- Input trống
- Không có lỗi (vì field không required trong test này)
- Nếu field required → lỗi "Ngày sinh là bắt buộc" từ form validation

---

#### ✅ TC7: Sync giữa text input và calendar
**Bước:**
1. Nhập text: `10/05/2020`
2. Click nút calendar
3. Chọn ngày khác: `25/05/2020`

**Kết quả mong đợi:**
- Text input cập nhật thành `25/05/2020`
- Calendar đóng

---

#### ✅ TC8: Disabled state
**Bước:**
1. Mở form edit học sinh với role Teacher (read-only)
2. Kiểm tra ô "Ngày sinh"

**Kết quả mong đợi:**
- Input disabled (màu xám)
- Không thể nhập
- Nút calendar disabled
- Nút X không hiển thị

---

#### ✅ TC9: Các trang khác vẫn hoạt động
**Kiểm tra:**
- `/students/new` - Ngày sinh, Ngày nhập học
- `/teachers/new` - Ngày sinh, Ngày bắt đầu
- `/fees/new` - Ngày đến hạn, Ngày thanh toán
- `/attendance` - Chọn ngày điểm danh
- `/settings` - Ngày bắt đầu/kết thúc năm học

**Kết quả mong đợi:**
- Tất cả DatePicker hoạt động bình thường
- Có thể nhập tay hoặc chọn calendar
- Không có console errors

---

#### ✅ TC10: Auto-format loại bỏ ký tự không phải số
**Bước:**
1. Nhập: `15abc05def2020`

**Kết quả mong đợi:**
- Tự động loại bỏ chữ cái
- Hiển thị: `15/05/2020`

---

#### ✅ TC11: Paste ngày có sẵn dấu "/"
**Bước:**
1. Copy text: `20/06/2021`
2. Paste vào input

**Kết quả mong đợi:**
- Tự động format lại thành `20/06/2021`
- Parse thành công

---

## Checklist Tổng Quan

- [x] Build thành công (✅ đã pass)
- [x] Lint không có lỗi mới (✅ đã pass)
- [ ] TC1: Nhập ngày hợp lệ (với auto-format)
- [ ] TC2: Nhập ngày không hợp lệ
- [ ] TC3: Chọn từ calendar
- [ ] TC4: Xóa ngày
- [ ] TC5: Nhập một phần
- [ ] TC6: Xóa hết text
- [ ] TC7: Sync text ↔ calendar
- [ ] TC8: Disabled state
- [ ] TC9: Các trang khác
- [ ] TC10: Auto-format loại bỏ ký tự không phải số
- [ ] TC11: Paste ngày có dấu "/"

---

## Ghi chú

**Định dạng:**
- Input: `dd/MM/yyyy` (hiển thị)
- Storage: `yyyy-MM-dd` (ISO 8601)

**Validation:**
- Ngày: 1-31
- Tháng: 1-12
- Năm: 1900-2100
- Tự động validate năm nhuận

**Thư viện:** `date-fns` v3.0.0
