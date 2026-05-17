# Requirements Document

## Introduction

This document defines comprehensive testing requirements for the Class Type Finance Config refactor. The refactor changed finance configuration from being tied to individual classes (`class_id`) to being tied to class types (`class_type`: 'Daycare' | 'Evening'). This enables shared finance configurations across all classes of the same type, simplifying configuration management and ensuring consistency.

The testing plan covers unit tests for service layer changes, component tests for UI updates, integration tests for database constraints, and end-to-end verification of the complete fee calculation flow.

## Glossary

- **Test_Suite**: The collection of automated tests validating the refactored system
- **Finance_Config_Service**: Service managing finance configurations by class type
- **Fees_Service**: Service calculating fees with attendance-based deductions
- **Classes_Service**: Service managing class records with class_type field
- **Class_Form**: UI component for creating/editing classes with class type selection
- **Finance_Config_Page**: UI component displaying and managing finance configurations by class type
- **Supabase_Client**: Database client used in service layer
- **Mock_Chain**: Test utility for mocking Supabase query builder methods
- **Vitest**: Testing framework used for unit and component tests
- **Playwright**: Testing framework used for end-to-end tests

## Requirements

### Requirement 1: Finance Config Service Unit Tests

**User Story:** As a developer, I want comprehensive unit tests for financeConfigService, so that I can verify the refactor from class_id to class_type works correctly.

#### Acceptance Criteria

1. WHEN `getFinanceConfigByType(classType)` is called with 'Daycare', THE Test_Suite SHALL verify the query uses `.eq('class_type', 'Daycare')` instead of `.eq('class_id', ...)`
2. WHEN `getFinanceConfigByType(classType)` is called with 'Evening', THE Test_Suite SHALL verify the query uses `.eq('class_type', 'Evening')` and returns the correct config
3. WHEN `createFinanceConfig` is called with `class_type: 'Daycare'`, THE Test_Suite SHALL verify the insert payload contains `class_type: 'Daycare'` and `class_id: null`
4. WHEN `updateFinanceConfig` is called with `classType: 'Evening'` and new deduction_rules, THE Test_Suite SHALL verify the update query uses `.eq('class_type', 'Evening')`
5. WHEN `deleteFinanceConfig` is called with `classType: 'Daycare'`, THE Test_Suite SHALL verify the soft delete query uses `.eq('class_type', 'Daycare')`
6. WHEN `listFinanceConfigs` is called, THE Test_Suite SHALL verify the response includes `class_type` field for each config
7. WHEN `listFinanceConfigs` is called with `sortBy: 'class_type'`, THE Test_Suite SHALL verify the query uses `.order('class_type', ...)`
8. WHEN `ensureFinanceConfigExists` is called with 'Evening', THE Test_Suite SHALL verify it queries by class_type and creates config with class_type if missing
9. THE Test_Suite SHALL mock Supabase_Client using Mock_Chain pattern for all finance config service tests
10. THE Test_Suite SHALL verify all finance config mutations check Admin/Accountant role via `ensureFinancialAccess`

### Requirement 2: Fees Service Unit Tests

**User Story:** As a developer, I want unit tests for feesService fee calculation logic, so that I can verify attendance deductions use class_type-based configs correctly.

#### Acceptance Criteria

1. WHEN `syncFeeWithAttendance` is called for a fee in an 'Evening' class, THE Test_Suite SHALL verify the service (1) queries the class table for class_type, then (2) queries class_finance_configs by that class_type
2. WHEN `syncFeeWithAttendance` calculates deductions for a student with 3 absent days and Evening config has 50,000đ meal deduction, THE Test_Suite SHALL verify final fee = base_amount - (3 × 50,000)
3. WHEN `syncFeeWithAttendance` is called for a class_type with no finance config, THE Test_Suite SHALL verify it returns an appropriate error message
4. WHEN `bulkSyncFeesByFilter` is called with `class_id: 5`, THE Test_Suite SHALL verify it fetches all fees for that class, determines their class_types, and applies correct configs
5. THE Test_Suite SHALL mock the classes table query returning `{ class_type: 'Evening' }` for fee sync tests
6. THE Test_Suite SHALL mock the class_finance_configs table query returning deduction_rules for the class_type
7. THE Test_Suite SHALL mock attendance records with 'absent' status to test deduction calculation
8. THE Test_Suite SHALL verify deduction_note contains the formula: "Khấu trừ X ngày vắng tháng trước x (rule names) = total"

