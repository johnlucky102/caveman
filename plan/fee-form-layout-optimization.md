# Plan: Tối Ưu Layout FeeForm + Multi-Item Deductions

## Phân Tích Vấn Đề

### Hiện tại
- Các field sắp xếp lộn xộn
- Thông tin và tiền bạc lẫn lộn
- **"Khấu trừ khác"** chỉ nhập 1 số → không rõ khấu trừ gì
- "Chi tiết khấu trừ chuyên cần" hiển thị dư thừa (đã có trong summary)
- "Chi tiết phụ thu" luôn mở → chiếm nhiều chỗ

### Yêu cầu
1. **Tách rõ ràng:** Thông tin trên, tiền bạc dưới
2. **"Khấu trừ khác"** → multi-item như "Chi tiết phụ thu"
3. **"Khấu trừ vắng mặt"** → giữ nguyên (đã setting hệ thống)
4. **Ẩn "Chi tiết khấu trừ chuyên cần"** - đã có trong summary
5. **Toggle "Chi tiết phụ thu"** - chỉ mở khi cần

---

## Layout Mới

### Section 1: Thông Tin Cơ Bản (trên)
```
┌─────────────────────────────────────────────┐
│ THÔNG TIN CƠ BẢN                            │
├─────────────────────────────────────────────┤
│ Lọc theo lớp        │ Tiêu đề               │
│ Học sinh (full width)                       │
│ Tháng               │ Hạn nộp               │
└─────────────────────────────────────────────┘
```

### Section 2: Tiền Bạc (dưới)
```
┌─────────────────────────────────────────────┐
│ TIỀN BẠC                                    │
├─────────────────────────────────────────────┤
│ Học phí gốc:        2,000,000 đ            │
│                                             │
│ ▼ Chi tiết khấu trừ khác (2 khoản) [+]    │ ← MỚI: Multi-item + Toggle
│   • Phạt đi muộn        -50,000 đ          │
│   • Thiếu đồng phục     -30,000 đ          │
│   Tổng: -80,000 đ                          │
│                                             │
│ ▼ Chi tiết phụ thu (3 khoản) [+]          │ ← Toggle
│   • Nợ tháng 4         +500,000 đ          │
│   • Phí ăn thêm        +200,000 đ          │
│   • Phí xe             +150,000 đ          │
│   Tổng: +850,000 đ                         │
│                                             │
│ ─────────────────────────────────────────── │
│ TỔNG KẾT                                    │
│ Học phí gốc:           2,000,000 đ         │
│ Khấu trừ vắng mặt:      -200,000 đ         │
│   • Tiền ăn: 1 ngày × 20,000đ              │
│ Khấu trừ khác:           -80,000 đ         │
│   • Phạt đi muộn         -50,000 đ         │
│   • Thiếu đồng phục      -30,000 đ         │
│ Phụ thu:               +850,000 đ          │
│   • Nợ tháng 4          +500,000 đ         │
│   • Phí ăn thêm         +200,000 đ         │
│   • Phí xe              +150,000 đ         │
│ ─────────────────────────────────────────── │
│ Tổng cộng:            2,570,000 đ          │
│                                             │
│ Đã thanh toán       │ Phương thức           │
│ Ngày thanh toán                             │
└─────────────────────────────────────────────┘
```

---

## Database Schema

### Không cần migration mới!

Tương tự "Chi tiết phụ thu", lưu JSON vào `other_deduction_vnd` và tạo field mới:

**Hiện tại:**
- `other_deduction_vnd` (number) - tổng khấu trừ khác
- Không có field lưu chi tiết

**Sau:**
- `other_deduction_vnd` (number) - tổng (giữ nguyên)
- `other_deduction_details` (text) - JSON array chi tiết (MỚI)

```sql
ALTER TABLE fee_records
ADD COLUMN IF NOT EXISTS other_deduction_details TEXT;

COMMENT ON COLUMN fee_records.other_deduction_details IS 'Chi tiết khấu trừ khác (JSON array)';
```

