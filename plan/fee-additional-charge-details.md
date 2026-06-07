# Plan: Chi Tiết Phụ Thu (Multiple Additional Charge Items)

## Phân Tích Yêu Cầu

### Vấn đề hiện tại
- Chỉ có 1 ô nhập "Phụ thu" tổng
- Nếu có nhiều khoản phụ thu (nợ tháng 4 + phí ăn thêm + phí xe...) → phải tự tính tổng rồi mới nhập
- Rất bất tiện, dễ sai

### Giải pháp
Tương tự như "Chi tiết khấu trừ chuyên cần", tạo **danh sách chi tiết phụ thu**:
- Mỗi item có: tên khoản phụ thu + số tiền + ghi chú (optional)
- Có nút "Thêm khoản phụ thu"
- Có nút xóa từng item
- Tự động tính tổng

### UI Mockup
```
┌─────────────────────────────────────────────────────────┐
│ Chi tiết phụ thu                          [+ Thêm khoản]│
├─────────────────────────────────────────────────────────┤
│ Nợ học phí tháng 4        500,000 đ    [Ghi chú] [Xóa] │
│ Phí ăn thêm               200,000 đ    [Ghi chú] [Xóa] │
│ Phí xe buýt               150,000 đ    [Ghi chú] [Xóa] │
├─────────────────────────────────────────────────────────┤
│ Tổng phụ thu:                           850,000 đ       │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Không cần thay đổi database!

Dùng lại cột `additional_charge_note` để lưu JSON array:

```typescript
// Cấu trúc JSON lưu trong additional_charge_note
interface AdditionalChargeDetail {
  id: string;           // UUID
  name: string;         // Tên khoản phụ thu
  amount: number;       // Số tiền
  note?: string | null; // Ghi chú (optional)
}

// Ví dụ:
additional_charge_note = JSON.stringify([
  { id: "uuid-1", name: "Nợ học phí tháng 4", amount: 500000, note: null },
  { id: "uuid-2", name: "Phí ăn thêm", amount: 200000, note: "Ăn thêm 10 ngày" },
  { id: "uuid-3", name: "Phí xe buýt", amount: 150000, note: null }
])

// additional_charge_vnd = 850000 (tổng)
```

**Lý do:**
- Không cần migration mới
- Tương tự cách lưu `deduction_details` (đã có sẵn)
- Backward compatible: nếu `additional_charge_note` là string thường → hiển thị như cũ

---

## Implementation Steps

### ✅ Step 1: Cập nhật TypeScript Types
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
  additional_charge_note: string | null; // Giữ nguyên type (vẫn là string)
  additional_charge_details?: AdditionalChargeDetail[]; // NEW: parsed từ note
  // ...
}
```

---

### ✅ Step 2: Cập nhật Service Layer
**File:** `src/services/feesService.ts`

Thêm helper function:
```typescript
function parseAdditionalChargeDetails(raw: any): AdditionalChargeDetail[] {
  if (!raw) return [];
  if (typeof raw !== 'string') return [];
  
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Validate structure
      return parsed.filter(item => 
        item && 
        typeof item.id === 'string' && 
        typeof item.name === 'string' && 
        typeof item.amount === 'number'
      );
    }
  } catch {
    // Nếu parse fail → là string ghi chú cũ, return []
  }
  
  return [];
}
```

Cập nhật `mapFeeRow`:
```typescript
function mapFeeRow(row: FeeRow): FeeRecordP2 {
  const additionalChargeDetails = parseAdditionalChargeDetails(row.additional_charge_note);
  
  return {
    // ... existing mappings
    additional_charge_vnd: row.additional_charge_vnd || 0,
    additional_charge_note: row.additional_charge_note,
    additional_charge_details: additionalChargeDetails, // NEW
    // ...
  };
}
```

---

### ✅ Step 3: Cập nhật FeeForm State
**File:** `src/pages/FeeForm.tsx`

Thay đổi state:
```typescript
interface FeeFormState {
  // ... existing fields
  // REMOVE: additionalCharge: string;
  // REMOVE: additionalChargeNote: string;
  
  // NEW: danh sách chi tiết
  additionalChargeDetails: AdditionalChargeDetail[];
}
```

Default state:
```typescript
const [formData, setFormData] = useState<FeeFormState>(() => {
  return {
    // ... existing
    additionalChargeDetails: [], // NEW
  };
});
```

---

### ✅ Step 4: Load Data khi Edit
**File:** `src/pages/FeeForm.tsx`

```typescript
// Trong useEffect load fee
if (feeResult?.item) {
  const item = feeResult.item;
  
  setFormData({
    // ... existing fields
    additionalChargeDetails: item.additional_charge_details || [], // NEW
  });
}
```

---