### Requirement 3: Classes Service Unit Tests

**User Story:** As a developer, I want to verify classesService no longer auto-creates finance configs, so that the refactor's separation of concerns is maintained.

#### Acceptance Criteria

1. WHEN `createClass` is called with valid class data including `class_type: 'Daycare'`, THE Test_Suite SHALL verify `ensureFinanceConfigExists` is NOT called
2. WHEN `createClass` completes successfully, THE Test_Suite SHALL verify only the classes table insert is executed
3. THE Test_Suite SHALL verify the class creation payload includes the `class_type` field

### Requirement 4: Class Form Component Tests

**User Story:** As a developer, I want component tests for ClassForm, so that I can verify the class type dropdown works correctly.

#### Acceptance Criteria

1. WHEN ClassForm renders in create mode, THE Test_Suite SHALL verify a class type dropdown is visible with options 'Daycare' and 'Evening'
2. WHEN a user selects 'Evening' from the class type dropdown, THE Test_Suite SHALL verify the form state updates to `class_type: 'Evening'`
3. WHEN ClassForm is submitted with class_type 'Daycare', THE Test_Suite SHALL verify the payload sent to createClass includes `class_type: 'Daycare'`
4. WHEN ClassForm renders in edit mode with existing class data, THE Test_Suite SHALL verify the class type dropdown shows the current class_type value
5. THE Test_Suite SHALL mock the classesService.createClass function to verify payload structure

### Requirement 5: Finance Config Page Component Tests

**User Story:** As a developer, I want component tests for FinanceConfigPage, so that I can verify the UI displays class types instead of individual class names.

#### Acceptance Criteria

1. WHEN FinanceConfigPage renders with mock data containing 1 Daycare config and 1 Evening config, THE Test_Suite SHALL verify the table displays a "Class Type" column
2. WHEN FinanceConfigPage displays finance configs, THE Test_Suite SHALL verify each row shows 'Daycare' or 'Evening' in the class type column instead of specific class names
3. WHEN the Add Config button is clicked, THE Test_Suite SHALL verify a modal opens with a class type select dropdown
4. WHEN the Edit button is clicked for an Evening config, THE Test_Suite SHALL verify the modal opens with class_type pre-selected as 'Evening'
5. WHEN FinanceConfigPage renders with 3 Daycare classes and 2 Evening classes, THE Test_Suite SHALL verify "Daycare Count: 3" and "Evening Count: 2" are displayed
6. WHEN FinanceConfigPage is accessed by an Accountant role user, THE Test_Suite SHALL verify the page renders successfully with finance config data
7. THE Test_Suite SHALL mock financeConfigService.listFinanceConfigs returning configs with class_type field
8. THE Test_Suite SHALL verify the table does NOT display individual class names (e.g., "Mầm 1", "Tối 1")

### Requirement 6: Database Constraint Integration Tests

**User Story:** As a developer, I want integration tests for database constraints, so that I can verify the schema enforces class_type uniqueness and not-null rules.

#### Acceptance Criteria

1. WHEN a finance config is inserted into class_finance_configs table, THE Test_Suite SHALL verify the class_type field is NOT NULL
2. WHEN a second finance config with class_type 'Daycare' is inserted, THE Test_Suite SHALL verify the unique constraint `idx_finance_config_class_type` prevents the duplicate
3. WHEN a class is inserted into classes table without class_type, THE Test_Suite SHALL verify the database applies the default value
4. WHEN a finance config is queried by class_type, THE Test_Suite SHALL verify the index `idx_finance_config_class_type` is used for performance
5. THE Test_Suite SHALL verify class_finance_configs table has maximum 2 active rows (1 Daycare, 1 Evening) with del_yn = false

### Requirement 7: End-to-End Fee Calculation Flow

