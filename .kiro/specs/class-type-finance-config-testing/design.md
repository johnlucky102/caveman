# Design Document: Class Type Finance Config Testing

## Overview

Test suite for Class Type Finance Config refactor. Refactor changed finance config from `class_id` to `class_type` ('Daycare' | 'Evening'). Shared configs across class types. Need comprehensive tests: unit (services), component (UI), integration (DB constraints), E2E (full flow).

**Key Changes Tested:**
- Finance configs query by `class_type` not `class_id`
- Fee calculation uses class's `class_type` to lookup config
- Classes service no longer auto-creates finance configs
- UI shows class types not individual class names
- DB enforces unique constraint per class_type

**Testing Stack:**
- Vitest: unit + component tests
- @testing-library/react: component rendering
- Playwright: E2E tests
- fast-check: property-based testing (if applicable)

## Architecture

### Test Organization

```
src/
├── services/
│   ├── __tests__/
│   │   ├── financeConfigService.test.ts
│   │   ├── feesService.test.ts
│   │   └── classesService.test.ts
│   ├── financeConfigService.ts
│   ├── feesService.ts
│   └── classesService.ts
├── components/
│   └── __tests__/
│       ├── ClassForm.test.tsx
│       └── FinanceConfigPage.test.tsx
└── test/
    ├── setup.tsx
    └── utils/
        ├── mockFactories.ts
        ├── supabaseMocks.ts
        └── testData.ts

tests/
└── e2e/
    ├── class-type-finance-flow.spec.ts
    └── fixtures/
        └── testDatabase.ts
```

### Test Layers

1. **Unit Tests (Services)**: Mock Supabase client, test query logic
2. **Component Tests**: Mock services, test UI interactions
3. **Integration Tests**: Real DB or transactions, test constraints
4. **E2E Tests**: Full browser flow, test complete user journey

## Components and Interfaces

### Mock Factory Pattern

```typescript
// src/test/utils/mockFactories.ts
export interface MockFinanceConfig {
  id: number;
  class_type: 'Daycare' | 'Evening';
  deduction_rules: DeductionRule[];
  del_yn: boolean;
  created_at: string;
  updated_at: string;
}

export function createMockFinanceConfig(
  overrides?: Partial<MockFinanceConfig>
): MockFinanceConfig;

export function createMockFee(
  overrides?: Partial<FeeRecordP2>
): FeeRecordP2;

export function createMockClass(
  overrides?: Partial<ClassRecord>
): ClassRecord;

export function createMockDeductionRule(
  overrides?: Partial<DeductionRule>
): DeductionRule;
```

### Supabase Mock Chain

```typescript
// src/test/utils/supabaseMocks.ts
export interface MockSupabaseClient {
  from: (table: string) => MockQueryBuilder;
  auth: {
    getUser: () => Promise<{ data: { user: any }, error: null }>;
  };
}

export interface MockQueryBuilder {
  select: (columns: string) => MockQueryBuilder;
  eq: (column: string, value: any) => MockQueryBuilder;
  insert: (data: any) => MockQueryBuilder;
  update: (data: any) => MockQueryBuilder;
  upsert: (data: any, options?: any) => MockQueryBuilder;
  order: (column: string, options?: any) => MockQueryBuilder;
  range: (from: number, to: number) => MockQueryBuilder;
  single: () => Promise<{ data: any, error: null }>;
  maybeSingle: () => Promise<{ data: any, error: null }>;
}

export function createMockSupabaseClient(): MockSupabaseClient;
export function mockQueryChain(returnData: any): MockQueryBuilder;
```

### Test Data Generators

