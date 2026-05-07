import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  single: vi.fn(),
  eq: vi.fn(),
  neq: vi.fn(),
  or: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  maybeSingle: vi.fn(),
  range: vi.fn(),
}));

vi.mock('@/lib/timeout', () => ({
  withSupabaseTimeout: vi.fn(async (query) => query),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.from,
  },
}));

describe('Phase 2 Service Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default chaining
    mocks.from.mockReturnThis();
    mocks.select.mockReturnThis();
    mocks.order.mockReturnThis();
    mocks.limit.mockReturnThis();
    mocks.eq.mockReturnThis();
    mocks.neq.mockReturnThis();
    mocks.or.mockReturnThis();
    mocks.update.mockReturnThis();
    mocks.delete.mockReturnThis();
    
    // Terminal calls return default empty data
    mocks.single.mockResolvedValue({ data: null, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.range.mockResolvedValue({ data: [], count: 0, error: null });
    mocks.insert.mockResolvedValue({ data: null, error: null });

    // Manually link the chain for functions that return the same mock object
    const builder = {
      select: mocks.select,
      order: mocks.order,
      limit: mocks.limit,
      eq: mocks.eq,
      neq: mocks.neq,
      or: mocks.or,
      single: mocks.single,
      maybeSingle: mocks.maybeSingle,
      range: mocks.range,
      insert: mocks.insert,
      update: mocks.update,
      delete: mocks.delete,
    };

    mocks.from.mockReturnValue(builder);
    mocks.select.mockReturnValue(builder);
    mocks.order.mockReturnValue(builder);
    mocks.limit.mockReturnValue(builder);
    mocks.eq.mockReturnValue(builder);
    mocks.neq.mockReturnValue(builder);
    mocks.or.mockReturnValue(builder);
    mocks.update.mockReturnValue(builder);
    mocks.delete.mockReturnValue(builder);
  });

  it('dashboardService.getDashboardStats calls correct aggregate queries', async () => {
    const { getDashboardStats } = await import('./dashboardService');
    
    mocks.from.mockImplementation((table) => {
      const b: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: (onFullfilled: any) => Promise.resolve({ data: [], error: null }).then(onFullfilled),
      };
      
      if (table === 'students') b.then = (onFullfilled: any) => Promise.resolve({ data: null, count: 156, error: null }).then(onFullfilled);
      if (table === 'fee_records') b.neq = vi.fn().mockResolvedValue({ data: [{ amount_vnd: 100, paid_amount_vnd: 40 }], error: null });
      if (table === 'attendance') b.eq = vi.fn().mockResolvedValue({ data: [{ status: 'present' }, { status: 'absent' }], error: null });
      
      return b;
    });

    const { stats, error } = await getDashboardStats();
    
    expect(error).toBeNull();
    expect(stats?.totalStudents).toBe(156);
    expect(stats?.totalDebt).toBe(60);
  });

  it('settingsService.getSchoolSettings returns latest settings', async () => {
    const { getSchoolSettings } = await import('./settingsService');
    const mockData = { id: 1, school_name: 'Test School', school_year: '2024-2025' };
    
    mocks.single.mockResolvedValue({ data: mockData, error: null });

    const { settings, error } = await getSchoolSettings();
    
    expect(error).toBeNull();
    expect(settings?.school_name).toBe('Test School');
    expect(mocks.order).toHaveBeenCalledWith('school_year', { ascending: false });
  });

  it('feesService.listFees applies studentId filter', async () => {
    const { listFees } = await import('./feesService');
    
    await listFees({ page: 1, pageSize: 10, studentId: 'student-123' });
    
    expect(mocks.eq).toHaveBeenCalledWith('student_id', 'student-123');
  });

  it('usersService.listParents fetches parents with students', async () => {
    const { listParents } = await import('./usersService');
    const mockParents = [
      { 
        id: 'p1', 
        full_name: 'Parent A', 
        relationship: 'Father',
        student_parent: [
          { student_id: 's1', students: { full_name: 'Child A', classes: { name: 'Class 1' } } }
        ] 
      }
    ];

    mocks.order.mockResolvedValue({ data: mockParents, error: null });

    const { items, error } = await listParents();
    
    expect(error).toBeNull();
    expect(items[0].full_name).toBe('Parent A');
    expect(items[0].students[0].full_name).toBe('Child A');
  });
});
