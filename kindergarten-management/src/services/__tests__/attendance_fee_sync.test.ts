import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncFeeWithAttendance } from '../feesService';
import { supabase } from '@/lib/supabase';

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

describe('Attendance to Fee Sync Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup chaining
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

  it('should calculate correct meal deductions for Daycare class', async () => {
    // Mock fee record returned from syncFeeWithAttendance's fee load
    const mockFee = {
      id: 'fee-1',
      student_id: 's-1',
      class_id: 1,
      month: 10,
      school_year: '2024-2025',
      amount_vnd: 2000000,
      base_amount_vnd: 2000000,
    };

    // Mock finance config with deduction_rules array (new schema)
    const mockConfig = {
      class_type: 'Daycare',
      deduction_rules: [{ id: 'meal', name: 'Tiền cơm', amount: 30000 }],
    };

    // Mock attendance (3 days absent)
    const mockAttendance = [
      { status: 'absent', attendance_date: '2024-10-05' },
      { status: 'absent', attendance_date: '2024-10-10' },
      { status: 'excused', attendance_date: '2024-10-15' },
      { status: 'present', attendance_date: '2024-10-20' },
    ];

    // syncFeeWithAttendance flow:
    // 1. supabase.auth.getUser() -> already mocked globally
    // 2. Load fee: select(...).eq('id', feeId).single()
    mockQuery.single.mockResolvedValueOnce({ data: mockFee, error: null });

    // 2a. Load class: select('class_type').eq('id', fee.class_id).single()
    mockQuery.single.mockResolvedValueOnce({ data: { class_type: 'Daycare' }, error: null });

    // 3. Load class_finance_configs: select(...).eq().eq().maybeSingle()
    mockQuery.maybeSingle.mockResolvedValueOnce({ data: mockConfig, error: null });

    // 4. Attendance query: select('*').eq().gte().lte()
    mockQuery.select.mockImplementation((...args: any[]) => {
      if (args[0] === '*') {
        return { ...mockQuery, then: (resolve: any) => resolve({ data: mockAttendance, error: null }) };
      }
      return mockQuery;
    });

    // 5. Update result: update().eq().select().single()
    mockQuery.single.mockResolvedValueOnce({
      data: { ...mockFee, amount_vnd: 2000000 - 90000, attendance_deduction_vnd: 90000 },
      error: null,
    });

    const result = await syncFeeWithAttendance('fee-1');

    expect(result.error).toBeNull();
    // 3 absent days * 30,000 = 90,000 deduction
    expect(result.item?.attendance_deduction_vnd).toBe(90000);
    expect(result.item?.amount_vnd).toBe(1910000);
  });
});