```typescript
// src/test/utils/testData.ts
export const TEST_FINANCE_CONFIGS = {
  daycare: {
    id: 1,
    class_type: 'Daycare',
    deduction_rules: [
      { id: '1', name: 'Tiền cơm', amount: 50000 },
      { id: '2', name: 'Tiền ăn sáng', amount: 30000 }
    ],
    del_yn: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  evening: {
    id: 2,
    class_type: 'Evening',
    deduction_rules: [
      { id: '3', name: 'Tiền cơm tối', amount: 40000 }
    ],
    del_yn: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
};

export const TEST_CLASSES = {
  daycare1: {
    id: 1,
    name: 'Mầm 1',
    class_type: 'Daycare',
    teacher_id: 'teacher-1',
    room: 'A1',
    max_students: 20,
    student_count: 15,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  evening1: {
    id: 2,
    name: 'Tối 1',
    class_type: 'Evening',
    teacher_id: 'teacher-2',
    room: 'B1',
    max_students: 15,
    student_count: 10,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
};
```

## Data Models

### Test Database Schema

```sql
-- Key tables for testing
CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  class_type TEXT NOT NULL DEFAULT 'Daycare',
  teacher_id UUID,
  room TEXT,
  max_students INTEGER DEFAULT 20,
  del_yn BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE class_finance_configs (
  id SERIAL PRIMARY KEY,
  class_id INTEGER, -- deprecated, should be null
  class_type TEXT NOT NULL,
  deduction_rules JSONB DEFAULT '[]',
  del_yn BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT idx_finance_config_class_type UNIQUE (class_type, del_yn)
);

CREATE TABLE fee_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  class_id INTEGER NOT NULL,
  school_year TEXT NOT NULL,
  month INTEGER,
  amount_vnd INTEGER NOT NULL,
  base_amount_vnd INTEGER,
  attendance_deduction_vnd INTEGER DEFAULT 0,
  deduction_details JSONB DEFAULT '[]',
  deduction_note TEXT,
  status TEXT DEFAULT 'unpaid',
  del_yn BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  class_id INTEGER NOT NULL,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL,
  del_yn BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Mock Data Structures

```typescript
interface MockAttendanceRecord {
  id: string;
  student_id: string;
  class_id: number;
  attendance_date: string; // 'YYYY-MM-DD'
  status: 'present' | 'absent' | 'late' | 'excused';
  del_yn: boolean;
}

interface MockFeeCalculation {
  baseAmount: number;
  absentDays: number;
  deductionRules: DeductionRule[];
  expectedDeduction: number;
  expectedFinalAmount: number;
  expectedNote: string;
}
```

## Error Handling

### Test Error Scenarios

1. **Missing Finance Config**
   - Test: Fee sync when no config exists for class_type
   - Expected: Error message "Chưa có cấu hình tài chính cho loại lớp: {type}"

2. **Duplicate Class Type Config**
   - Test: Insert second config with same class_type
   - Expected: DB constraint violation

3. **Invalid Class Type**
   - Test: Query with invalid class_type value
   - Expected: No results, graceful handling

4. **Supabase Timeout**
   - Test: Mock timeout error from Supabase
   - Expected: Proper error propagation with timeout message

### Mock Error Responses

```typescript
export const MOCK_ERRORS = {
  notFound: {
    code: 'PGRST116',
    message: 'No rows found',
    details: null,
    hint: null
  },
  uniqueViolation: {
    code: '23505',
    message: 'duplicate key value violates unique constraint',
    details: 'Key (class_type, del_yn)=(Daycare, false) already exists',
    hint: null
  },
  timeout: {
    code: 'TIMEOUT',
    message: 'Request timeout',
    details: null,
    hint: null
  }
};
```

## Testing Strategy

### Unit Testing Approach

**Framework**: Vitest with vi.mock()

**Service Layer Tests**:
1. **financeConfigService.test.ts**
   - Mock Supabase client completely
   - Test query construction (`.eq('class_type', ...)`)
   - Test payload structure (class_type present, class_id null)
   - Test role guards (ensureFinancialAccess)
   - Verify no actual DB calls

2. **feesService.test.ts**
   - Mock Supabase + financeConfigService
   - Test fee calculation logic
   - Test attendance deduction formula
   - Test deduction note formatting
   - Mock attendance records with various absent counts

3. **classesService.test.ts**
   - Mock Supabase client
   - Verify ensureFinanceConfigExists NOT called
   - Test class_type field in payload

**Mock Pattern**:
```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseClient()
}));
```

### Component Testing Approach

**Framework**: Vitest + @testing-library/react

**Component Tests**:
1. **ClassForm.test.tsx**
   - Mock classesService
   - Render form, verify class_type dropdown
   - Simulate user selection
   - Verify form submission payload

2. **FinanceConfigPage.test.tsx**
   - Mock financeConfigService
   - Render with mock data
   - Verify "Class Type" column displays
   - Verify class type counts
   - Test modal interactions

**Render Pattern**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';

test('displays class type dropdown', () => {
  render(<ClassForm mode="create" />);
  expect(screen.getByLabelText(/class type/i)).toBeInTheDocument();
});
```

