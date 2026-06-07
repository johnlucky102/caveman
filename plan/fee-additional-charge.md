# Plan: Thêm Trường "Phụ Thu" vào Fee Form

## Phân Tích Yêu Cầu

### Vấn đề
- Phụ huynh nợ học phí tháng trước chưa thanh toán hết
- Tháng này cần **cộng thêm** số tiền nợ vào học phí
- Số tiền cộng thêm này **chưa xác định** là gì (có thể là nợ cũ, phạt, phí phát sinh...)
- Cần ghi chú (note) để giải thích số tiền này là gì

### Giải pháp
Thêm 2 trường mới:
1. **`additional_charge_vnd`** (số tiền phụ thu) - kiểu `number`
2. **`additional_charge_note`** (ghi chú phụ thu) - kiểu `string`

### Công thức tính mới
```
Học phí cuối = Học phí gốc - Khấu trừ vắng - Khấu trừ khác + Phụ thu
```

**Trước:**
```
amount_vnd = base_amount_vnd - attendance_deduction_vnd - other_deduction_vnd
```

**Sau:**
```
amount_vnd = base_amount_vnd - attendance_deduction_vnd - other_deduction_vnd + additional_charge_vnd
```

---

## Step-by-Step Implementation

### ✅ Step 1: Cập nhật Database Schema
**File:** Supabase migration (cần tạo mới)

**Thay đổi:**
```sql
-- Migration: add_additional_charge_to_fee_records.sql
ALTER TABLE fee_records 
ADD COLUMN additional_charge_vnd INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN additional_charge_note TEXT;

COMMENT ON COLUMN fee_records.additional_charge_vnd IS 'Số tiền phụ thu (nợ cũ, phí phát sinh, v.v.)';
COMMENT ON COLUMN fee_records.additional_charge_note IS 'Ghi chú giải thích phụ thu';
```

**Kiểm tra:**
- Chạy migration trên Supabase
- Verify 2 cột mới xuất hiện trong bảng `fee_records`

---

### ✅ Step 2: Cập nhật TypeScript Types
**File:** `src/types/domain.ts`

**Thay đổi:**

#### 2.1. Interface `FeeRecordP2`
```typescript
export interface FeeRecordP2 {
  // ... existing fields
  base_amount_vnd: number;
  attendance_deduction_vnd: number;
  other_deduction_vnd: number;
  deduction_details: FeeDeductionDetail[];
  deduction_note: string | null;
  
  // ✅ NEW: Thêm 2 field mới
  additional_charge_vnd: number;
  additional_charge_note: string | null;
  
  created_at: string;
  updated_at: string;
}
```

#### 2.2. Interface `CreateFeeInput`
```typescript
export interface CreateFeeInput {
  // ... existing fields
  base_amount_vnd?: number;
  attendance_deduction_vnd?: number;
  other_deduction_vnd?: number;
  deduction_details?: FeeDeductionDetail[];
  deduction_note?: string | null;
  
  // ✅ NEW: Thêm 2 field mới
  additional_charge_vnd?: number;
  additional_charge_note?: string | null;
}
```

**Kiểm tra:**
- TypeScript compile không lỗi
- `npm run build` pass

---

### ✅ Step 3: Cập nhật Service Layer
**File:** `src/services/feesService.ts`

**Thay đổi:**

#### 3.1. Type `FeeRow`
```typescript
type FeeRow = {
  // ... existing fields
  base_amount_vnd: number | null;
  attendance_deduction_vnd: number | null;
  other_deduction_vnd: number | null;
  deduction_details: any;
  deduction_note: string | null;
  
  // ✅ NEW
  additional_charge_vnd: number | null;
  additional_charge_note: string | null;
  
  students: { id: string; full_name: string; classes: { id: number; name: string } | null } | null;
};
```

#### 3.2. Function `mapFeeRow`
```typescript
function mapFeeRow(row: FeeRow): FeeRecordP2 {
  return {
    // ... existing mappings
    base_amount_vnd: row.base_amount_vnd || row.amount_vnd,
    attendance_deduction_vnd: row.attendance_deduction_vnd || 0,
    other_deduction_vnd: row.other_deduction_vnd || 0,
    deduction_details: parseDetails(row.deduction_details),
    deduction_note: row.deduction_note,
    
    // ✅ NEW
    additional_charge_vnd: row.additional_charge_vnd || 0,
    additional_charge_note: row.additional_charge_note,
    
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
```

#### 3.3. Update SELECT queries
Tìm tất cả `.select()` trong file, thêm 2 field mới:
```typescript
// Trước:
.select('id, student_id, ..., deduction_note, students(...)')

// Sau:
.select('id, student_id, ..., deduction_note, additional_charge_vnd, additional_charge_note, students(...)')
```

**Các function cần sửa:**
- `listFees()`
- `getFeeById()`
- `createFeeRecord()`
- `updateFeeRecord()`

**Kiểm tra:**
- Service compile không lỗi
- API trả về đúng 2 field mới

---

### ✅ Step 4: Cập nhật FeeForm UI
**File:** `src/pages/FeeForm.tsx`