### ✅ Step 5: Tính Tổng Phụ Thu
**File:** `src/pages/FeeForm.tsx`

```typescript
const additionalChargeTotal = useMemo(() => {
  return formData.additionalChargeDetails.reduce((sum, item) => sum + item.amount, 0);
}, [formData.additionalChargeDetails]);

const summary = useMemo(() => {
  const base = Number(formData.baseAmount || formData.amount);
  const deduction = Number(formData.attendanceDeduction);
  const other = Number(formData.otherDeduction);
  const additional = additionalChargeTotal; // Dùng tổng tính từ details
  
  const finalAmount = Math.max(0, base - deduction - other + additional);
  const paid = Number(formData.paidAmount);
  const due = Math.max(0, finalAmount - paid);
  
  return { base, deduction, other, additional, finalAmount, paid, due };
}, [formData, additionalChargeTotal]);
```

---

### ✅ Step 6: UI - Danh Sách Chi Tiết Phụ Thu
**File:** `src/pages/FeeForm.tsx`

Thêm component con:
```tsx
function AdditionalChargeItem({ 
  item, 
  onUpdate, 
  onRemove 
}: { 
  item: AdditionalChargeDetail; 
  onUpdate: (updated: AdditionalChargeDetail) => void;
  onRemove: () => void;
}) {
  const [showNote, setShowNote] = useState(!!item.note);
  
  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Tên khoản phụ thu"
          value={item.name}
          onChange={(e) => onUpdate({ ...item, name: e.target.value })}
          className="flex-1"
        />
        <CurrencyInput
          value={String(item.amount)}
          onChange={(val) => onUpdate({ ...item, amount: Number(val) })}
          className="w-40"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNote(!showNote)}
          leftIcon={<Info className="w-3 h-3" />}
        >
          {showNote ? 'Ẩn' : 'Ghi chú'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          leftIcon={<Trash2 className="w-3 h-3 text-red-500" />}
        />
      </div>
      
      {showNote && (
        <Input
          placeholder="Ghi chú (tùy chọn)"
          value={item.note || ''}
          onChange={(e) => onUpdate({ ...item, note: e.target.value })}
        />
      )}
    </div>
  );
}
```

Thêm section trong form:
```tsx
{/* Additional Charge Details */}
<div className="space-y-3">
  <div className="flex items-center justify-between">
    <label className="text-sm font-medium">Chi tiết phụ thu</label>
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        const newItem: AdditionalChargeDetail = {
          id: crypto.randomUUID(),
          name: '',
          amount: 0,
          note: null,
        };
        updateField('additionalChargeDetails', [...formData.additionalChargeDetails, newItem]);
      }}
      leftIcon={<Plus className="w-3 h-3" />}
    >
      Thêm khoản
    </Button>
  </div>
  
  {formData.additionalChargeDetails.length === 0 ? (
    <div className="border border-dashed border-border rounded-lg p-4 text-center text-sm text-muted-foreground">
      Chưa có khoản phụ thu. Nhấn "Thêm khoản" để thêm.
    </div>
  ) : (
    <div className="space-y-2">
      {formData.additionalChargeDetails.map((item, index) => (
        <AdditionalChargeItem
          key={item.id}
          item={item}
          onUpdate={(updated) => {
            const newDetails = [...formData.additionalChargeDetails];
            newDetails[index] = updated;
            updateField('additionalChargeDetails', newDetails);
          }}
          onRemove={() => {
            const newDetails = formData.additionalChargeDetails.filter((_, i) => i !== index);
            updateField('additionalChargeDetails', newDetails);
          }}
        />
      ))}
      
      {/* Tổng phụ thu */}
      <div className="border-t border-primary/20 pt-2 flex justify-between items-center font-semibold text-green-600">
        <span>Tổng phụ thu</span>
        <span>+{formatCurrency(additionalChargeTotal)}</span>
      </div>
    </div>
  )}
</div>
```

---

### ✅ Step 7: Submit Payload
**File:** `src/pages/FeeForm.tsx`

```typescript
const payload: CreateFeeInput = {
  // ... existing fields
  additional_charge_vnd: additionalChargeTotal, // Tổng tính từ details
  additional_charge_note: JSON.stringify(formData.additionalChargeDetails), // Lưu JSON
};
```

---

### ✅ Step 8: Cập nhật Summary Display
**File:** `src/pages/FeeForm.tsx`