### Integration Testing Approach

**Framework**: Vitest with real Supabase client (test DB)

**Database Constraint Tests**:
1. Test unique constraint on class_type
2. Test NOT NULL constraint on class_type
3. Test default value for classes.class_type
4. Test index usage for performance

**Setup/Teardown**:
```typescript
beforeEach(async () => {
  // Start transaction or clear test tables
  await supabase.from('class_finance_configs').delete().neq('id', 0);
});

afterEach(async () => {
  // Rollback transaction or cleanup
});
```

### E2E Testing Approach

**Framework**: Playwright

**Test Flow**:
1. Login as Admin/Accountant
2. Navigate to Classes page
3. Create Daycare class with class_type selection
4. Navigate to Finance Config page
5. Create Daycare finance config with deduction rules
6. Navigate to Fees page
7. Create fee for student in Daycare class
8. Mark attendance absent for previous month
9. Verify fee auto-updates with deduction
10. Verify deduction note format

**Page Objects**:
```typescript
class FinanceConfigPage {
  async createConfig(classType: 'Daycare' | 'Evening', rules: DeductionRule[]) {
    await this.page.click('[data-testid="add-config-btn"]');
    await this.page.selectOption('[data-testid="class-type-select"]', classType);
    // ... add rules
    await this.page.click('[data-testid="save-btn"]');
  }

  async verifyConfigExists(classType: string) {
    const row = this.page.locator(`tr:has-text("${classType}")`);
    await expect(row).toBeVisible();
  }
}
```

### Test Execution Commands

```bash
# Unit tests only
pnpm test src/services/__tests__/financeConfigService.test.ts
pnpm test src/services/__tests__/feesService.test.ts
pnpm test src/services/__tests__/classesService.test.ts

# All service tests
pnpm test src/services

# Component tests
pnpm test src/components

# All unit + component tests
pnpm test

# With coverage
pnpm test:coverage

# Interactive UI
pnpm test:ui

# E2E tests
pnpm test:e2e

# Specific E2E test
pnpm test:e2e tests/e2e/class-type-finance-flow.spec.ts
```

### Coverage Goals

- **Services**: 90%+ line coverage
- **Components**: 80%+ line coverage
- **Critical paths**: 100% (fee calculation, config queries)

### Test Data Management

**Factory Functions**:
- Consistent Vietnamese field values
- Realistic amounts (50,000đ, 30,000đ)
- Valid date formats
- Proper JSONB structure for deduction_rules

**Cleanup Strategy**:
- `vi.clearAllMocks()` in beforeEach
- No shared state between tests
- Each test creates own mock data
- Integration tests use transactions or cleanup

## Manual Verification Steps

### Supabase Console Checks