**Thay đổi:**

#### 4.1. Interface `FeeFormState`
```typescript
interface FeeFormState {
  // ... existing fields
  otherDeduction: string;
  deductionDetails: string;
  deductionNote: string;
  
  // ✅ NEW
  additionalCharge: string;
  additionalChargeNote: string;
}
```

#### 4.2. Default state trong `useState`
```typescript
const [formData, setFormData] = useState<FeeFormState>(() => {
  return {
    // ... existing defaults
    otherDeduction: '0',
    deductionDetails: '',
    deductionNote: '',
    
    // ✅ NEW
    additionalCharge: '0',
    additionalChargeNote: '',
  };
});
```

#### 4.3. Load data khi edit (trong `useEffect`)
```typescript
setFormData({
  // ... existing fields
  otherDeduction: String(item.other_deduction_vnd || 0),
  deductionNote: item.deduction_note || '',
  
  // ✅ NEW
  additionalCharge: String(item.additional_charge_vnd || 0),
  additionalChargeNote: item.additional_charge_note || '',
});
```

#### 4.4. Cập nhật `summary` calculation
```typescript
const summary = useMemo(() => {
  const base = Number(formData.baseAmount || formData.amount);
  const deduction = Number(formData.attendanceDeduction);
  const other = Number(formData.otherDeduction);
  const additional = Number(formData.additionalCharge); // ✅ NEW
  
  // ✅ NEW: Cộng thêm phụ thu
  const finalAmount = Math.max(0, base - deduction - other + additional);
  
  const paid = Number(formData.paidAmount);
  const due = Math.max(0, finalAmount - paid);
  
  return { base, deduction, other, additional, finalAmount, paid, due }; // ✅ thêm additional
}, [formData]);
```

#### 4.5. Thêm UI input fields (sau "Khấu trừ khác")
```tsx
{/* Amounts */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <CurrencyInput
    label="Học phí gốc"
    value={formData.baseAmount || formData.amount}
    onChange={(val) => updateField('baseAmount', val)}
    required
  />
  <CurrencyInput
    label="Khấu trừ khác"
    value={formData.otherDeduction}
    onChange={(val) => updateField('otherDeduction', val)}
  />
</div>

{/* ✅ NEW: Phụ thu section */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <CurrencyInput
    label="Phụ thu"
    value={formData.additionalCharge}
    onChange={(val) => updateField('additionalCharge', val)}
    hint="Nợ cũ, phí phát sinh, v.v."
  />
  <Input
    label="Ghi chú phụ thu"
    value={formData.additionalChargeNote}
    onChange={(e) => updateField('additionalChargeNote', e.target.value)}
    placeholder="Ví dụ: Nợ học phí tháng 4"
  />
</div>
```

#### 4.6. Cập nhật Summary display (phần tổng kết)
```tsx
{/* Summary */}
<div className="border border-primary/20 rounded-xl p-4 space-y-2 bg-primary/5">
  <div className="flex justify-between text-sm font-semibold">
    <span>Học phí gốc</span>
    <span>{formatCurrency(summary.base)}</span>
  </div>
  
  {summary.deduction > 0 && (
    <div className="flex justify-between text-sm text-red-500">
      <span>Khấu trừ vắng mặt</span>
      <span>-{formatCurrency(summary.deduction)}</span>
    </div>
  )}
  
  {summary.other > 0 && (
    <div className="flex justify-between text-sm text-red-500">
      <span>Khấu trừ khác</span>
      <span>-{formatCurrency(summary.other)}</span>
    </div>
  )}
  
  {/* ✅ NEW: Hiển thị phụ thu */}
  {summary.additional > 0 && (
    <div className="flex justify-between text-sm text-green-600">
      <span className="flex items-center gap-1">
        Phụ thu
        {formData.additionalChargeNote && (
          <span className="relative group cursor-help">
            <Info className="w-3 h-3" />
            <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
              {formData.additionalChargeNote}
            </span>
          </span>
        )}
      </span>
      <span>+{formatCurrency(summary.additional)}</span>
    </div>
  )}
  
  <div className="border-t pt-2 flex justify-between text-base font-bold">
    <span>Tổng phải nộp</span>
    <span className="text-primary">{formatCurrency(summary.finalAmount)}</span>
  </div>
  
  {/* ... existing paid/due display */}
</div>
```

#### 4.7. Cập nhật payload khi submit
```typescript
const payload: CreateFeeInput = {
  // ... existing fields
  base_amount_vnd: Number(formData.baseAmount || formData.amount),
  attendance_deduction_vnd: Number(formData.attendanceDeduction),
  other_deduction_vnd: Number(formData.otherDeduction),
  deduction_note: formData.deductionNote,
  
  // ✅ NEW
  additional_charge_vnd: Number(formData.additionalCharge),
  additional_charge_note: formData.additionalChargeNote || null,
  
  amount_vnd: finalAmount,
};
```

**Kiểm tra:**
- Form hiển thị đúng 2 field mới
- Tính toán tổng tiền đúng
- Submit thành công
- Edit load đúng data

---

