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

describe('syncFeeWithAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate meal deductions correctly for Daycare classes', async () => {
    const mockFee = {
      id: 'fee-1',
      student_id: 'std-1',
      class_id: 'cls-1',
      amount_vnd: 3000000,
      base_amount_vnd: 3000000,
      month: 10,
      school_year: '2024-2025',
    };

    const mockConfig = {
      class_type: 'Daycare',
      meal_rate: 20000,
    };

    const mockAttendance = [
      { status: 'absent' },
      { status: 'absent' },
      { status: 'absent' }, // was 'excused' — now unified under 'absent'
      { status: 'present' },
      { status: 'absent' }, // was 'center_cancelled' — now unified under 'absent'
      { status: 'absent' },
    ];

    const fromMock = vi.mocked(supabase.from);
    
    // Call 1 & 2: ensureFinancialAccess (users, fee_records)
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ role: 'Admin' }) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ status: 'unpaid', class_id: 1 }) as any);
    // Call 3: Load fee
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFee) as any);
    // Call 4: Load finance config from class_finance_configs
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockConfig) as any);
    // Call 5: Load attendance
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockAttendance) as any);
    // Call 6: Update
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

  it('should handle Evening class cancellations correctly', async () => {
    const mockFee = {
      amount_vnd: 1200000,
      base_amount_vnd: 1200000,
      month: 10,
      school_year: '2024-2025',
    };
    const mockConfig = {
      class_type: 'Evening',
      cancel_rate: 50000
    };
    const mockAttendance = [
      { status: 'absent' }, // was 'center_cancelled' — now unified under 'absent'
      { status: 'absent' }, // was 'center_cancelled' — now unified under 'absent'
    ];

    const fromMock = vi.mocked(supabase.from);
    // RBAC
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ role: 'Admin' }) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ status: 'unpaid', class_id: 1 }) as any);
    // Data: fee
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFee) as any);
    // Data: class_finance_configs
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockConfig) as any);
    // Data: attendance
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockAttendance) as any);
    const updateChain = createMockSupabaseChain({});
    fromMock.mockReturnValueOnce(updateChain as any);

    await syncFeeWithAttendance('fee-1');

    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      amount_vnd: 1200000 - 100000, // 2 absent × 50k cancel_rate
      meal_deduction_vnd: 0,
      tuition_deduction_vnd: 100000
    }));
  });

  it('should not recalculate if no absence', async () => {
    const mockFee = {
      amount_vnd: 1200000,
      base_amount_vnd: 1200000,
      month: 10,
      school_year: '2024-2025',
    };
    const mockConfig = {
      class_type: 'Daycare',
      meal_rate: 20000,
    };
    const mockAttendance = [
      { status: 'present' },
    ];

    const fromMock = vi.mocked(supabase.from);
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ role: 'Admin' }) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ status: 'unpaid', class_id: 1 }) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFee) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockConfig) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockAttendance) as any);
    const updateChain = createMockSupabaseChain({});
    fromMock.mockReturnValueOnce(updateChain as any);

    await syncFeeWithAttendance('fee-1');

    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      amount_vnd: 1200000,
      meal_deduction_vnd: 0,
      tuition_deduction_vnd: 0
    }));
  });
});

describe('createClassFees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create fees for multiple students', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: { id: 'fee-1' }, error: null });
    const selectMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn().mockReturnThis();
    
    vi.mocked(supabase.from).mockReturnValue({
      insert: insertMock,
      select: selectMock,
      single: singleMock,
    } as any);

    const result = await createClassFees(
      { classId: 1, month: 10, schoolYear: '2024-2025' },
      1,
      3000000,
      [{ studentId: 's1' }, { studentId: 's2' }],
    );

    expect(result.error).toBeNull();
    expect(result.items.length).toBe(2);
  });
});

describe('deleteFeeRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should soft-delete fee records', async () => {
    const feeModSpy = vi.spyOn(serviceGuards, 'ensureFeeModificationAccess');

    const fromMock = vi.mocked(supabase.from);
    // RBAC guard
    feeModSpy.mockResolvedValue({ error: null });

    const updateChain = createMockSupabaseChain({});
    fromMock.mockReturnValueOnce(updateChain as any);

    const result = await deleteFeeRecords(['a', 'b']);
    expect(result.error).toBeNull();
    expect(updateChain.update).toHaveBeenCalledWith({ del_yn: true });
    expect(feeModSpy).toHaveBeenCalledTimes(2);
  });
});
