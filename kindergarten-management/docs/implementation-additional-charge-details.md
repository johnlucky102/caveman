# Implementation Summary: Chi Tiết Phụ Thu (Multiple Additional Charge Items)

## Ngày: 2026-05-31

## ✅ Đã Hoàn Thành

### Vấn đề đã giải quyết
Trước đây chỉ có 1 ô nhập tổng phụ thu → nếu có nhiều khoản (nợ tháng 4 + phí ăn + phí xe) phải tự tính tổng → rất bất tiện.

### Giải pháp
Tạo **danh sách chi tiết phụ thu** với:
- Mỗi item: tên + số tiền + ghi chú (optional)
- Nút "Thêm khoản" / "Xóa"
- **Tự động tính tổng**

---

## UI Mới

### Form Input
```
Chi tiết phụ thu:                    [+ Thêm khoản]
┌────────────────────────────────────────────────┐
│ Nợ học phí tháng 4    500,000đ  [Xóa]         │
│ Ghi chú: Chưa thanh toán tháng 4               │
├────────────────────────────────────────────────┤
│ Phí ăn thêm           200,000đ  [Xóa]         │
│ Ghi chú: Ăn thêm 10 ngày                      │
├────────────────────────────────────────────────┤
│ Phí xe buýt           150,000đ  [Xóa]         │
│ Ghi chú:                                       │
├────────────────────────────────────────────────┤
│ Tổng phụ thu:                    850,000đ      │
└────────────────────────────────────────────────┘
```

### Summary Display
```
Học phí gốc:           2,000,000 đ
Khấu trừ vắng mặt:      -200,000 đ
Khấu trừ khác:          -100,000 đ
Phụ thu:               +850,000 đ
  • Nợ học phí tháng 4   +500,000 đ
  • Phí ăn thêm ⓘ        +200,000 đ
  • Phí xe buýt          +150,000 đ
─────────────────────────────────
Tổng cộng:            2,550,000 đ
```

---

## Technical Implementation

### Step 1: TypeScript Types ✅
**File:** `src/types/domain.ts`

Thêm interface mới:
```typescript
export interface AdditionalChargeDetail {
  id: string;
  name: string;
  amount: number;
  note?: string | null;
}
```

Cập nhật `FeeRecordP2`:
```typescript
export interface FeeRecordP2 {
  // ... existing fields
  additional_charge_vnd: number;
  additional_charge_note: string | null;
  additional_charge_details: AdditionalChargeDetail[]; // NEW
}
```

### Step 2: Service Layer ✅
**File:** `src/services/feesService.ts`

Thêm parse function:
```typescript
function parseAdditionalChargeDetails(raw: any): AdditionalChargeDetail[] {
  if (!raw) return [];
  if (typeof raw !== 'string') return [];
  
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => 
        item && 
        typeof item.id === 'string' && 
        typeof item.name === 'string' && 
        typeof item.amount === 'number'
      );
    }
  } catch {
    // Parse fail → string ghi chú cũ, return []
  }
  
  return [];
}
```

Cập nhật `mapFeeRow()`:
```typescript
additional_charge_details: parseAdditionalChargeDetails(row.additional_charge_note)
```

### Step 3: FeeForm State ✅
**File:** `src/pages/FeeForm.tsx`

Thay đổi state:
```typescript
interface FeeFormState {
  // REMOVED: additionalCharge: string;
  // REMOVED: additionalChargeNote: string;
  
  // NEW:
  additionalChargeDetails: AdditionalChargeDetail[];
}
```

### Step 4: Load Data với Backward Compatibility ✅
```typescript
// Parse details với backward compatibility
let additionalDetails: AdditionalChargeDetail[] = [];
if (item.additional_charge_details && item.additional_charge_details.length > 0) {
  additionalDetails = item.additional_charge_details;
} else if (item.additional_charge_vnd > 0) {
  // Convert old format to new format
  additionalDetails = [{
    id: crypto.randomUUID(),
    name: item.additional_charge_note || 'Phụ thu',
    amount: item.additional_charge_vnd,
    note: null,
  }];
}
```

### Step 5: Tính Tổng Tự Động ✅
```typescript
const additionalChargeTotal = useMemo(() => {
  return formData.additionalChargeDetails.reduce((sum, item) => sum + item.amount, 0);
}, [formData.additionalChargeDetails]);
```

### Step 6: UI Components ✅
- Nút "Thêm khoản" → tạo item mới với `crypto.randomUUID()`
- Mỗi item: Input tên + CurrencyInput số tiền + Input ghi chú + Nút xóa
- Hiển thị tổng phụ thu ở cuối danh sách
- Summary hiển thị chi tiết từng khoản với tooltip ghi chú

### Step 7: Submit Payload ✅
```typescript
const payload: CreateFeeInput = {
  // ...
  additional_charge_vnd: additionalChargeTotal, // Tổng tính từ details
  additional_charge_note: JSON.stringify(formData.additionalChargeDetails), // Lưu JSON
};
```

---

## Database Schema

### Không cần migration mới! ✅