**Cấu trúc JSON:**
```typescript
interface OtherDeductionDetail {
  id: string;
  name: string;
  amount: number;
  note?: string | null;
}

// Ví dụ:
other_deduction_details = JSON.stringify([
  { id: "uuid-1", name: "Phạt đi muộn", amount: 50000, note: "3 lần" },
  { id: "uuid-2", name: "Thiếu đồng phục", amount: 30000, note: null }
])

// other_deduction_vnd = 80000 (tổng)
```

---

## Implementation Steps

### ✅ Step 1: Database Migration
**File:** `supabase/migrations/20260531_add_other_deduction_details.sql`

```sql
ALTER TABLE fee_records
ADD COLUMN IF NOT EXISTS other_deduction_details TEXT;

COMMENT ON COLUMN fee_records.other_deduction_details IS 'Chi tiết khấu trừ khác (JSON array)';
```

---

### ✅ Step 2: TypeScript Types
**File:** `src/types/domain.ts`

```typescript
// Thêm interface mới (giống AdditionalChargeDetail)
export interface OtherDeductionDetail {
  id: string;
  name: string;
  amount: number;
  note?: string | null;
}

// Cập nhật FeeRecordP2
export interface FeeRecordP2 {
  // ... existing
  other_deduction_vnd: number;
  other_deduction_details: OtherDeductionDetail[]; // NEW
  // ...
}

// Cập nhật CreateFeeInput
export interface CreateFeeInput {
  // ... existing
  other_deduction_vnd?: number;
  other_deduction_details?: OtherDeductionDetail[]; // NEW
  // ...
}
```

---

### ✅ Step 3: Service Layer
**File:** `src/services/feesService.ts`

```typescript
// Thêm parse function
function parseOtherDeductionDetails(raw: any): OtherDeductionDetail[] {
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
    // Parse fail → return []
  }

  return [];
}

// Cập nhật FeeRow type
type FeeRow = {
  // ... existing
  other_deduction_vnd: number | null;
  other_deduction_details: string | null; // NEW
  // ...
};

// Cập nhật mapFeeRow
function mapFeeRow(row: FeeRow): FeeRecordP2 {
  return {
    // ... existing
    other_deduction_vnd: row.other_deduction_vnd || 0,
    other_deduction_details: parseOtherDeductionDetails(row.other_deduction_details),
    // ...
  };
}

// Cập nhật SELECT queries - thêm other_deduction_details
.select('..., other_deduction_vnd, other_deduction_details, ...')
```

---

### ✅ Step 4: FeeForm State
**File:** `src/pages/FeeForm.tsx`

```typescript
interface FeeFormState {
  // ... existing
  // REMOVE: otherDeduction: string;
  
  // NEW:
  otherDeductionDetails: OtherDeductionDetail[];
  additionalChargeDetails: AdditionalChargeDetail[];
}

// Default state
const [formData, setFormData] = useState<FeeFormState>(() => {
  return {
    // ... existing
    otherDeductionDetails: [], // NEW
    additionalChargeDetails: [],
  };
});

// Toggle states
const [showOtherDeductionDetails, setShowOtherDeductionDetails] = useState(false);
const [showAdditionalChargeDetails, setShowAdditionalChargeDetails] = useState(false);
```

---

### ✅ Step 5: Load Data với Backward Compatibility
**File:** `src/pages/FeeForm.tsx`

```typescript
// Parse other deduction details với backward compatibility
let otherDeductionDetails: OtherDeductionDetail[] = [];
if (item.other_deduction_details && item.other_deduction_details.length > 0) {
  otherDeductionDetails = item.other_deduction_details;
} else if (item.other_deduction_vnd > 0) {
  // Convert old format to new format
  otherDeductionDetails = [{
    id: crypto.randomUUID(),
    name: 'Khấu trừ khác',
    amount: item.other_deduction_vnd,
    note: null,
  }];
}

setFormData({
  // ... existing
  otherDeductionDetails: otherDeductionDetails,
  additionalChargeDetails: additionalDetails,
});
```

---

### ✅ Step 6: Tính Tổng Tự Động
**File:** `src/pages/FeeForm.tsx`