```tsx
{summary.additional > 0 && (
  <div className="space-y-1">
    <div className="flex justify-between text-sm text-green-600 font-semibold">
      <span>Phụ thu</span>
      <span>+{formatCurrency(summary.additional)}</span>
    </div>
    
    {/* Chi tiết từng khoản */}
    {formData.additionalChargeDetails.map((item) => (
      <div key={item.id} className="flex justify-between text-xs text-green-500/70 pl-3">
        <span className="flex items-center gap-1">
          • {item.name}
          {item.note && (
            <span className="relative group cursor-help">
              <Info className="w-2.5 h-2.5" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {item.note}
              </span>
            </span>
          )}
        </span>
        <span>+{formatCurrency(item.amount)}</span>
      </div>
    ))}
  </div>
)}
```

---

### ✅ Step 9: Backward Compatibility
**File:** `src/pages/FeeForm.tsx`

Xử lý fees cũ (có `additional_charge_note` là string thường):
```typescript
// Trong useEffect load fee
if (feeResult?.item) {
  const item = feeResult.item;
  
  let additionalDetails: AdditionalChargeDetail[] = [];
  
  // Nếu có details parsed → dùng
  if (item.additional_charge_details && item.additional_charge_details.length > 0) {
    additionalDetails = item.additional_charge_details;
  } 
  // Nếu không có details nhưng có amount > 0 → convert từ note cũ
  else if (item.additional_charge_vnd > 0) {
    additionalDetails = [{
      id: crypto.randomUUID(),
      name: item.additional_charge_note || 'Phụ thu',
      amount: item.additional_charge_vnd,
      note: null,
    }];
  }
  
  setFormData({
    // ... existing
    additionalChargeDetails: additionalDetails,
  });
}
```

---

## Testing Checklist

### Unit Tests
- [ ] `parseAdditionalChargeDetails()` parse đúng JSON array
- [ ] `parseAdditionalChargeDetails()` return [] khi string thường
- [ ] Tính tổng phụ thu đúng

### Integration Tests
- [ ] Thêm 3 khoản phụ thu → tổng đúng
- [ ] Xóa 1 khoản → tổng cập nhật
- [ ] Sửa số tiền 1 khoản → tổng cập nhật
- [ ] Submit → lưu JSON đúng
- [ ] Load lại → hiển thị đúng 3 khoản

### Manual Tests
- [ ] **TC1:** Tạo fee mới, thêm 3 khoản phụ thu
  - Nợ tháng 4: 500,000đ
  - Phí ăn thêm: 200,000đ (ghi chú: "10 ngày")
  - Phí xe: 150,000đ
  - Tổng = 850,000đ
  - Submit → lưu thành công
  
- [ ] **TC2:** Edit fee cũ (có phụ thu dạng string)
  - Load → convert thành 1 item
  - Thêm item mới
  - Submit → lưu đúng
  
- [ ] **TC3:** Xóa tất cả items
  - Tổng = 0đ
  - Không hiển thị section phụ thu trong summary
  
- [ ] **TC4:** Validation
  - Tên rỗng → highlight
  - Số tiền = 0 → cho phép (có thể là ghi chú)

---

## Files Cần Sửa

1. `src/types/domain.ts` - thêm `AdditionalChargeDetail` interface
2. `src/services/feesService.ts` - thêm `parseAdditionalChargeDetails()`, update `mapFeeRow()`
3. `src/pages/FeeForm.tsx` - UI danh sách chi tiết, tính tổng, submit

**Tổng:** 3 files

---

## Ước Lượng Thời Gian

| Task | Thời gian |
|------|-----------|
| Step 1-2: Types + Service | 10 phút |
| Step 3-5: State + Logic | 15 phút |
| Step 6: UI Component | 30 phút |
| Step 7-8: Submit + Display | 15 phút |
| Step 9: Backward compat | 10 phút |
| Testing | 20 phút |
| **Tổng** | **~100 phút** |

---

## So Sánh: Trước vs Sau

### Trước (hiện tại)
```
Phụ thu: [_________] 850000
Ghi chú: [_________] Nợ tháng 4 + phí ăn + xe
         ↑ phải tự tính tổng
```

### Sau (mới)
```
Chi tiết phụ thu:                    [+ Thêm khoản]
┌────────────────────────────────────────────────┐
│ Nợ tháng 4        500,000đ  [Ghi chú] [Xóa]   │
│ Phí ăn thêm       200,000đ  [Ghi chú] [Xóa]   │
│ Phí xe            150,000đ  [Ghi chú] [Xóa]   │
├────────────────────────────────────────────────┤
│ Tổng phụ thu:                 850,000đ        │
└────────────────────────────────────────────────┘
         ↑ tự động tính
```

---

## Kết Luận

Plan này nâng cấp tính năng phụ thu:
- ✅ Không cần migration database
- ✅ Nhập từng khoản riêng biệt
- ✅ Tự động tính tổng
- ✅ Backward compatible
- ✅ UI tương tự "Chi tiết khấu trừ chuyên cần"

Sẵn sàng implement!
