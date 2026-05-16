import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('syncFeeWithAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate deductions correctly using deduction_rules', async () => {
    const mockFee = {
      id: 'fee-1',
      student_id: 'std-1',
      class_id: 1,
      amount_vnd: 3000000,
      base_amount_vnd: 3000000,
      month: 10,
      school_year: '2024-2025',
    };

    const mockConfig = {
      class_type: 'Daycare',
      deduction_rules: [
        { name: 'Tiền ăn', amount: 20000 },
        { name: 'Phí dịch vụ', amount: 5000 },
      ],
    };

    const mockAttendance = [
      { status: 'absent' },
      { status: 'absent' },
      { status: 'present' },
      { status: 'absent' },
      { status: 'present' },
    ];

    const fromMock = vi.mocked(supabase.from);
    
    // Call 1: Load fee
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFee) as any);
    // Call 2: Load finance config
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockConfig) as any);
    // Call 3: Load attendance
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockAttendance) as any);
    // Call 4: Update
    const updateChain = createMockSupabaseChain({ ...mockFee, amount_vnd: 2925000 });
    fromMock.mockReturnValueOnce(updateChain as any);

    const result = await syncFeeWithAttendance('fee-1');

    expect(result.error).toBeNull();
    // 3 absent days * (20000 + 5000) = 75000 deduction
    // 3000000 - 75000 = 2925000
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      amount_vnd: 2925000,
      attendance_deduction_vnd: 75000,
    }));
  });

  it('should not calculate deduction if rules are empty', async () => {
    const mockFee = {
      id: 'fee-1',
      student_id: 'std-1',
      class_id: 1,
      amount_vnd: 1200000,
      base_amount_vnd: 1200000,
      month: 10,
      school_year: '2024-2025',
    };
    const mockConfig = {
      class_type: 'Evening',
      deduction_rules: []
    };

    const fromMock = vi.mocked(supabase.from);
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockFee) as any);
    fromMock.mockReturnValueOnce(createMockSupabaseChain(mockConfig) as any);
    const updateChain = createMockSupabaseChain({});
    fromMock.mockReturnValueOnce(updateChain as any);

    await syncFeeWithAttendance('fee-1');

    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      amount_vnd: 1200000,
      attendance_deduction_vnd: 0
    }));
  });
});

describe('createClassFees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create fees for multiple students', async () => {
    // Mock guards to bypass permission check
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