```typescript
const otherDeductionTotal = useMemo(() => {
  return formData.otherDeductionDetails.reduce((sum, item) => sum + item.amount, 0);
}, [formData.otherDeductionDetails]);

const additionalChargeTotal = useMemo(() => {
  return formData.additionalChargeDetails.reduce((sum, item) => sum + item.amount, 0);
}, [formData.additionalChargeDetails]);

const summary = useMemo(() => {
  const base = Number(formData.baseAmount || formData.amount);
  const deduction = Number(formData.attendanceDeduction);
  const other = otherDeductionTotal; // Dùng tổng từ details
  const additional = additionalChargeTotal;
  const finalAmount = Math.max(0, base - deduction - other + additional);
  const paid = Number(formData.paidAmount);
  const due = Math.max(0, finalAmount - paid);
  return { base, deduction, other, additional, finalAmount, paid, due };
}, [formData, otherDeductionTotal, additionalChargeTotal]);
```

---

### ✅ Step 7: UI Layout Mới
**File:** `src/pages/FeeForm.tsx`

```tsx
<Card>
  <div className="p-5 space-y-6">
    
    {/* ===== SECTION 1: THÔNG TIN CƠ BẢN ===== */}
    <div className="space-y-4 pb-6 border-b border-border">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Thông tin cơ bản
      </h3>

      {/* Class Filter + Title */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
        <Select label="Lọc theo lớp" ... />
        <Input label="Tiêu đề" ... />
      </div>

      {/* Student */}
      <div className="print:hidden">
        <Select label="Học sinh" ... />
      </div>

      {/* Period */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
        <Select label="Tháng" ... />
        <DatePicker label="Hạn nộp" ... />
      </div>
    </div>

    {/* ===== SECTION 2: TIỀN BẠC ===== */}
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Tiền bạc
      </h3>

      {/* Học phí gốc */}
      <CurrencyInput
        label="Học phí gốc"
        value={formData.baseAmount || formData.amount}
        onChange={(val) => updateField('baseAmount', val)}
        required
      />

      {/* Chi tiết khấu trừ khác - Collapsible */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowOtherDeductionDetails(!showOtherDeductionDetails)}
          className="flex items-center justify-between w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ChevronDown 
              className={cn(
                "w-4 h-4 transition-transform text-muted-foreground",
                showOtherDeductionDetails && "rotate-180"
              )}
            />
            <label className="text-sm font-medium text-foreground cursor-pointer">
              Chi tiết khấu trừ khác
              {formData.otherDeductionDetails.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({formData.otherDeductionDetails.length} khoản)
                </span>
              )}
            </label>
          </div>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const newItem: OtherDeductionDetail = {
                id: crypto.randomUUID(),
                name: '',
                amount: 0,
                note: null,
              };
              updateField('otherDeductionDetails', [...formData.otherDeductionDetails, newItem]);
              setShowOtherDeductionDetails(true);
            }}
            leftIcon={<Plus className="w-3 h-3" />}
          >
            Thêm khoản
          </Button>
        </button>

        {showOtherDeductionDetails && (
          <div className="space-y-2 pl-6">
            {formData.otherDeductionDetails.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-4 text-center text-sm text-muted-foreground">
                Chưa có khoản khấu trừ. Nhấn "Thêm khoản" để thêm.
              </div>
            ) : (
              <>
                {formData.otherDeductionDetails.map((item, index) => (
                  <div key={item.id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Tên khoản khấu trừ"
                        value={item.name}
                        onChange={(e) => {
                          const newDetails = [...formData.otherDeductionDetails];
                          newDetails[index] = { ...item, name: e.target.value };
                          updateField('otherDeductionDetails', newDetails);
                        }}
                        className="flex-1"
                      />
                      <CurrencyInput
                        value={String(item.amount)}
                        onChange={(val) => {
                          const newDetails = [...formData.otherDeductionDetails];
                          newDetails[index] = { ...item, amount: Number(val) };
                          updateField('otherDeductionDetails', newDetails);
                        }}
                        className="w-40"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => {
                          const newDetails = formData.otherDeductionDetails.filter((_, i) => i !== index);
                          updateField('otherDeductionDetails', newDetails);
                        }}
                        leftIcon={<Trash2 className="w-3 h-3 text-red-500" />}
                      />
                    </div>
                    <Input
                      placeholder="Ghi chú (tùy chọn)"
                      value={item.note || ''}
                      onChange={(e) => {
                        const newDetails = [...formData.otherDeductionDetails];
                        newDetails[index] = { ...item, note: e.target.value };
                        updateField('otherDeductionDetails', newDetails);
                      }}
                    />
                  </div>
                ))}

                {/* Tổng khấu trừ khác */}
                <div className="border-t border-red-200/60 pt-2 flex justify-between items-center font-semibold text-red-600">
                  <span>Tổng khấu trừ khác</span>
                  <span>-{formatCurrency(otherDeductionTotal)}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Chi tiết phụ thu - Collapsible */}
      <div className="space-y-3">
        {/* Tương tự như trên, đã có sẵn */}
      </div>

      {/* REMOVE: Chi tiết khấu trừ chuyên cần - XÓA HOÀN TOÀN */}

      {/* Summary */}
      <div className="border border-primary/20 rounded-xl p-4 space-y-2 bg-primary/5">
        <div className="flex justify-between text-sm font-semibold">
          <span>Học phí gốc</span>
          <span>{formatCurrency(summary.base)}</span>
        </div>

        {summary.deduction > 0 && (
          <div className="space-y-0.5">
            <div className="flex justify-between text-sm text-red-500">
              <span>Khấu trừ vắng mặt</span>
              <span>-{formatCurrency(summary.deduction)}</span>
            </div>
            {/* Chi tiết inline từ parsedDeductionDetails */}
            {parsedDeductionDetails.map((detail) => (
              <div key={detail.id} className="flex justify-between text-xs text-red-400/70 pl-3">
                <span>• {detail.name}: {detail.absent_days} ngày × {formatCurrency(detail.amount)}</span>
                <span>-{formatCurrency(detail.subtotal)}</span>
              </div>
            ))}
          </div>
        )}

        {summary.other > 0 && (
          <div className="space-y-0.5">
            <div className="flex justify-between text-sm text-red-500">
              <span>Khấu trừ khác</span>
              <span>-{formatCurrency(summary.other)}</span>
            </div>
            {/* Chi tiết inline từ otherDeductionDetails */}
            {formData.otherDeductionDetails.map((item) => (
              <div key={item.id} className="flex justify-between text-xs text-red-400/70 pl-3">
                <span className="flex items-center gap-1">
                  • {item.name || 'Chưa đặt tên'}
                  {item.note && (
                    <span className="relative group cursor-help">
                      <Info className="w-2.5 h-2.5" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {item.note}
                      </span>
                    </span>
                  )}
                </span>
                <span>-{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {summary.additional > 0 && (
          <div className="space-y-0.5">
            <div className="flex justify-between text-sm text-green-600">
              <span>Phụ thu</span>
              <span>+{formatCurrency(summary.additional)}</span>
            </div>
            {/* Chi tiết inline từ additionalChargeDetails */}
            {formData.additionalChargeDetails.map((item) => (
              <div key={item.id} className="flex justify-between text-xs text-green-500/70 pl-3">
                <span className="flex items-center gap-1">
                  • {item.name || 'Chưa đặt tên'}
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

        <div className="flex justify-between text-lg font-black border-t border-primary/20 pt-2">
          <span>Tổng cộng</span>
          <span className="text-primary">{formatCurrency(summary.finalAmount)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span>Đã thanh toán</span>
          <span className={summary.paid > 0 ? 'text-emerald-500' : 'text-muted-foreground'}>
            {formatCurrency(summary.paid)}
          </span>
        </div>

        <div className="flex justify-between text-sm border-t border-border pt-2">
          <span className="font-bold">Còn lại</span>
          <span className={`font-bold ${summary.due <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {summary.due <= 0 ? 'Đã hoàn tất' : formatCurrency(summary.due)}
          </span>
        </div>
      </div>

      {/* Payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
        <CurrencyInput label="Đã thanh toán" ... />
        <Select label="Phương thức" ... />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
        <DatePicker label="Ngày thanh toán" ... />
      </div>
    </div>

    {/* Save button */}
    <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />} fullWidth>
      {isEdit ? 'Cập nhật phiếu thu' : 'Tạo phiếu thu'}
    </Button>
  </div>
