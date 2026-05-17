# Implementation Plan: Class Type Finance Config Testing

## Overview

Comprehensive test suite for class type finance config refactor. Tests verify migration from `class_id` to `class_type` ('Daycare' | 'Evening') across service layer, UI components, database constraints, and end-to-end flows. Uses Vitest for unit/component tests, Playwright for E2E.

## Tasks

- [ ] 1. Set up test infrastructure and utilities
  - [x] 1.1 Create test utilities directory structure
    - Create `src/test/utils/` directory
    - Create `src/test/setup.tsx` for global test configuration
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 1.2 Implement mock factory functions
    - Create `src/test/utils/mockFactories.ts`
    - Implement `createMockFinanceConfig()` with realistic Vietnamese data
    - Implement `createMockFee()`, `createMockClass()`, `createMockDeductionRule()`
    - Use TEST_FINANCE_CONFIGS and TEST_CLASSES constants
    - _Requirements: 10.2, 10.5, 10.6_
  
  - [x] 1.3 Implement Supabase mock utilities
    - Create `src/test/utils/supabaseMocks.ts`
    - Implement `createMockSupabaseClient()` with chainable query builder
    - Implement `mockQueryChain()` for fluent API mocking
    - Support `.from().select().eq().single()` chain pattern
    - _Requirements: 1.9, 10.1_
  
  - [x] 1.4 Create test data constants
    - Create `src/test/utils/testData.ts`
    - Define TEST_FINANCE_CONFIGS (daycare, evening)
    - Define TEST_CLASSES (daycare1, evening1)
    - Define MOCK_ERRORS (notFound, uniqueViolation, timeout)
    - _Requirements: 10.2, 10.6_

- [ ] 2. Checkpoint - Verify test utilities
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Implement finance config service unit tests
  - [ ] 3.1 Create financeConfigService test file
    - Create `src/services/__tests__/financeConfigService.test.ts`
    - Set up Supabase mock and beforeEach cleanup
    - _Requirements: 1.9, 10.1_
  
  - [ ] 3.2 Test getFinanceConfigByType for Daycare
    - Verify query uses `.eq('class_type', 'Daycare')`
    - Mock return data with TEST_FINANCE_CONFIGS.daycare
    - Assert correct config returned
    - _Requirements: 1.1_
  
  - [ ] 3.3 Test getFinanceConfigByType for Evening
    - Verify query uses `.eq('class_type', 'Evening')`
    - Mock return data with TEST_FINANCE_CONFIGS.evening
    - _Requirements: 1.2_
  
  - [ ] 3.4 Test createFinanceConfig with class_type
    - Verify insert payload contains `class_type: 'Daycare'` and `class_id: null`
    - Mock successful insert response
    - _Requirements: 1.3_
  
  - [ ] 3.5 Test updateFinanceConfig by class_type
    - Verify update query uses `.eq('class_type', 'Evening')`
    - Test with new deduction_rules payload
    - _Requirements: 1.4_
  
  - [ ] 3.6 Test deleteFinanceConfig soft delete
    - Verify soft delete query uses `.eq('class_type', 'Daycare')`
    - Verify sets `del_yn: true`
    - _Requirements: 1.5_
  
  - [ ] 3.7 Test listFinanceConfigs includes class_type
    - Verify response includes `class_type` field for each config
    - Mock multiple configs (Daycare + Evening)
    - _Requirements: 1.6_
  
  - [ ] 3.8 Test listFinanceConfigs sorting by class_type
    - Verify query uses `.order('class_type', ...)`
    - _Requirements: 1.7_
  
  - [ ] 3.9 Test ensureFinanceConfigExists
    - Verify queries by class_type
    - Verify creates config with class_type if missing
    - _Requirements: 1.8_
  
  - [ ]* 3.10 Test role guard for mutations
    - Verify all mutations check Admin/Accountant role via `ensureFinancialAccess`
    - Test createFinanceConfig, updateFinanceConfig, deleteFinanceConfig
    - _Requirements: 1.10_