**User Story:** As a QA tester, I want an end-to-end test for the complete fee calculation flow, so that I can verify the refactor works correctly in production-like scenarios.

#### Acceptance Criteria

1. WHEN a Daycare class is created via the UI at `/classes`, THE Test_Suite SHALL verify the class is saved with `class_type: 'Daycare'`
2. WHEN a finance config is created for Daycare type with "Meal deduction: 50,000đ", THE Test_Suite SHALL verify the config is saved with `class_type: 'Daycare'` and `class_id: null`
3. WHEN a fee is created for a student in the Daycare class, THE Test_Suite SHALL verify the fee record is created with the correct class_id
4. WHEN 1 day of absence is marked for the student in the previous month, THE Test_Suite SHALL verify the fee is automatically updated with 50,000đ deduction
5. WHEN the fee is viewed in the UI, THE Test_Suite SHALL verify the deduction_note displays "Khấu trừ 1 ngày vắng tháng trước x (Tiền cơm 50,000đ) = 50,000đ"
6. WHEN a second Daycare class is created, THE Test_Suite SHALL verify fees for students in that class also use the same Daycare finance config
7. THE Test_Suite SHALL verify the end-to-end flow completes without errors in under 10 seconds

### Requirement 8: Test Execution Commands

**User Story:** As a developer, I want clear test execution commands, so that I can run specific test suites efficiently.

#### Acceptance Criteria

1. WHEN `pnpm test src/services/__tests__/financeConfigService.test.ts` is executed, THE Test_Suite SHALL run only finance config service unit tests
2. WHEN `pnpm test src/services/__tests__/feesService.test.ts` is executed, THE Test_Suite SHALL run only fees service unit tests
3. WHEN `pnpm test src/services` is executed, THE Test_Suite SHALL run all service layer unit tests
4. WHEN `pnpm test` is executed, THE Test_Suite SHALL run all unit and component tests
5. WHEN `pnpm test:ui` is executed, THE Test_Suite SHALL open Vitest UI for interactive test debugging
6. WHEN `pnpm test:e2e` is executed, THE Test_Suite SHALL run Playwright end-to-end tests
7. THE Test_Suite SHALL display test coverage report after execution showing lines, branches, and functions covered

### Requirement 9: Manual Supabase Verification

**User Story:** As a developer, I want manual verification steps for Supabase database state, so that I can confirm the migration and refactor are correct.

#### Acceptance Criteria

1. WHEN the classes table is queried, THE Test_Suite SHALL verify all rows have a non-null `class_type` value ('Daycare' or 'Evening')
2. WHEN the class_finance_configs table is queried with `del_yn = false`, THE Test_Suite SHALL verify there are at most 2 rows (1 Daycare, 1 Evening)
3. WHEN the class_finance_configs table is queried, THE Test_Suite SHALL verify all rows have `class_id = null`
4. WHEN the class_finance_configs table is queried, THE Test_Suite SHALL verify the `class_type` column exists and is indexed
5. WHEN a finance config is queried by class_type, THE Test_Suite SHALL verify the query execution plan uses the `idx_finance_config_class_type` index
6. THE Test_Suite SHALL provide SQL queries for manual verification in the test documentation

### Requirement 10: Test Data Setup and Teardown

**User Story:** As a developer, I want proper test data setup and teardown, so that tests are isolated and repeatable.

#### Acceptance Criteria

1. WHEN each test suite starts, THE Test_Suite SHALL clear all mock function call histories using `vi.clearAllMocks()`
2. WHEN a test creates mock finance configs, THE Test_Suite SHALL use consistent test data with realistic Vietnamese field values
3. WHEN a test completes, THE Test_Suite SHALL not leave side effects that affect other tests
4. WHEN integration tests run, THE Test_Suite SHALL use a separate test database or transaction rollback to prevent data pollution
5. THE Test_Suite SHALL provide factory functions for creating test data (e.g., `createMockFinanceConfig`, `createMockFee`)
6. WHEN mock data includes deduction_rules, THE Test_Suite SHALL use the correct structure: `[{ id: string, name: string, amount: number }]`