</Card>
```

---

### ✅ Step 8: Submit Payload
**File:** `src/pages/FeeForm.tsx`

```typescript
const payload: CreateFeeInput = {
  // ... existing
  other_deduction_vnd: otherDeductionTotal,
  other_deduction_details: JSON.stringify(formData.otherDeductionDetails),
  additional_charge_vnd: additionalChargeTotal,
  additional_charge_note: JSON.stringify(formData.additionalChargeDetails),
};
```

---

### ✅ Step 9: Import Icons
**File:** `src/pages/FeeForm.tsx`

```typescript
import { 
  ArrowLeft, Info, Printer, Receipt, Save, Trash2, Wallet, 
  RefreshCw, Lock, AlertCircle, Plus, ChevronDown 
} from 'lucide-react';
import { cn } from '@/lib/utils';
```

---

### ✅ Step 10: Update Mock Factory
**File:** `src/test/utils/mockFactories.ts`

```typescript
return {
  // ... existing
  other_deduction_vnd: 0,
  other_deduction_details: [], // NEW
  additional_charge_vnd: 0,
  additional_charge_note: null,
  additional_charge_details: [],
  // ...
};
```

---

## Summary of Changes

### 3 Loại Khấu Trừ/Phụ Thu

| Loại | Hiện tại | Sau khi implement |
|------|----------|-------------------|
| **Khấu trừ vắng mặt** | Auto từ attendance + finance config | Giữ nguyên (không đổi) |
| **Khấu trừ khác** | 1 số tổng | Multi-item + toggle |
| **Phụ thu** | Multi-item (đã có) | Thêm toggle |

### Database

| Field | Type | Mô tả |
|-------|------|-------|
| `attendance_deduction_vnd` | number | Tổng khấu trừ vắng (giữ nguyên) |
| `deduction_details` | text (JSON) | Chi tiết khấu trừ vắng (giữ nguyên) |
| `other_deduction_vnd` | number | Tổng khấu trừ khác (giữ nguyên) |
| `other_deduction_details` | text (JSON) | Chi tiết khấu trừ khác (MỚI) |
| `additional_charge_vnd` | number | Tổng phụ thu (giữ nguyên) |
| `additional_charge_note` | text (JSON) | Chi tiết phụ thu (đã có) |

---

## Files Cần Sửa

1. `supabase/migrations/20260531_add_other_deduction_details.sql` - NEW
2. `src/types/domain.ts` - thêm `OtherDeductionDetail` interface
3. `src/services/feesService.ts` - parse + map
4. `src/pages/FeeForm.tsx` - UI layout mới + toggle
5. `src/test/utils/mockFactories.ts` - mock data

**Tổng:** 1 migration + 4 files

---

## Testing

- [ ] Thêm nhiều khoản "Khấu trừ khác"
- [ ] Tổng tự động cập nhật
- [ ] Toggle đóng/mở hoạt động
- [ ] Backward compatibility (fees cũ convert đúng)
- [ ] Summary hiển thị đầy đủ chi tiết
- [ ] "Chi tiết khấu trừ chuyên cần" không hiển thị
- [ ] Layout responsive mobile

---

## Kết Luận

Plan này:
✅ Tối ưu layout (thông tin trên, tiền bạc dưới)  
✅ "Khấu trừ khác" → multi-item + toggle  
✅ "Phụ thu" → thêm toggle  
✅ "Khấu trừ vắng mặt" → giữ nguyên  
✅ Xóa "Chi tiết khấu trừ chuyên cần" dư thừa  
✅ Summary hiển thị đầy đủ inline  

Sẵn sàng implement!
