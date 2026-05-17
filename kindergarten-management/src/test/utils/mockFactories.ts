import type {
  ClassFinanceConfig,
  FeeRecordP2,
  ClassRecord,
  DeductionRule,
} from '@/types/domain';

/**
 * Mock factory functions for test data generation
 * Uses realistic Vietnamese field values (Tiền cơm, etc.)
 */

// Test constants for consistent data
export const TEST_FINANCE_CONFIGS = {
  daycare: {
    id: 1,
    class_type: 'Daycare' as const,
    deduction_rules: [
      { id: '1', name: 'Tiền cơm', amount: 50000 },
      { id: '2', name: 'Tiền ăn sáng', amount: 30000 },
    ],
    del_yn: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  evening: {
    id: 2,
    class_type: 'Evening' as const,
    deduction_rules: [
      { id: '3', name: 'Tiền cơm tối', amount: 40000 },
    ],
    del_yn: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

export const TEST_CLASSES = {
  daycare1: {
    id: 1,
    name: 'Mầm 1',
    class_type: 'Daycare' as const,
    teacher_id: 'teacher-1',
    teacher_name: 'Cô Lan',
    room: 'A1',
    max_students: 20,
    student_count: 15,
    description: 'Lớp mầm non ban ngày',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  evening1: {
    id: 2,
    name: 'Tối 1',
    class_type: 'Evening' as const,
    teacher_id: 'teacher-2',
    teacher_name: 'Cô Hoa',
    room: 'B1',
    max_students: 15,
    student_count: 10,
    description: 'Lớp học buổi tối',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

/**
 * Create mock finance config with realistic Vietnamese data
 */
export function createMockFinanceConfig(
  overrides?: Partial<ClassFinanceConfig>
): ClassFinanceConfig {
  return {
    id: 1,
    class_id: null,
    class_type: 'Daycare',
    deduction_rules: [
      { id: '1', name: 'Tiền cơm', amount: 50000 },
      { id: '2', name: 'Tiền ăn sáng', amount: 30000 },
    ],
    del_yn: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create mock fee record with realistic Vietnamese data
 */
export function createMockFee(
  overrides?: Partial<FeeRecordP2>
): FeeRecordP2 {
  return {
    id: 'fee-1',
    student_id: 'student-1',
    student_name: 'Nguyễn Văn A',
    class_id: 1,
    class_name: 'Mầm 1',
    title: 'Học phí',
    school_year: '2024-2025',
    month: 9,
    amount_vnd: 2000000,
    paid_amount_vnd: 0,
    paid_date: null,
    due_date: null,
    payment_method: null,
    status: 'unpaid',
    base_amount_vnd: 2000000,
    attendance_deduction_vnd: 0,
    deduction_details: [],
    deduction_note: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create mock class record with realistic Vietnamese data
 */
export function createMockClass(
  overrides?: Partial<ClassRecord>
): ClassRecord {
  return {
    id: 1,
    name: 'Mầm 1',
    teacher_id: 'teacher-1',
    teacher_name: 'Cô Lan',
    room: 'A1',
    max_students: 20,
    student_count: 15,
    class_type: 'Daycare',
    description: 'Lớp mầm non ban ngày',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create mock deduction rule with realistic Vietnamese data
 */
export function createMockDeductionRule(
  overrides?: Partial<DeductionRule>
): DeductionRule {
  return {
    id: '1',
    name: 'Tiền cơm',
    amount: 50000,
    ...overrides,
  };
}
