# Implementation Summary: Phụ Thu (Additional Charge) Feature

## Ngày: 2026-05-31

## ✅ Đã Hoàn Thành

### Step 1: Database Migration ✅
**File:** `supabase/migrations/20260531_add_additional_charge.sql`

Thêm 2 cột mới vào bảng `fee_records`:
- `additional_charge_vnd` (INTEGER, default 0) - Số tiền phụ thu
- `additional_charge_note` (TEXT, nullable) - Ghi chú phụ thu

### Step 2: TypeScript Types ✅
**File:** `src/types/domain.ts`

Cập nhật interfaces:
- `FeeRecordP2` - thêm 2 field mới
- `CreateFeeInput` - thêm 2 field optional

### Step 3: Service Layer ✅
**File:** `src/services/feesService.ts`

Thay đổi:
- `FeeRow` type - thêm 2 field
- `mapFeeRow()` - map 2 field mới với default value
- Tất cả SELECT queries - thêm `additional_charge_vnd, additional_charge_note`

### Step 4: FeeForm UI ✅
**File:** `src/pages/FeeForm.tsx`

Thay đổi:
1. **Interface `FeeFormState`** - thêm `additionalCharge`, `additionalChargeNote`
2. **Default state** - khởi tạo với `'0'` và `''`
3. **Load data khi edit** - load từ `item.additional_charge_vnd` và `item.additional_charge_note`
4. **handleSyncAttendance** - giữ nguyên giá trị phụ thu khi sync
5. **summary calculation** - công thức mới:
   ```typescript
   finalAmount = base - deduction - other + additional
   ```
6. **validate()** - tính đúng với phụ thu
7. **payload submit** - gửi 2 field mới lên server
8. **UI inputs** - thêm 2 ô nhập:
   - CurrencyInput cho số tiền phụ thu
   - Input text cho ghi chú
9. **Summary display** - hiển thị dòng phụ thu màu xanh với tooltip ghi chú

### Step 5: Test Utilities ✅
**File:** `src/test/utils/mockFactories.ts`

Cập nhật `createMockFee()` - thêm 2 field mới với default values.

---

## Công Thức Tính Mới

### Trước:
```
Tổng phải nộp = Học phí gốc - Khấu trừ vắng - Khấu trừ khác
```

### Sau:
```
Tổng phải nộp = Học phí gốc - Khấu trừ vắng - Khấu trừ khác + Phụ thu
```

---

## UI Changes

### Form Layout
```
┌─────────────────────────────────────────┐
│ Học phí gốc        │ Khấu trừ khác      │
├─────────────────────────────────────────┤
│ Phụ thu            │ Ghi chú phụ thu    │  ← MỚI
│ (hint: Nợ cũ...)   │ (placeholder)      │
└─────────────────────────────────────────┘
```

### Summary Display
```
Học phí gốc:           2,000,000 đ
Khấu trừ vắng mặt:      -200,000 đ
Khấu trừ khác:          -100,000 đ
Phụ thu: ⓘ            +500,000 đ  ← MỚI (màu xanh)
─────────────────────────────────
Tổng cộng:            2,200,000 đ
```

Hover vào icon ⓘ → hiển thị tooltip với nội dung ghi chú.

---

## Test Cases

### TC1: Tạo fee mới với phụ thu
1. Mở `/fees/new`
2. Chọn học sinh
3. Nhập học phí gốc: 2,000,000đ
4. Nhập phụ thu: 500,000đ
5. Nhập ghi chú: "Nợ học phí tháng 4"
6. Submit

**Kết quả mong đợi:**
- Tổng = 2,500,000đ
- Lưu thành công
- Reload → hiển thị đúng

### TC2: Edit fee, thêm phụ thu
1. Mở fee cũ (không có phụ thu)
2. Thêm phụ thu: 300,000đ
3. Thêm ghi chú: "Phí ăn thêm"
4. Cập nhật

**Kết quả mong đợi:**
- Tổng tiền tăng 300,000đ
- Cập nhật thành công

### TC3: Phụ thu = 0
1. Không nhập phụ thu (để 0)
2. Submit

**Kết quả mong đợi:**
- Không hiển thị dòng phụ thu trong summary
- Tính toán đúng

### TC4: Tooltip ghi chú
1. Nhập phụ thu với ghi chú
2. Hover vào icon ⓘ trong summary

**Kết quả mong đợi:**
- Hiển thị tooltip với nội dung ghi chú
- Tooltip đẹp, dễ đọc

---

## Migration Instructions

### 1. Chạy Migration SQL
```bash
# Trên Supabase Dashboard
# SQL Editor → New Query → Paste nội dung file migration → Run
```

Hoặc qua CLI:
```bash
supabase db push
```

### 2. Verify Migration
```sql
-- Kiểm tra 2 cột mới đã tồn tại
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'fee_records' 
  AND column_name IN ('additional_charge_vnd', 'additional_charge_note');
```

### 3. Deploy Frontend
```bash
cd kindergarten-management
npm run build
# Deploy dist/ lên hosting
```

---

## Backward Compatibility

✅ **100% backward compatible**

- Fees cũ tự động có `additional_charge_vnd = 0`
- Không ảnh hưởng tính toán cũ
- UI không hiển thị dòng phụ thu nếu = 0
- Không breaking changes

---

## Files Changed

### Backend (Supabase)
1. `supabase/migrations/20260531_add_additional_charge.sql` - NEW

### Frontend
1. `src/types/domain.ts` - MODIFIED
2. `src/services/feesService.ts` - MODIFIED
3. `src/pages/FeeForm.tsx` - MODIFIED
4. `src/test/utils/mockFactories.ts` - MODIFIED

**Tổng:** 1 file mới, 4 files sửa

---

## Build Status

✅ TypeScript compile: PASS  
✅ Build production: PASS  
✅ No lint errors: PASS

---

## Next Steps (Optional)

### 1. Hiển thị phụ thu trong danh sách fees
**File:** `src/pages/Fees.tsx`

Thêm cột "Phụ thu" vào bảng (nếu cần).

### 2. Hiển thị phụ thu khi in phiếu thu
**File:** `src/pages/BulkPrintFees.tsx` hoặc `src/utils/printReceipt.ts`

Thêm dòng phụ thu vào template in:
```tsx
{fee.additional_charge_vnd > 0 && (
  <tr>
    <td>Phụ thu</td>
    <td className="text-right">+{formatCurrency(fee.additional_charge_vnd)}</td>
  </tr>
)}
{fee.additional_charge_note && (
  <tr>
    <td colSpan={2} className="text-xs italic">
      Ghi chú: {fee.additional_charge_note}
    </td>
  </tr>
)}
```

### 3. Báo cáo phụ thu
Thêm báo cáo tổng hợp phụ thu theo tháng/năm (nếu cần).

---

## Kết Luận

✅ Đã implement thành công tính năng **Phụ Thu** cho hệ thống học phí.

**Tính năng:**
- Cộng thêm số tiền linh hoạt vào học phí
- Ghi chú tự do để giải thích
- UI trực quan, dễ sử dụng
- Backward compatible 100%

**Thời gian:** ~60 phút (nhanh hơn ước lượng 90 phút)

Sẵn sàng deploy! 🚀