### ✅ Step 5: Cập nhật Fees List Page (nếu cần)
**File:** `src/pages/Fees.tsx`

**Kiểm tra:**
- Danh sách fees hiển thị đúng
- Không cần thay đổi gì (vì chỉ hiển thị `amount_vnd` cuối cùng)

---

### ✅ Step 6: Cập nhật Print Receipt
**File:** `src/utils/printReceipt.ts` hoặc `src/pages/BulkPrintFees.tsx`

**Thay đổi (nếu cần hiển thị chi tiết):**
```typescript
// Thêm dòng phụ thu vào phiếu in
{fee.additional_charge_vnd > 0 && (
  <tr>
    <td>Phụ thu</td>
    <td className="text-right">+{formatCurrency(fee.additional_charge_vnd)}</td>
  </tr>
)}
{fee.additional_charge_note && (
  <tr>
    <td colSpan={2} className="text-xs italic text-muted-foreground">
      Ghi chú: {fee.additional_charge_note}
    </td>
  </tr>
)}
```

**Kiểm tra:**
- In phiếu thu hiển thị đúng phụ thu

---

## Testing Checklist

### Unit Tests
- [ ] `feesService.ts` - mapFeeRow() xử lý đúng 2 field mới
- [ ] `feesService.ts` - createFeeRecord() lưu đúng additional_charge
- [ ] `feesService.ts` - updateFeeRecord() cập nhật đúng

### Integration Tests
- [ ] Tạo fee mới với phụ thu → lưu thành công
- [ ] Edit fee, thêm phụ thu → cập nhật thành công
- [ ] Tính toán tổng tiền đúng: base - deduction - other + additional
- [ ] Load fee có phụ thu → hiển thị đúng trong form

### Manual Tests
- [ ] **TC1:** Tạo fee mới, nhập phụ thu 500,000đ, note "Nợ tháng 4"
  - Tổng tiền = học phí gốc + 500,000đ
  - Lưu thành công
  - Reload form → hiển thị đúng
  
- [ ] **TC2:** Edit fee cũ (không có phụ thu), thêm phụ thu 300,000đ
  - Tổng tiền tăng thêm 300,000đ
  - Cập nhật thành công
  
- [ ] **TC3:** Phụ thu = 0, note rỗng
  - Không hiển thị dòng phụ thu trong summary
  - Tính toán đúng
  
- [ ] **TC4:** In phiếu thu có phụ thu
  - Hiển thị dòng "Phụ thu: +500,000đ"
  - Hiển thị ghi chú (nếu có)

---

## Files Cần Sửa

### Backend (Supabase)
1. **Migration SQL** - thêm 2 cột mới

### Frontend
1. `src/types/domain.ts` - thêm 2 field vào interfaces
2. `src/services/feesService.ts` - map 2 field mới, update queries
3. `src/pages/FeeForm.tsx` - thêm UI inputs, update calculation
4. `src/pages/BulkPrintFees.tsx` hoặc `src/utils/printReceipt.ts` - hiển thị phụ thu khi in

---

## Ước Lượng Thời Gian

| Step | Thời gian | Độ khó |
|------|-----------|--------|
| Step 1: Database migration | 5 phút | Dễ |
| Step 2: TypeScript types | 5 phút | Dễ |
| Step 3: Service layer | 15 phút | Trung bình |
| Step 4: FeeForm UI | 30 phút | Trung bình |
| Step 5: Fees list check | 5 phút | Dễ |
| Step 6: Print receipt | 10 phút | Dễ |
| Testing | 20 phút | - |
| **Tổng** | **~90 phút** | - |

---

## Rủi Ro & Giải Pháp

### Rủi Ro 1: Migration fail trên production
**Giải pháp:** Test migration trên staging trước, backup database

### Rủi Ro 2: Fees cũ không có additional_charge_vnd
**Giải pháp:** Default = 0 trong migration, service layer xử lý null → 0

### Rủi Ro 3: Tính toán sai tổng tiền
**Giải pháp:** Viết unit test cho calculation logic, manual test kỹ

---

## Câu Hỏi Cần Xác Nhận

1. ✅ **Phụ thu có thể âm không?** (Ví dụ: giảm giá)
   - Giả định: Không, chỉ >= 0
   
2. ✅ **Ghi chú phụ thu có bắt buộc không?**
   - Giả định: Không bắt buộc, nhưng nên khuyến khích nhập
   
3. ✅ **Phụ thu có cần phân loại không?** (Nợ cũ, phạt, phí khác...)
   - Giả định: Không, chỉ cần note text tự do
   
4. ✅ **Có cần báo cáo riêng cho phụ thu không?**
   - Giả định: Chưa cần, để sau

---

## Kết Luận

Plan này thêm tính năng **phụ thu linh hoạt** vào hệ thống học phí:
- ✅ Đơn giản, dễ hiểu
- ✅ Không breaking changes
- ✅ Backward compatible (fees cũ có additional_charge = 0)
- ✅ Linh hoạt (note tự do, không cần phân loại cứng)
- ✅ Ước lượng 90 phút implement + test

Sẵn sàng implement!
