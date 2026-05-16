import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOverdueStudents } from '../analyticsService';
import { supabase } from '@/lib/supabase';
import { withSupabaseTimeout } from '@/lib/timeout';

// Mock Supabase and Timeout
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/timeout', () => ({
  withSupabaseTimeout: vi.fn(),
}));

describe('analyticsService - getOverdueStudents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate daysOverdue correctly for unpaid records', async () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const dueDateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const mockData = [
      {
        id: '1',
        student_id: 'std-1',
        amount_vnd: 1000000,
        paid_amount_vnd: 0,
        due_date: dueDateStr,
        students: {
          full_name: 'Nguyen Van A',
          classes: {
            name: 'Lớp Lá 1',
            users: { full_name: 'Co Giao Thao' }
          }
        }
      }
    ];

    (withSupabaseTimeout as any).mockResolvedValue({ data: mockData, error: null });
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
    });

    const result = await getOverdueStudents();

    expect(result.data).toHaveLength(1);
    expect(result.data[0].daysOverdue).toBe(30);
    expect(result.data[0].studentName).toBe('Nguyen Van A');
  });

  it('should filter out students who have paid in full', async () => {
    const mockData = [
      {
        id: '1',
        student_id: 'std-1',
        amount_vnd: 1000000,
        paid_amount_vnd: 1000000, // Fully paid
        due_date: '2024-01-01',
        students: { full_name: 'A' }
      }
    ];

    (withSupabaseTimeout as any).mockResolvedValue({ data: mockData, error: null });
    
    const result = await getOverdueStudents();
    expect(result.data).toHaveLength(0);
  });

  it('should sort by daysOverdue descending', async () => {
    const today = new Date();
    const tenDaysAgo = new Date(today);
    tenDaysAgo.setDate(today.getDate() - 10);
    const twentyDaysAgo = new Date(today);
    twentyDaysAgo.setDate(today.getDate() - 20);

    const mockData = [
      {
        id: '1',
        student_id: 'std-1',
        amount_vnd: 100,
        paid_amount_vnd: 0,
        due_date: tenDaysAgo.toISOString().split('T')[0],
        students: { full_name: 'TenDays' }
      },
      {
        id: '2',
        student_id: 'std-2',
        amount_vnd: 100,
        paid_amount_vnd: 0,
        due_date: twentyDaysAgo.toISOString().split('T')[0],
        students: { full_name: 'TwentyDays' }
      }
    ];

    (withSupabaseTimeout as any).mockResolvedValue({ data: mockData, error: null });
    
    const result = await getOverdueStudents();
    expect(result.data).toHaveLength(2);
    expect(result.data[0].studentName).toBe('TwentyDays'); // Older debt first
  });

  it('should apply month and schoolYear filters correctly', async () => {
    const fromMock = vi.mocked(supabase.from);
    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const inMock = vi.fn().mockReturnThis();
    const notMock = vi.fn().mockReturnThis();

    fromMock.mockReturnValue({
      select: selectMock,
      eq: eqMock,
      in: inMock,
      not: notMock,
    } as any);

    (withSupabaseTimeout as any).mockResolvedValue({ data: [], error: null });

    await getOverdueStudents(5, '2024-2025');

    expect(eqMock).toHaveBeenCalledWith('month', 5);
    expect(eqMock).toHaveBeenCalledWith('school_year', '2024-2025');
  });
});
