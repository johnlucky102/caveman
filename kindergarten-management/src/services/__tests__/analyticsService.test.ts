import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRevenueTrend, getDebtAging } from '../analyticsService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/timeout', () => ({
  withSupabaseTimeout: vi.fn((qb) => Promise.resolve(qb)),
}));

describe('analyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((cb: any) => cb({ data, error })),
  });

  describe('getRevenueTrend', () => {
    it('buckets fee rows by school_year + month calendar key', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-03-15T12:00:00.000Z'));

      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValueOnce(
        createMockChain([
          {
            month: 3,
            school_year: '2024-2025',
            paid_amount_vnd: 100_000,
            amount_vnd: 500_000,
            status: 'partial',
          },
          {
            month: 10,
            school_year: '2024-2025',
            paid_amount_vnd: 0,
            amount_vnd: 1_000_000,
            status: 'unpaid',
          },
        ]) as any
      );

      const { data, error } = await getRevenueTrend();
      expect(error).toBeNull();
      expect(data).toHaveLength(6);
      const mar = data!.find((p) => p.month === '2025-03');
      expect(mar?.revenue).toBe(100_000);
      expect(mar?.debt).toBe(400_000);
      const oct2024 = data!.find((p) => p.month === '2024-10');
      expect(oct2024?.revenue).toBe(0);
      expect(oct2024?.debt).toBe(1_000_000);
    });
  });

  describe('getDebtAging', () => {
    it('skips rows with null or invalid due_date', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-01T12:00:00.000Z'));

      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValueOnce(
        createMockChain([
          { amount_vnd: 100, paid_amount_vnd: 0, due_date: null },
          { amount_vnd: 200, paid_amount_vnd: 0, due_date: '' },
          { amount_vnd: 300, paid_amount_vnd: 0, due_date: 'not-a-date' },
        ]) as any
      );

      const { data, error } = await getDebtAging();
      expect(error).toBeNull();
      expect(data!.every((b) => b.count === 0 && b.amount === 0)).toBe(true);
    });

    it('places debt into 0-30 bucket when due_date within 30 days', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));

      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValueOnce(
        createMockChain([
          { amount_vnd: 500_000, paid_amount_vnd: 0, due_date: '2025-06-01' },
        ]) as any
      );

      const { data, error } = await getDebtAging();
      expect(error).toBeNull();
      expect(data![0].count).toBe(1);
      expect(data![0].amount).toBe(500_000);
    });
  });
});