Dùng lại cột `additional_charge_note` để lưu JSON array:
```json
[
  {
    "id": "uuid-1",
    "name": "Nợ học phí tháng 4",
    "amount": 500000,
    "note": null
  },
  {
    "id": "uuid-2",
    "name": "Phí ăn thêm",
    "amount": 200000,
    "note": "Ăn thêm 10 ngày"
  }
]
```

---

## Backward Compatibility

✅ **100% backward compatible**

### Fees cũ (có additional_charge_note là string thường)
Khi load:
1. Parse JSON → nếu fail → là string cũ
2. Convert thành 1 item trong array:
   ```typescript
   [{
     id: crypto.randomUUID(),
     name: additional_charge_note || 'Phụ thu',
     amount: additional_charge_vnd,
     note: null
   }]
   ```

### Fees mới
Lưu JSON array vào `additional_charge_note`, parse thành array khi load.

---

## Files Changed

1. `src/types/domain.ts` - thêm `AdditionalChargeDetail` interface
2. `src/services/feesService.ts` - thêm `parseAdditionalChargeDetails()`, update `mapFeeRow()`
3. `src/pages/FeeForm.tsx` - UI danh sách chi tiết, tính tổng tự động
4. `src/test/utils/mockFactories.ts` - thêm `additional_charge_details: []`

**Tổng:** 4 files

---

## Test Cases

### ✅ TC1: Thêm nhiều khoản phụ thu
**Bước:**
1. Mở `/fees/new`
2. Chọn học sinh
3. Click "Thêm khoản" 3 lần
4. Nhập:
   - Khoản 1: "Nợ học phí tháng 4" - 500,000đ
   - Khoản 2: "Phí ăn thêm" - 200,000đ - ghi chú "10 ngày"
   - Khoản 3: "Phí xe" - 150,000đ
5. Submit

**Kết quả mong đợi:**
- Tổng phụ thu = 850,000đ
- Lưu thành công
- Reload → hiển thị đúng 3 khoản

### ✅ TC2: Xóa 1 khoản
**Bước:**
1. Có 3 khoản phụ thu
2. Click nút xóa khoản thứ 2

**Kết quả mong đợi:**
- Còn 2 khoản
- Tổng cập nhật = 650,000đ

### ✅ TC3: Sửa số tiền
**Bước:**
1. Sửa khoản 1 từ 500,000đ → 600,000đ

**Kết quả mong đợi:**
- Tổng cập nhật = 950,000đ

### ✅ TC4: Backward compatibility
**Bước:**
1. Load fee cũ có `additional_charge_vnd = 300000`, `additional_charge_note = "Nợ cũ"`

**Kết quả mong đợi:**
- Hiển thị 1 item: "Nợ cũ" - 300,000đ
- Có thể thêm item mới
- Submit → lưu đúng JSON array

### ✅ TC5: Không có phụ thu
**Bước:**
1. Không thêm khoản nào (danh sách rỗng)

**Kết quả mong đợi:**
- Hiển thị: "Chưa có khoản phụ thu. Nhấn 'Thêm khoản' để thêm."
- Tổng = 0đ
- Summary không hiển thị dòng phụ thu

---

## Build Status

✅ TypeScript compile: PASS  
✅ Build production: PASS  
✅ No breaking changes: PASS

---

## So Sánh: Trước vs Sau

### Trước
```
Phụ thu:     [_________] 850000
Ghi chú:     [_________] Nợ tháng 4 + phí ăn + xe
             ↑ phải tự tính tổng
```

### Sau
```
Chi tiết phụ thu:                    [+ Thêm khoản]
┌────────────────────────────────────────────────┐
│ Nợ tháng 4        500,000đ  [Xóa]             │
│ Ghi chú: Chưa thanh toán                       │
├────────────────────────────────────────────────┤
│ Phí ăn thêm       200,000đ  [Xóa]             │
│ Ghi chú: 10 ngày                               │
├────────────────────────────────────────────────┤
│ Phí xe            150,000đ  [Xóa]             │
│ Ghi chú:                                       │
├────────────────────────────────────────────────┤
│ Tổng phụ thu:                 850,000đ        │
└────────────────────────────────────────────────┘
             ↑ tự động tính
```

---

## Ưu Điểm

✅ **Không cần migration database** - dùng lại cột có sẵn  
✅ **Tự động tính tổng** - không cần tính tay  
✅ **Chi tiết rõ ràng** - mỗi khoản có tên + ghi chú riêng  
✅ **Dễ quản lý** - thêm/xóa/sửa từng khoản độc lập  
✅ **Backward compatible** - fees cũ tự động convert  
✅ **UI trực quan** - giống "Chi tiết khấu trừ chuyên cần"

---

## Kết Luận

✅ Đã nâng cấp thành công tính năng phụ thu từ **1 ô nhập tổng** → **danh sách chi tiết tự động tính tổng**.

**Thời gian thực tế:** ~60 phút (nhanh hơn ước lượng 100 phút)

Sẵn sàng sử dụng! 🚀
