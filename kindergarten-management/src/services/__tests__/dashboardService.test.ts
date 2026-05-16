import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFinancialSummary, getFinancialOverview, getFeeSummaryByClass } from '../dashboardService';
import { supabase } from '@/lib/supabase';
import * as serviceGuards from '../serviceGuards';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('dashboardService - Financial Updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFinancialSummary', () => {
    it('should apply filters and calculate summary correctly', async () => {
      vi.spyOn(serviceGuards, 'getCurrentUser').mockResolvedValue({ 
        userId: 'admin-1', 
        role: 'Admin', 
        error: null 
      });

      const mockData = [
        { status: 'paid', paid_amount_vnd: 1000000, due_date: '2024-01-01' },
        { status: 'unpaid', paid_amount_vnd: 0, due_date: '2024-01-01' },
      ];

      const eqMock = vi.fn().mockReturnThis();
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
        then: vi.fn().mockImplementation((cb) => cb({ data: mockData, error: null })),
      });

      const result = await getFinancialSummary(5, '2024');

      expect(eqMock).toHaveBeenCalledWith('month', 5);
      expect(eqMock).toHaveBeenCalledWith('school_year', '2024');
      expect(result.data?.totalRevenue).toBe(1000000);
      expect(result.data?.paidCount).toBe(1);
    });
  });

  describe('getFinancialOverview', () => {
    it('should return teacher, class and student counts for Admin', async () => {
      vi.spyOn(serviceGuards, 'getCurrentUser').mockResolvedValue({ 
        userId: 'admin-1', 
        role: 'Admin', 
        error: null 
      });

      // Mock multiple from calls
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn().mockImplementation((cb) => cb({ data: [{ id: '1' }, { id: '2' }], error: null })),
          };
        }
        if (table === 'classes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn().mockImplementation((cb) => cb({ data: [{ id: '1' }], error: null })),
          };
        }
        if (table === 'students') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn().mockImplementation((cb) => cb({ data: [{ id: '1' }, { id: '2' }, { id: '3' }], error: null })),
          };
        }
      });

      const result = await getFinancialOverview();

      expect(result.data?.teacherCount).toBe(2);
      expect(result.data?.activeClassCount).toBe(1);
      expect(result.data?.totalStudentCount).toBe(3);
    });

    it('should return FORBIDDEN for Teacher role', async () => {
      vi.spyOn(serviceGuards, 'getCurrentUser').mockResolvedValue({ 
        userId: 'teacher-1', 
        role: 'Teacher', 
        error: null 
      });

      const result = await getFinancialOverview();
      expect(result.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('getFeeSummaryByClass', () => {
    it('should return grouped class summaries with teacher names', async () => {
      vi.spyOn(serviceGuards, 'getCurrentUser').mockResolvedValue({ 
        userId: 'admin-1', 
        role: 'Admin', 
        error: null 
      });

      const mockData = [
        {
          amount_vnd: 2000,
          paid_amount_vnd: 1000,
          student_id: 's1',
          students: {
            class_id: 1,
            classes: {
              name: 'Class A',
              users: { full_name: 'Teacher X' }
            }
          }
        }
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((cb) => cb({ data: mockData, error: null })),
      });

      const result = await getFeeSummaryByClass();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].className).toBe('Class A');
      expect(result.data[0].totalAmount).toBe(2000);
    });
  });
});
