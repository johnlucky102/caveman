import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardStats, getAttendanceTrend, getFeeStatusSummary } from '../dashboardService';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn(),
    })),
  },
}));

// Mock Timeout utility
vi.mock('@/lib/timeout', () => ({
  withSupabaseTimeout: vi.fn((promise) => promise),
}));

describe('dashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockChain = (data: any, count: number | null = null, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((cb) => cb({ data, count, error })),
  });

  describe('getDashboardStats', () => {
    it('should aggregate counts correctly', async () => {
      const fromMock = vi.mocked(supabase.from);
      
      // 1. students count
      fromMock.mockReturnValueOnce(createMockChain(null, 10) as any);
      // 2. debt data
      fromMock.mockReturnValueOnce(createMockChain([{ amount_vnd: 1000, paid_amount_vnd: 200 }]) as any);
      // 3. attendance today
      fromMock.mockReturnValueOnce(createMockChain([{ status: 'present', class_id: 1 }]) as any);
      // 4. students by class
      fromMock.mockReturnValueOnce(createMockChain([{ class_id: 1, classes: { name: 'Mầm 1' } }]) as any);
      // 5. classes
      fromMock.mockReturnValueOnce(createMockChain([{ id: 1, name: 'Mầm 1' }]) as any);

      const result = await getDashboardStats();

      expect(result.stats?.totalStudents).toBe(10);
      expect(result.stats?.totalDebt).toBe(800);
      expect(result.stats?.attendanceToday.present).toBe(1);
      expect(result.error).toBeNull();
    });
  });

  describe('getAttendanceTrend', () => {
    it('should return 7 days of trend data', async () => {
      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValue(createMockChain([{ attendance_date: '2024-10-10', status: 'present' }]) as any);

      const result = await getAttendanceTrend();

      expect(result.trend).toHaveLength(7);
      expect(result.error).toBeNull();
    });
  });

  describe('getFeeStatusSummary', () => {
    it('should count statuses correctly', async () => {
      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValue(createMockChain([
        { status: 'paid' },
        { status: 'unpaid' },
        { status: 'partial' },
        { status: 'paid' },
      ]) as any);

      const result = await getFeeStatusSummary();

      expect(result.summary.paid).toBe(2);
      expect(result.summary.unpaid).toBe(1);
      expect(result.summary.partial).toBe(1);
    });
  });
});
