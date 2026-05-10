import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncFeeWithAttendance, createClassFees } from '../feesService';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('syncFeeWithAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockSupabaseChain = (data: any, error: any = null) => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data, error }),
      update: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) => cb({ data, error })),
    };
    return chain;
  };

  it('should calculate meal deductions correctly for Daycare classes', async () => {
    const mockFee = {
      id: 'fee-1',
      student_id: 'std-1',
      class_id: 'cls-1',
      amount_vnd: 3000000,
      base_amount_vnd: 3000000,
      month: 10,
      school_year: '2024-2025',
      classes: {
        id: 'cls-1',
        class_type: 'Daycare',
        meal_rate: 20000,
        hospital_deduction_type: 'Fixed',
        hospital_deduction_value: 0
      }
    };

    const mockAttendance = [
      { status: 'absent', is_hospitalized: false },
      { status: 'absent', is_hospitalized: false },
      { status: 'excused', is_hospitalized: false },
      { status: 'present', is_hospitalized: false },
      { status: 'center_cancelled', is_hospitalized: false },
      { status: 'absent', is_hospitalized: false },
    ];

    const fromMock = vi.mocked(supabase.from);
    
    // Call 1: Load fee
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFee) as any);
    // Call 2: Load attendance
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockAttendance) as any);
    // Call 3: Update
    const updateChain = createMockSupabaseChain({ ...mockFee, amount_vnd: 2900000 });
    fromMock.mockReturnValueOnce(updateChain as any);

    const result = await syncFeeWithAttendance('fee-1');

    expect(result.error).toBeNull();
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      amount_vnd: 2900000,
      meal_deduction_vnd: 100000,
      tuition_deduction_vnd: 0
    }));
  });

  it('should calculate hospital deductions (Fixed) correctly', async () => {
    const mockFee = {
      amount_vnd: 3000000,
      base_amount_vnd: 3000000,
      month: 10,
      school_year: '2024-2025',
      classes: {
        class_type: 'Daycare',
        meal_rate: 20000,
        hospital_deduction_type: 'Fixed',
        hospital_deduction_value: 500000
      }
    };
    const mockAttendance = [{ status: 'absent', is_hospitalized: true }];

    const fromMock = vi.mocked(supabase.from);
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFee) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockAttendance) as any);
    const updateChain = createMockSupabaseChain({});
    fromMock.mockReturnValueOnce(updateChain as any);

    await syncFeeWithAttendance('fee-1');

    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      amount_vnd: 3000000 - 520000,
      meal_deduction_vnd: 20000,
      tuition_deduction_vnd: 500000
    }));
  });

  it('should calculate hospital deductions (Daily %) correctly', async () => {
    const mockFee = {
      amount_vnd: 2200000,
      base_amount_vnd: 2200000,
      month: 10,
      school_year: '2024-2025',
      classes: {
        class_type: 'Daycare',
        meal_rate: 20000,
        hospital_deduction_type: 'Daily',
        hospital_deduction_value: 50
      }
    };
    const mockAttendance = [{ status: 'absent', is_hospitalized: true }];

    const fromMock = vi.mocked(supabase.from);
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFee) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockAttendance) as any);
    const updateChain = createMockSupabaseChain({});
    fromMock.mockReturnValueOnce(updateChain as any);

    await syncFeeWithAttendance('fee-1');

    // Daily tuition = 2.2M / 22 = 100k. 50% = 50k. Total deduction = 20k (meal) + 50k (tuition) = 70k
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      amount_vnd: 2200000 - 70000,
      meal_deduction_vnd: 20000,
      tuition_deduction_vnd: 50000
    }));
  });

  it('should handle Evening class cancellations correctly', async () => {
    const mockFee = {
      amount_vnd: 1200000,
      base_amount_vnd: 1200000,
      month: 10,
      school_year: '2024-2025',
      classes: {
        class_type: 'Evening',
        cancel_rate: 50000
      }
    };
    const mockAttendance = [
      { status: 'center_cancelled', is_hospitalized: false },
      { status: 'center_cancelled', is_hospitalized: false },
    ];

    const fromMock = vi.mocked(supabase.from);
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFee) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockAttendance) as any);
    const updateChain = createMockSupabaseChain({});
    fromMock.mockReturnValueOnce(updateChain as any);

    await syncFeeWithAttendance('fee-1');

    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      amount_vnd: 1200000 - 100000,
      tuition_deduction_vnd: 100000
    }));
  });
});

describe('createClassFees', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockSupabaseChain = (data: any, error: any = null) => {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error }),
      then: vi.fn().mockImplementation((cb) => cb({ data, error })),
    };
  };

  it('should return error if no students in class', async () => {
    const fromMock = vi.mocked(supabase.from);
    fromMock.mockReturnValueOnce(createMockSupabaseChain([]) as any); // Students query

    const result = await createClassFees(1, 10, '2024-2025', 'Tuition', 3000000);
    expect(result.error?.message).toBe('Lớp học hiện chưa có học sinh nào.');
  });

  it('should return CONFLICT error if records already exist', async () => {
    const fromMock = vi.mocked(supabase.from);
    fromMock.mockReturnValueOnce(createMockSupabaseChain([{ id: 'std-1' }]) as any); // Students query
    fromMock.mockReturnValueOnce(createMockSupabaseChain(null, { code: '23505' }) as any); // Insert query

    const result = await createClassFees(1, 10, '2024-2025', 'Tuition', 3000000);
    expect(result.error?.code).toBe('CONFLICT');
  });
});
