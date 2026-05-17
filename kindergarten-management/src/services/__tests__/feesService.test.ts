import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncFeeWithAttendance, createClassFees, deleteFeeRecords, bulkSyncFeesByFilter } from '../feesService';
import { supabase } from '@/lib/supabase';
import * as serviceGuards from '../serviceGuards';
import { TEST_FINANCE_CONFIGS, TEST_CLASSES } from '@/test/utils/testData';

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
      maybeSingle: vi.fn(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
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
    insert: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((cb) => cb({ data, error })),
  };
  return chain;
};

describe('syncFeeWithAttendance - class_type refactor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should query classes table to get class_type', async () => {
    const mockFee = {
      id: 'fee-1',
      student_id: 'std-1',
      class_id: 1,
      amount_vnd: 2000000,
      base_amount_vnd: 2000000,
      month: 9,
      school_year: '2024-2025',
    };

    const fromMock = vi.mocked(supabase.from);
    
    // Call 1: Load fee
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFee) as any);
    // Call 2: Load class to get class_type
    const classChain = createMockSupabaseChain({ class_type: 'Evening' }) as any;
    fromMock.mockReturnValueOnce(classChain);
    // Call 3: Load finance config by class_type
    const configChain = createMockSupabaseChain(TEST_FINANCE_CONFIGS.evening) as any;
    fromMock.mockReturnValueOnce(configChain);
    // Call 4: Load attendance
    fromMock.mockReturnValueOnce(createMockSupabaseChain([]) as any);
    // Call 5: Update
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFee) as any);

    await syncFeeWithAttendance('fee-1');

    expect(classChain.eq).toHaveBeenCalledWith('id', 1);
    expect(configChain.eq).toHaveBeenCalledWith('class_type', 'Evening');
  });

  it('should query class_finance_configs by class_type', async () => {
    const mockFee = {
      id: 'fee-1',
      student_id: 'std-1',
      class_id: 2,
      amount_vnd: 2000000,
      base_amount_vnd: 2000000,
      month: 9,
      school_year: '2024-2025',
    };

    const fromMock = vi.mocked(supabase.from);
    
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFee) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ class_type: 'Daycare' }) as any);
    
    const configChain = createMockSupabaseChain(TEST_FINANCE_CONFIGS.daycare) as any;
    fromMock.mockReturnValueOnce(configChain);
    
    fromMock.mockReturnValueOnce(createMockSupabaseChain([]) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFee) as any);

    await syncFeeWithAttendance('fee-1');

    expect(configChain.eq).toHaveBeenCalledWith('class_type', 'Daycare');
    expect(configChain.eq).toHaveBeenCalledWith('del_yn', false);
  });

  it('should calculate deductions correctly using Evening config', async () => {
    const mockFee = {
      id: 'fee-1',
      student_id: 'std-1',
      class_id: 2,
      amount_vnd: 2000000,
      base_amount_vnd: 2000000,
      month: 9,
      school_year: '2024-2025',
    };

    const mockAttendance = [
      { status: 'absent' },
      { status: 'absent' },
      { status: 'absent' },
      { status: 'present' },
    ];

    const fromMock = vi.mocked(supabase.from);
    
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFee) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ class_type: 'Evening' }) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain(TEST_FINANCE_CONFIGS.evening) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockAttendance) as any);
    
    const updateChain = createMockSupabaseChain({ ...mockFee, amount_vnd: 1880000 }) as any;
    fromMock.mockReturnValueOnce(updateChain as any);

    const result = await syncFeeWithAttendance('fee-1');

    expect(result.error).toBeNull();
    // 3 absent days * 40,000 (Tiền cơm tối) = 120,000 deduction
    // 2,000,000 - 120,000 = 1,880,000
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      amount_vnd: 1880000,
      attendance_deduction_vnd: 120000,
    }));
  });

  it('should return error when finance config missing for class_type', async () => {
    const mockFee = {
      id: 'fee-1',
      student_id: 'std-1',
      class_id: 1,
      amount_vnd: 2000000,
      base_amount_vnd: 2000000,
      month: 9,
      school_year: '2024-2025',
    };

    const fromMock = vi.mocked(supabase.from);
    
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFee) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ class_type: 'Daycare' }) as any);
    // Config not found
    fromMock.mockReturnValueOnce(createMockSupabaseChain(null) as any);

    const result = await syncFeeWithAttendance('fee-1');

    expect(result.error).not.toBeNull();
    expect(result.error?.message).toContain('Config not found');
  });

  it('should format deduction note correctly with Vietnamese text', async () => {
    const mockFee = {
      id: 'fee-1',
      student_id: 'std-1',
      class_id: 1,
      amount_vnd: 2000000,
      base_amount_vnd: 2000000,
      month: 9,
      school_year: '2024-2025',
    };

    const mockAttendance = [
      { status: 'absent' },
      { status: 'present' },
    ];

    const fromMock = vi.mocked(supabase.from);
    
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFee) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain({ class_type: 'Daycare' }) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain(TEST_FINANCE_CONFIGS.daycare) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockAttendance) as any);
    
    const updateChain = createMockSupabaseChain(mockFee) as any;
    fromMock.mockReturnValueOnce(updateChain as any);

    await syncFeeWithAttendance('fee-1');

    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      deduction_note: expect.stringContaining('Khấu trừ 1 ngày vắng tháng trước'),
    }));
  });
});

describe('bulkSyncFeesByFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch fees by class_id and determine class_types', async () => {
    vi.spyOn(serviceGuards, 'ensureFinancialAccess').mockResolvedValue({ error: null });

    const mockFees = [
      { id: 'fee-1', student_id: 's1', class_id: 1, amount_vnd: 2000000, base_amount_vnd: 2000000, month: 9, school_year: '2024-2025', status: 'unpaid' },
      { id: 'fee-2', student_id: 's2', class_id: 2, amount_vnd: 1500000, base_amount_vnd: 1500000, month: 9, school_year: '2024-2025', status: 'unpaid' },
    ];

    const fromMock = vi.mocked(supabase.from);
    
    // Call 1: Fetch fees
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFees) as any);
    // Call 2: Fetch configs (currently uses class_id, will need class_type refactor)
    fromMock.mockReturnValueOnce(createMockSupabaseChain([]) as any);
    // Call 3: Fetch attendance
    fromMock.mockReturnValueOnce(createMockSupabaseChain([]) as any);
    // Call 4: Updates
    fromMock.mockReturnValueOnce(createMockSupabaseChain({}) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain({}) as any);

    const result = await bulkSyncFeesByFilter({ class_id: 1 });

    expect(result.error).toBeNull();
    expect(fromMock).toHaveBeenCalledWith('fee_records');
  });
});

describe('createClassFees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create fees for multiple students', async () => {
    vi.spyOn(serviceGuards, 'ensureFinancialAccess').mockResolvedValue({ error: null });

    const fromMock = vi.mocked(supabase.from);
    const mockChain = createMockSupabaseChain({ id: 'fee-1' });
    fromMock.mockReturnValue(mockChain as any);

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

  it('should soft-delete fee records using .in()', async () => {
    vi.spyOn(serviceGuards, 'ensureFinancialAccess').mockResolvedValue({ error: null });

    const fromMock = vi.mocked(supabase.from);
    const updateChain = createMockSupabaseChain({});
    fromMock.mockReturnValueOnce(updateChain as any);

    const result = await deleteFeeRecords(['a', 'b']);
    expect(result.error).toBeNull();
    expect(updateChain.update).toHaveBeenCalledWith({ del_yn: true });
    expect(updateChain.in).toHaveBeenCalledWith('id', ['a', 'b']);
  });
});