- [ ] 4. Implement fees service unit tests
  - [ ] 4.1 Create feesService test file
    - Create `src/services/__tests__/feesService.test.ts`
    - Set up Supabase mock and service mocks
    - _Requirements: 2.5, 2.6, 10.1_
  
  - [ ] 4.2 Test syncFeeWithAttendance queries class_type
    - Mock classes table query returning `{ class_type: 'Evening' }`
    - Mock class_finance_configs query by class_type
    - Verify two-step query: (1) get class_type, (2) get config
    - _Requirements: 2.1, 2.5, 2.6_
  
  - [ ] 4.3 Test fee deduction calculation
    - Mock 3 absent days for student
    - Mock Evening config with 50,000đ meal deduction
    - Verify final fee = base_amount - (3 × 50,000)
    - _Requirements: 2.2, 2.7_
  
  - [ ] 4.4 Test missing finance config error
    - Mock class_type with no finance config
    - Verify returns appropriate error message
    - _Requirements: 2.3_
  
  - [ ] 4.5 Test bulkSyncFeesByFilter
    - Mock fees for class_id: 5
    - Verify fetches all fees, determines class_types, applies correct configs
    - _Requirements: 2.4_
  
  - [ ]* 4.6 Test deduction note formatting
    - Verify deduction_note contains formula: "Khấu trừ X ngày vắng tháng trước x (rule names) = total"
    - Test with multiple deduction rules
    - _Requirements: 2.8_

- [ ] 5. Implement classes service unit tests
  - [ ] 5.1 Create classesService test file
    - Create `src/services/__tests__/classesService.test.ts`
    - Set up Supabase mock
    - _Requirements: 10.1_
  
  - [ ] 5.2 Test createClass does NOT auto-create finance config
    - Verify `ensureFinanceConfigExists` is NOT called
    - Verify only classes table insert executed
    - _Requirements: 3.1, 3.2_
  
  - [ ] 5.3 Test createClass includes class_type field
    - Verify payload includes `class_type: 'Daycare'`
    - _Requirements: 3.3_

- [ ] 6. Checkpoint - Verify all service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement ClassForm component tests
  - [ ] 7.1 Create ClassForm test file
    - Create `src/components/__tests__/ClassForm.test.tsx`
    - Set up @testing-library/react and service mocks
    - _Requirements: 4.5_
  
  - [ ] 7.2 Test class type dropdown renders in create mode
    - Verify dropdown visible with 'Daycare' and 'Evening' options
    - _Requirements: 4.1_
  
  - [ ] 7.3 Test class type selection updates form state
    - Simulate user selecting 'Evening'
    - Verify form state updates to `class_type: 'Evening'`
    - _Requirements: 4.2_
  
  - [ ] 7.4 Test form submission includes class_type
    - Mock classesService.createClass
    - Submit form with class_type 'Daycare'
    - Verify payload includes `class_type: 'Daycare'`
    - _Requirements: 4.3, 4.5_
  
  - [ ]* 7.5 Test edit mode shows current class_type
    - Render form in edit mode with existing class data
    - Verify dropdown shows current class_type value
    - _Requirements: 4.4_

- [ ] 8. Implement FinanceConfigPage component tests
  - [ ] 8.1 Create FinanceConfigPage test file
    - Create `src/components/__tests__/FinanceConfigPage.test.tsx`
    - Set up @testing-library/react and service mocks
    - _Requirements: 5.7_
  
  - [ ] 8.2 Test Class Type column displays
    - Mock data with 1 Daycare config and 1 Evening config
    - Verify table displays "Class Type" column
    - _Requirements: 5.1_
  
  - [ ] 8.3 Test class type values display correctly
    - Verify each row shows 'Daycare' or 'Evening'
    - Verify NO individual class names (e.g., "Mầm 1", "Tối 1")
    - _Requirements: 5.2, 5.8_
  
  - [ ] 8.4 Test Add Config modal with class type dropdown
    - Click Add Config button
    - Verify modal opens with class type select dropdown
    - _Requirements: 5.3_
  
  - [ ] 8.5 Test Edit Config modal pre-selects class_type
    - Click Edit button for Evening config
    - Verify modal opens with class_type pre-selected as 'Evening'
    - _Requirements: 5.4_
  
  - [ ]* 8.6 Test class type counts display
    - Mock 3 Daycare classes and 2 Evening classes
    - Verify "Daycare Count: 3" and "Evening Count: 2" displayed
    - _Requirements: 5.5_
  
  - [ ]* 8.7 Test Accountant role access
    - Mock user with Accountant role
    - Verify page renders successfully with finance config data
    - _Requirements: 5.6_

