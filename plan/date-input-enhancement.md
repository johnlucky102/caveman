# Plan: Manual Date Input Enhancement

## Problem
Current DatePicker component only allows date selection via calendar popup. Users cannot type dates manually, making data entry slow and frustrating.

## Affected Components
- `src/components/common/DatePicker.tsx` - main component to modify
- Used in 6 pages:
  - StudentForm.tsx (date_of_birth, enrolled_date)
  - TeacherForm.tsx (date_of_birth, start_date)
  - FeeForm.tsx (due_date, paid_date)
  - Attendance.tsx (attendance_date, filters)
  - Settings.tsx (academic year dates)

## Solution Design

### Approach: Hybrid Input (Text + Calendar)

Replace button-only trigger with text input + calendar icon button.

**Benefits:**
- Users can type dates in familiar `dd/MM/yyyy` format
- Calendar popup still available for visual selection
- Maintains consistent UI across app
- Better UX than native `<input type="date">` (which shows different formats per browser)

**Layout:**
```
┌─────────────────────────────────────┐
│ [📅] 31/05/2026          [Calendar] │  ← Text input + icon button
└─────────────────────────────────────┘
```

### Implementation Steps

#### 1. Enhance DatePicker Component
**File:** `src/components/common/DatePicker.tsx`

**Changes:**
- Add text input field for manual entry
- Parse `dd/MM/yyyy` format to `yyyy-MM-dd` (storage format)
- Validate input on blur/change
- Sync text input ↔ calendar selection bidirectionally
- Show validation errors for invalid dates
- Keep calendar icon button to open popup
- Handle edge cases:
  - Invalid dates (32/13/2026)
  - Partial input (15/05/)
  - Clear button behavior

**Key functions to add:**
```typescript
// Parse dd/MM/yyyy → yyyy-MM-dd
function parseDisplayDate(display: string): string | null

// Format yyyy-MM-dd → dd/MM/yyyy  
function formatToDisplay(iso: string): string

// Validate dd/MM/yyyy format
function isValidDateInput(input: string): boolean
```

**State management:**
- Add local state for text input value
- Debounce validation to avoid flickering errors while typing
- Only update parent `setDate()` on valid dates

#### 2. Maintain Backward Compatibility
- Keep all existing props unchanged
- No breaking changes to consuming components
- All 6 pages continue working without modification

#### 3. Accessibility
- Proper label association
- Keyboard navigation (Tab, Enter to open calendar)
- Screen reader announcements for errors
- Focus management between input and calendar

#### 4. Testing Strategy
- Manual testing on StudentForm (most critical use case)
- Test scenarios:
  - Type valid date → should parse correctly
  - Type invalid date → should show error
  - Select from calendar → should update text input
  - Clear button → should clear both text and selection
  - Partial input then blur → should show validation error
  - Required field validation still works

## Files to Modify

### Primary Changes
1. `src/components/common/DatePicker.tsx` - complete rewrite of input mechanism

### No Changes Required
- All consuming pages (StudentForm, TeacherForm, etc.) - work as-is
- Type definitions - props interface stays same
- Validation logic in forms - unchanged

## Technical Details

### Date Format Handling
- **Display format:** `dd/MM/yyyy` (Vietnamese standard)
- **Storage format:** `yyyy-MM-dd` (ISO 8601, database standard)
- **Parsing library:** `date-fns` (already in dependencies v3.0.0)

### Validation Rules
- Must match `dd/MM/yyyy` pattern
- Day: 1-31 (validated against month)
- Month: 1-12
- Year: 1900-2100 (reasonable range)
- Leap year handling via `date-fns`

### Error Messages (Vietnamese)
- "Ngày không hợp lệ" - Invalid date
- "Định dạng: dd/MM/yyyy" - Format hint
- Existing required field errors unchanged

## Risk Assessment

**Low Risk:**
- Single component change
- No API/backend changes
- No database schema changes
- Backward compatible props

**Mitigation:**
- Keep calendar popup as fallback
- Extensive manual testing before commit
- Can revert easily if issues found

## Success Criteria

✅ Users can type dates in `dd/MM/yyyy` format
✅ Calendar popup still works
✅ Invalid dates show clear error messages
✅ All existing forms work without modification
✅ No console errors or warnings
✅ Accessible via keyboard
