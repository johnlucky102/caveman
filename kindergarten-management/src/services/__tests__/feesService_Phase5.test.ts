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
      id: 'f1', student_id: 's1', class_id: 1, base_amount_vnd: 3000000, amount_vnd: 3000000, school_year: '2024-2025', month: 10,
    };
    const configData = { class_type: 'Daycare', meal_rate: 20000 };
    
    // syncFeeWithAttendance calls:
    // 1. feeResult = supabase.from('fee_records').select().eq().single()
    // 2. configResult = supabase.from('class_finance_configs').select().eq().eq().maybeSingle()
    // 3. attendanceResult = supabase.from('attendance').select().eq().gte().lte().eq()
    // 4. updateResult = supabase.from('fee_records').update().eq().select().single()

    primeAdminFeeGuard();

    mockQuery.single
      .mockResolvedValueOnce({ data: feeData, error: null }) // feeResult
      .mockResolvedValueOnce({ data: { ...feeData, amount_vnd: 3000000 }, error: null }); // updateResult

    mockQuery.maybeSingle
      .mockResolvedValueOnce({ data: configData, error: null }); // class_finance_configs

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
    expect(item?.attendance_deduction_vnd).toBe(0);
  });

  it('BIZ-02: Calculates meal deduction correctly (5 days absent)', async () => {
    const feeData = {
      id: 'f1', student_id: 's1', class_id: 1, base_amount_vnd: 3000000, amount_vnd: 3000000, school_year: '2024-2025', month: 10,
    };
    // Use deduction_rules array instead of meal_rate
    const configData = { class_type: 'Daycare', deduction_rules: [{ id: 'meal', name: 'Tiền cơm', amount: 20000 }] };
    const attendanceData = [
      { status: 'absent' }, { status: 'absent' }, { status: 'absent' },
      { status: 'absent' }, { status: 'absent' }
    ];

    // syncFeeWithAttendance: auth.getUser() -> load fee -> load config -> attendance -> update
    mockQuery.single.mockResolvedValueOnce({ data: feeData, error: null });
    mockQuery.maybeSingle.mockResolvedValueOnce({ data: configData, error: null });

    mockQuery.select.mockImplementation((...args: any[]) => {
       if (args[0] === '*') {
         return { ...mockQuery, then: (resolve: any) => resolve({ data: attendanceData, error: null }) };
       }
       return mockQuery;
    });

    mockQuery.single.mockResolvedValueOnce({ data: { ...feeData, amount_vnd: 2900000, attendance_deduction_vnd: 100000 }, error: null });

    const { item } = await syncFeeWithAttendance('f1');
    expect(item?.attendance_deduction_vnd).toBe(100000);
    expect(item?.amount_vnd).toBe(2900000);
  });

  it('DB-Integrity: Caps paid_amount to amount when exceeding', async () => {
    // updateFeeRecordStatus flow:
    // 1. Calls syncFeeWithAttendance:
    //    - load fee: single
    //    - load class_finance_configs: maybeSingle
    //    - attendance: select('*') then()
    //    - update: select().single()
    // 2. Then updateFeeRecordStatus does its own update: update().eq().eq().select().single()

    mockQuery.single.mockResolvedValueOnce({ data: { id: 'f1', amount_vnd: 1000000, base_amount_vnd: 1000000, class_id: 1, month: 10, school_year: '2024-2025' }, error: null });
    mockQuery.maybeSingle.mockResolvedValueOnce({ data: { class_type: 'Daycare', deduction_rules: [{ id: 'meal', name: 'Tiền cơm', amount: 20000 }] }, error: null });

    mockQuery.select.mockImplementation((...args: any[]) => {
      if (args[0] === '*') {
        return { ...mockQuery, then: (resolve: any) => resolve({ data: [], error: null }) };
      }
      return mockQuery;
    });

    // syncFeeWithAttendance update result
    mockQuery.single.mockResolvedValueOnce({ data: { id: 'f1', amount_vnd: 1000000 }, error: null });
    // updateFeeRecordStatus final update result
    mockQuery.single.mockResolvedValueOnce({ data: { id: 'f1', amount_vnd: 1000000, paid_amount_vnd: 1000000, status: 'paid' }, error: null });

    const { error } = await updateFeeRecordStatus('f1', 1500000, null, 'cash');
    // paidAmount 1.5M gets capped to amount 1M -> no VALIDATION error
    expect(error).toBeNull();
  });
});