- [ ] 9. Checkpoint - Verify all component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement database constraint integration tests
  - [ ] 10.1 Create integration test setup
    - Create `src/services/__tests__/integration/` directory
    - Create `dbConstraints.test.ts`
    - Set up real Supabase client or transaction-based testing
    - _Requirements: 10.4_
  
  - [ ] 10.2 Test class_type NOT NULL constraint
    - Attempt to insert finance config without class_type
    - Verify database rejects with NOT NULL error
    - _Requirements: 6.1_
  
  - [ ] 10.3 Test class_type unique constraint
    - Insert first Daycare config successfully
    - Attempt to insert second Daycare config
    - Verify unique constraint `idx_finance_config_class_type` prevents duplicate
    - _Requirements: 6.2_
  
  - [ ] 10.4 Test classes table class_type default value
    - Insert class without class_type field
    - Verify database applies default value
    - _Requirements: 6.3_
  
  - [ ]* 10.5 Test index usage for performance
    - Query finance config by class_type
    - Verify index `idx_finance_config_class_type` is used
    - Use EXPLAIN ANALYZE to check query plan
    - _Requirements: 6.4_
  
  - [ ]* 10.6 Test maximum 2 active configs constraint
    - Query class_finance_configs with `del_yn = false`
    - Verify maximum 2 rows (1 Daycare, 1 Evening)
    - _Requirements: 6.5_

- [ ] 11. Implement end-to-end tests
  - [ ] 11.1 Create E2E test file
    - Create `tests/e2e/class-type-finance-flow.spec.ts`
    - Set up Playwright test fixtures
    - _Requirements: 7.7_
  
  - [ ] 11.2 Test Daycare class creation via UI
    - Navigate to `/classes`
    - Create Daycare class
    - Verify class saved with `class_type: 'Daycare'`
    - _Requirements: 7.1_
  
  - [ ] 11.3 Test Daycare finance config creation
    - Navigate to finance config page
    - Create config for Daycare type with "Meal deduction: 50,000đ"
    - Verify config saved with `class_type: 'Daycare'` and `class_id: null`
    - _Requirements: 7.2_
  
  - [ ] 11.4 Test fee creation for Daycare student
    - Create fee for student in Daycare class
    - Verify fee record created with correct class_id
    - _Requirements: 7.3_
  
  - [ ] 11.5 Test attendance deduction flow
    - Mark 1 day absence for student in previous month
    - Verify fee auto-updates with 50,000đ deduction
    - _Requirements: 7.4_
  
  - [ ] 11.6 Test deduction note format in UI
    - View fee in UI
    - Verify deduction_note displays "Khấu trừ 1 ngày vắng tháng trước x (Tiền cơm 50,000đ) = 50,000đ"
    - _Requirements: 7.5_
  
  - [ ]* 11.7 Test shared config across multiple Daycare classes
    - Create second Daycare class
    - Create fee for student in second class
    - Verify fee uses same Daycare finance config
    - _Requirements: 7.6_
  
  - [ ]* 11.8 Test E2E flow performance
    - Verify complete flow completes in under 10 seconds
    - _Requirements: 7.7_

- [ ] 12. Create test execution documentation
  - [ ] 12.1 Document test commands in README
    - Add section for running specific test suites
    - Document `pnpm test src/services/__tests__/financeConfigService.test.ts`
    - Document `pnpm test src/services/__tests__/feesService.test.ts`
    - Document `pnpm test src/services` for all service tests
    - Document `pnpm test` for all unit/component tests
    - Document `pnpm test:ui` for interactive debugging
    - Document `pnpm test:e2e` for Playwright tests
    - Document coverage report command
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  
  - [ ] 12.2 Create manual verification SQL queries
    - Create `docs/manual-verification.sql` file
    - Add query to verify all classes have class_type
    - Add query to verify max 2 active finance configs
    - Add query to verify class_id is null in configs
    - Add query to verify index exists
    - Add query to test query performance with EXPLAIN ANALYZE
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 13. Final checkpoint - Run full test suite
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Test utilities created first to support all subsequent tests
- Integration tests may require separate test database or transaction rollback
- E2E tests require Playwright setup and test user credentials
- Mock data uses realistic Vietnamese field values (Tiền cơm, Khấu trừ, etc.)
- All service tests use Supabase mock chain pattern for isolation
