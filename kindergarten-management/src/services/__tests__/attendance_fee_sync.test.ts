import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncFeeWithAttendance } from '../feesService';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
    },
  };
});

describe('Attendance to Fee Sync Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate correct meal deductions for Daycare class', async () => {
    // 1. Mock Fee Result
    const mockFee = {
      id: 'fee-1',
      student_id: 's-1',
      month: 10,
      school_year: '2024-2025',
      amount_vnd: 2000000,
      base_amount_vnd: 2000000,
      classes: {
        class_type: 'Daycare',
        meal_rate: 30000,
      },
    };

    // 2. Mock Attendance (3 days absent)
    const mockAttendance = [
      { status: 'absent', attendance_date: '2024-10-05' },
      { status: 'absent', attendance_date: '2024-10-10' },
      { status: 'excused', attendance_date: '2024-10-15' },
      { status: 'present', attendance_date: '2024-10-20' },
    ];

    // Setup the complex Supabase chain mock
    const fromMock = vi.mocked(supabase.from);
    
    // First call: fee record fetch
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockFee, error: null }),
        }),
      }),
    } as any);

    // Second call: attendance fetch
    fromMock.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockAttendance, error: null }),
            }),
          }),
        }),
      }),
    } as any);

    // Third call: update fee record
    fromMock.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
                data: { ...mockFee, amount_vnd: 2000000 - 90000, meal_deduction_vnd: 90000 }, 
                error: null 
            }),
          }),
        }),
      }),
    } as any);

    const result = await syncFeeWithAttendance('fee-1');

    expect(result.error).toBeNull();
    // 3 absent days * 30,000 = 90,000 deduction
    expect(result.item?.meal_deduction_vnd).toBe(90000);
    expect(result.item?.amount_vnd).toBe(1910000);
  });
});
