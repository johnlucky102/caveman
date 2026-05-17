# Test Execution Guide

## Overview

This document describes how to run the test suite for the class type finance config refactor. The tests verify the migration from `class_id` to `class_type` ('Daycare' | 'Evening') in the finance configuration system.

## Test Structure

### Service Layer Tests (High Priority)

#### Finance Config Service Tests
- **File**: `src/services/__tests__/financeConfigService.test.ts`
- **Tests**: 17 tests
- **Coverage**:
  - `getFinanceConfigByType` - Queries by `class_type` for Daycare and Evening
  - `listFinanceConfigs` - Includes `class_type` field and supports sorting/filtering
  - `createFinanceConfig` - Inserts with `class_type` and null `class_id`, uses upsert
  - `updateFinanceConfig` - Updates by `class_type`
  - `deleteFinanceConfig` - Soft deletes by `class_type`
  - `ensureFinanceConfigExists` - Queries and creates config by `class_type`
  - Role guards for Admin/Accountant mutations

#### Fees Service Tests
- **File**: `src/services/__tests__/feesService.test.ts`
- **Tests**: 8 tests
- **Coverage**:
  - `syncFeeWithAttendance` - Queries classes table to get `class_type`, then queries `class_finance_configs` by `class_type`
  - Fee deduction calculation using Evening config (40,000đ meal deduction)
  - Missing finance config error handling
  - Vietnamese deduction note formatting
  - `bulkSyncFeesByFilter` - Fetches fees by class_id

#### Classes Service Tests
- **File**: `src/services/__tests__/classesService.test.ts`
- **Tests**: 6 tests
- **Coverage**:
  - `createClass` - Does NOT auto-create finance config
  - `createClass` - Includes `class_type` field in payload
  - Existing tests for listClasses, updateClass, deleteClass

### Test Utilities

#### Mock Factories
- **File**: `src/test/utils/mockFactories.ts`
- **Functions**:
  - `createMockFinanceConfig()` - Generates realistic Vietnamese finance config data
  - `createMockFee()` - Generates fee records with proper structure
  - `createMockClass()` - Generates class records with `class_type`
  - `createMockDeductionRule()` - Generates deduction rules with Vietnamese names
- **Constants**:
  - `TEST_FINANCE_CONFIGS` - Pre-configured Daycare and Evening configs
  - `TEST_CLASSES` - Pre-configured class records
  - `MOCK_ERRORS` - Common error responses

#### Supabase Mock Utilities
- **File**: `src/test/utils/supabaseMocks.ts`
- **Features**:
  - Chainable mock query builder mimicking Supabase's fluent API
  - Mock error responses for error scenarios
  - Support for `.select()`, `.eq()`, `.single()`, `.maybeSingle()`, `.insert()`, `.update()`, etc.

## Running Tests

### Run All Service Tests
```bash
pnpm test src/services/__tests__/financeConfigService.test.ts src/services/__tests__/feesService.test.ts src/services/__tests__/classesService.test.ts
```

### Run Individual Test Files
```bash
# Finance config service tests
pnpm test src/services/__tests__/financeConfigService.test.ts

# Fees service tests
pnpm test src/services/__tests__/feesService.test.ts

# Classes service tests
pnpm test src/services/__tests__/classesService.test.ts
```

### Run in Watch Mode
```bash
pnpm test src/services/__tests__/
```

### Run with Coverage
```bash
pnpm test src/services/__tests__/ --coverage
```

## Test Results Summary

**Service Layer Tests**: 31/31 passed ✅
- Finance Config Service: 17 tests
- Fees Service: 8 tests
- Classes Service: 6 tests

## Key Test Scenarios

### Class Type Migration Verification

1. **Finance Config Queries**
   - Verify `getFinanceConfigByType` queries by `class_type` instead of `class_id`
   - Ensure `listFinanceConfigs` includes `class_type` field
   - Test sorting and filtering by `class_type`

2. **Fee Synchronization**
   - Verify `syncFeeWithAttendance` uses two-step query:
     1. Query classes table to get `class_type`
     2. Query `class_finance_configs` by `class_type`
   - Test deduction calculation with Daycare (25,000đ total) vs Evening (40,000đ) configs
   - Verify error handling when finance config missing for `class_type`

3. **Class Creation**
   - Verify `createClass` includes `class_type` field in payload
   - Ensure `createClass` does NOT auto-create finance config (separate responsibility)
   - Test both Daycare and Evening class types

## Component Tests

Component tests for ClassForm and FinanceConfigPage are pending due to memory issues with the test environment. The service layer tests provide comprehensive coverage of the business logic.

## Database Integration Tests

Integration tests for database constraints (class_type unique constraint, class_finance_configs foreign key relationships) are pending and should be added when integration test infrastructure is available.

## End-to-End Tests

End-to-end tests with Playwright are pending and should cover:
1. Creating a class with Daycare type
2. Creating finance config for Daycare
3. Creating fees and verifying automatic deduction sync
4. Evening class workflow

## Troubleshooting

### Memory Issues
If tests hang or run out of memory:
- Run tests individually instead of all together
- Use `--run` flag to disable watch mode
- Increase Node.js memory limit: `NODE_OPTIONS="--max-old-space-size=4096" pnpm test`

### Mock Configuration Issues
If mocks are not working:
- Ensure `vi.mock()` calls are at the top of the file
- Check that mock functions are properly reset in `beforeEach()`
- Verify mock return values match expected types

### Type Errors
If TypeScript errors occur:
- Check that mock data uses proper type assertions (`as const` for literal types)
- Ensure imported types match the actual service signatures
- Verify that `class_type` is typed as `'Daycare' | 'Evening'`

## Test Maintenance

When adding new features:
1. Add corresponding unit tests in the appropriate service test file
2. Update mock factories if new data structures are needed
3. Ensure new tests follow the existing pattern (mock setup, action, assertion)
4. Run the full test suite before committing changes