```sql
-- 1. Verify all classes have class_type
SELECT id, name, class_type FROM classes WHERE del_yn = false;

-- 2. Verify max 2 active finance configs
SELECT id, class_type, class_id FROM class_finance_configs WHERE del_yn = false;

-- 3. Verify class_id is null in configs
SELECT id, class_type, class_id FROM class_finance_configs WHERE class_id IS NOT NULL;

-- 4. Verify index exists
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename = 'class_finance_configs' 
AND indexname = 'idx_finance_config_class_type';

-- 5. Test query performance
EXPLAIN ANALYZE 
SELECT * FROM class_finance_configs 
WHERE class_type = 'Daycare' AND del_yn = false;
```

### UI Manual Checks

1. Finance Config page shows "Class Type" column
2. Class Form has class_type dropdown
3. No individual class names in finance config table
4. Class type counts display correctly
5. Fee deduction notes format correctly

## Implementation Notes

### Test Isolation

- Each test file imports own mocks
- No global mock state
- Clear mocks between tests
- Independent test data

### Mock Realism

- Use actual Vietnamese text
- Match production data structure
- Realistic amounts and dates
- Proper JSONB formatting

### Performance

- Unit tests: < 100ms each
- Component tests: < 500ms each
- Integration tests: < 2s each
- E2E tests: < 10s total flow

### Debugging

- Use `test.only()` for focused testing
- `pnpm test:ui` for interactive debugging
- `console.log` in tests (removed before commit)
- Playwright trace viewer for E2E failures

## Appendix: Test Examples

### Example Unit Test

```typescript
// src/services/__tests__/financeConfigService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFinanceConfigByType } from '../financeConfigService';
import { createMockSupabaseClient } from '@/test/utils/supabaseMocks';
import { TEST_FINANCE_CONFIGS } from '@/test/utils/testData';

vi.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseClient()
}));

describe('getFinanceConfigByType', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries by class_type for Daycare', async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.from('class_finance_configs')
      .select('*')
      .eq('class_type', 'Daycare')
      .eq('del_yn', false)
      .maybeSingle()
      .mockResolvedValue({ data: TEST_FINANCE_CONFIGS.daycare, error: null });

    const result = await getFinanceConfigByType('Daycare');
    
    expect(result.item).toEqual(TEST_FINANCE_CONFIGS.daycare);
    expect(mockClient.from).toHaveBeenCalledWith('class_finance_configs');
    expect(mockClient.eq).toHaveBeenCalledWith('class_type', 'Daycare');
  });
});
```

### Example Component Test

```typescript
// src/components/__tests__/ClassForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClassForm from '../ClassForm';
import * as classesService from '@/services/classesService';

vi.mock('@/services/classesService');

describe('ClassForm', () => {
  it('includes class_type in submission payload', async () => {
    const mockCreate = vi.spyOn(classesService, 'createClass')
      .mockResolvedValue({ item: null, error: null });

    render(<ClassForm mode="create" />);
    
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Mầm 1' } });
    fireEvent.change(screen.getByLabelText(/class type/i), { target: { value: 'Daycare' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await vi.waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ class_type: 'Daycare' })
      );
    });
  });
});
```

### Example E2E Test

```typescript
// tests/e2e/class-type-finance-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete fee calculation flow with class type', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@test.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // 2. Create Daycare class
  await page.goto('/classes');
  await page.click('[data-testid="add-class-btn"]');
  await page.fill('[name="name"]', 'Mầm Test');
  await page.selectOption('[name="class_type"]', 'Daycare');
  await page.click('[data-testid="save-class-btn"]');
  await expect(page.locator('text=Mầm Test')).toBeVisible();

  // 3. Create Daycare finance config
  await page.goto('/finance-config');
  await page.click('[data-testid="add-config-btn"]');
  await page.selectOption('[name="class_type"]', 'Daycare');
  await page.fill('[name="rule_name"]', 'Tiền cơm');
  await page.fill('[name="rule_amount"]', '50000');
  await page.click('[data-testid="save-config-btn"]');
  await expect(page.locator('text=Daycare')).toBeVisible();

  // 4. Create fee and verify deduction
  // ... (continue flow)
});
```
