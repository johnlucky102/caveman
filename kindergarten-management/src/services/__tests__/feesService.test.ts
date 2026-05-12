import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncFeeWithAttendance, createClassFees, deleteFeeRecords } from '../feesService';
import { supabase } from '@/lib/supabase';
import * as serviceGuards from '../serviceGuards';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
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
      maybeSingle: vi.fn().mockResolvedValue({ data, error }),
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
    
    // Call 1 & 2: ensureFinancialAccess (users, fee_records)
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ role: 'Admin' }) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ status: 'unpaid', class_id: 1 }) as any);
    // Call 3: Load fee
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFee) as any);
    // Call 4: Load attendance
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockAttendance) as any);
    // Call 5: Update
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
    // RBAC
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ role: 'Admin' }) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ status: 'unpaid', class_id: 1 }) as any);
    // Data
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
    // RBAC
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ role: 'Admin' }) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ status: 'unpaid', class_id: 1 }) as any);
    // Data
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
    // RBAC
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ role: 'Admin' }) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ status: 'unpaid', class_id: 1 }) as any);
    // Data
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
      single: vi.fn().mockResolvedValue({ data, error }),
      maybeSingle: vi.fn().mockResolvedValue({ data, error }),
      insert: vi.fn().mockResolvedValue({ error }),
      then: vi.fn().mockImplementation((cb) => cb({ data, error })),
    };
  };

  it('should return error if no students in class', async () => {
    const fromMock = vi.mocked(supabase.from);
    // RBAC check
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ role: 'Admin' }) as any); // users
    // Students query
    fromMock.mockReturnValueOnce(createMockSupabaseChain([]) as any); // students

    const result = await createClassFees(1, 10, '2024-2025', 'Tuition', 3000000);
    expect(result.error?.message).toBe('Lớp học hiện chưa có học sinh nào.');
  });

  it('should return CONFLICT error if records already exist', async () => {
    const fromMock = vi.mocked(supabase.from);
    // RBAC
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ role: 'Admin' }) as any); // users
    // Students query
    fromMock.mockReturnValueOnce(createMockSupabaseChain([{ id: 'std-1' }]) as any); // Students query
    // Insert query
    fromMock.mockReturnValueOnce(createMockSupabaseChain(null, { code: '23505' }) as any); // Insert query

    const result = await createClassFees(1, 10, '2024-2025', 'Tuition', 3000000);
    expect(result.error?.code).toBe('CONFLICT');
  });
});

describe('deleteFeeRecords', () => {
  let finSpy: ReturnType<typeof vi.spyOn>;
  let feeModSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    finSpy = vi.spyOn(serviceGuards, 'ensureFinancialAccess').mockResolvedValue({ error: null });
    feeModSpy = vi.spyOn(serviceGuards, 'ensureFeeModificationAccess').mockResolvedValue({ error: null });
  });

  afterEach(() => {
    finSpy.mockRestore();
    feeModSpy.mockRestore();
  });

  const chainThen = (data: any, err: any = null) => ({
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((cb: any) => cb({ data, error: err })),
  });

  it('returns FORBIDDEN when ensureFinancialAccess fails', async () => {
    finSpy.mockResolvedValue({ error: { code: 'FORBIDDEN', message: 'no' } });
    const fromMock = vi.mocked(supabase.from);
    const result = await deleteFeeRecords(['a', 'b']);
    expect(result.error?.code).toBe('FORBIDDEN');
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('returns NOT_FOUND when some ids are missing', async () => {
    const fromMock = vi.mocked(supabase.from);
    fromMock.mockReturnValueOnce(chainThen([{ id: 'a' }]) as any);
    const result = await deleteFeeRecords(['a', 'b']);
    expect(result.error?.code).toBe('NOT_FOUND');
    expect(feeModSpy).not.toHaveBeenCalled();
  });

  it('returns guard error when ensureFeeModificationAccess fails', async () => {
    feeModSpy.mockResolvedValue({ error: { code: 'FORBIDDEN', message: 'paid' } });
    const fromMock = vi.mocked(supabase.from);
    fromMock.mockReturnValueOnce(chainThen([{ id: 'a' }, { id: 'b' }]) as any);
    const result = await deleteFeeRecords(['a', 'b']);
    expect(result.error?.code).toBe('FORBIDDEN');
  });

  it('soft-deletes all ids when checks pass', async () => {
    const fromMock = vi.mocked(supabase.from);
    const updateChain = chainThen(null, null);
    fromMock.mockReturnValueOnce(chainThen([{ id: 'a' }, { id: 'b' }]) as any);
    fromMock.mockReturnValueOnce(updateChain as any);
    const result = await deleteFeeRecords(['a', 'b']);
    expect(result.error).toBeNull();
    expect(updateChain.update).toHaveBeenCalledWith({ del_yn: true });
    expect(feeModSpy).toHaveBeenCalledTimes(2);
  });
});
