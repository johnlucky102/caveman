import { beforeEach, describe, expect, it, vi } from 'vitest';
import { syncFeeWithAttendance, updateFeeRecordStatus } from '../feesService';

const { mockQuery } = vi.hoisted(() => {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    in: vi.fn(),
  };
  return { mockQuery: q };
});

vi.mock('@/lib/timeout', () => ({
  withSupabaseTimeout: vi.fn(async (query) => query),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-admin' } } }),
    },
    from: vi.fn().mockReturnValue(mockQuery),
  },
}));

vi.mock('@/utils/swCacheInvalidate', () => ({
  invalidateSwCache: vi.fn(),
}));

describe('Fees Service - Phase 5 Business Logic (Integer Currency)', () => {
  /** Matches ensureFeeModificationAccess + getCurrentUser order before fee queries. */
  function primeAdminFeeGuard() {
    mockQuery.single.mockResolvedValueOnce({ data: { role: 'Admin' }, error: null });
    mockQuery.maybeSingle.mockResolvedValueOnce({ data: { status: 'unpaid', class_id: 1 }, error: null });
  }

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup chaining: methods that return a builder must return mockQuery
    mockQuery.select.mockReturnValue(mockQuery);
    mockQuery.eq.mockReturnValue(mockQuery);
    mockQuery.gte.mockReturnValue(mockQuery);
    mockQuery.lte.mockReturnValue(mockQuery);
    mockQuery.update.mockReturnValue(mockQuery);
    mockQuery.insert.mockReturnValue(mockQuery);
    mockQuery.order.mockReturnValue(mockQuery);
    mockQuery.in.mockReturnValue(mockQuery);
    mockQuery.range.mockReturnValue(mockQuery);

    mockQuery.single.mockReset();
    mockQuery.maybeSingle.mockReset();
  });

  it('BIZ-01: Calculates correctly with zero deductions', async () => {
    const feeData = { 
      id: 'f1', student_id: 's1', base_amount_vnd: 3000000, amount_vnd: 3000000, school_year: '2024-2025', month: 10,
      classes: { class_type: 'Daycare', meal_rate: 20000 } 
    };
    
    // syncFeeWithAttendance calls:
    // 1. feeResult = supabase.from().select().eq().single()
    // 2. attendanceResult = supabase.from().select().eq().gte().lte().eq()
    // 3. updateResult = supabase.from().update().eq().select().single()

    primeAdminFeeGuard();

    mockQuery.single
      .mockResolvedValueOnce({ data: feeData, error: null }) // feeResult
      .mockResolvedValueOnce({ data: { ...feeData, amount_vnd: 3000000 }, error: null }); // updateResult

    // Attendance results (it uses await on the query directly)
    mockQuery.select.mockImplementation((...args: any[]) => {
       // If it's the attendance query (no chaining to single)
       if (args[0] === '*') {
         const builder = { ...mockQuery, then: (resolve: any) => resolve({ data: [], error: null }) };
         return builder;
       }
       return mockQuery;
    });

    const { item } = await syncFeeWithAttendance('f1');
    expect(item?.amount_vnd).toBe(3000000);
    expect(item?.meal_deduction_vnd).toBe(0);
  });

  it('BIZ-02: Calculates meal deduction correctly (5 days absent)', async () => {
    const feeData = { 
      id: 'f1', student_id: 's1', base_amount_vnd: 3000000, amount_vnd: 3000000, school_year: '2024-2025', month: 10,
      classes: { class_type: 'Daycare', meal_rate: 20000 } 
    };
    const attendanceData = [
      { status: 'absent' }, { status: 'absent' }, { status: 'excused' }, 
      { status: 'center_cancelled' }, { status: 'absent' }
    ];
    
    primeAdminFeeGuard();

    mockQuery.single
      .mockResolvedValueOnce({ data: feeData, error: null })
      .mockResolvedValueOnce({ data: { ...feeData, amount_vnd: 2900000, meal_deduction_vnd: 100000 }, error: null });

    mockQuery.select.mockImplementation((...args: any[]) => {
       if (args[0] === '*') {
         return { ...mockQuery, then: (resolve: any) => resolve({ data: attendanceData, error: null }) };
       }
       return mockQuery;
    });

    const { item } = await syncFeeWithAttendance('f1');
    expect(item?.meal_deduction_vnd).toBe(100000);
    expect(item?.amount_vnd).toBe(2900000);
  });

  it('BIZ-05: Handles rounding correctly for percentage deductions', async () => {
    const feeData = { 
      id: 'f1', student_id: 's1', base_amount_vnd: 1500501, amount_vnd: 1500501, school_year: '2024-2025', month: 10,
      classes: { class_type: 'Daycare', hospital_deduction_type: 'Daily', hospital_deduction_value: 10 }
    };
    const attendanceData = [{ is_hospitalized: true }];
    
    primeAdminFeeGuard();

    mockQuery.single
      .mockResolvedValueOnce({ data: feeData, error: null })
      .mockResolvedValueOnce({ data: { ...feeData, tuition_deduction_vnd: 6820, amount_vnd: 1500501 - 6820 }, error: null });

    mockQuery.select.mockImplementation((...args: any[]) => {
       if (args[0] === '*') {
         return { ...mockQuery, then: (resolve: any) => resolve({ data: attendanceData, error: null }) };
       }
       return mockQuery;
    });

    const { item } = await syncFeeWithAttendance('f1');
    expect(item?.tuition_deduction_vnd).toBe(6820);
    expect(item?.amount_vnd).toBe(1493681);
  });

  it('DB-Integrity: Prevents paid_amount exceeding amount', async () => {
    primeAdminFeeGuard();
    mockQuery.single.mockResolvedValueOnce({ data: { amount_vnd: 1000000 }, error: null });

    const { error } = await updateFeeRecordStatus('f1', 1500000, null, 'cash');
    expect(error?.code).toBe('VALIDATION');
    expect(error?.message).toContain('exceed');
  });

  it('DB-Integrity: Prevents negative paid_amount', async () => {
    primeAdminFeeGuard();
    mockQuery.single.mockResolvedValueOnce({ data: { amount_vnd: 1000000 }, error: null });

    const { error } = await updateFeeRecordStatus('f1', -500, null, 'cash');
    expect(error?.code).toBe('VALIDATION');
    expect(error?.message).toContain('greater than or equal to 0');
  });
});
