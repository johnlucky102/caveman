import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertAttendanceBulk, listAttendanceByClassAndDate } from '../attendanceService';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      upsert: vi.fn(),
    })),
  },
}));

// Mock invalidateSwCache
vi.mock('@/utils/swCacheInvalidate', () => ({
  invalidateSwCache: vi.fn(),
}));

// Mock serviceGuards
vi.mock('../serviceGuards', () => ({
  ensureClassOwnership: vi.fn().mockResolvedValue({ error: null }),
}));

describe('attendanceService Logic Guard Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('upsertAttendanceBulk', () => {
    it('should force meal_included to false if student is absent', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
      (supabase.from as any).mockReturnValue({ upsert: mockUpsert });

      const input = [
        {
          student_id: 'std1',
          class_id: 1,
          attendance_date: '2024-05-10',
          status: 'absent' as const,
          meal_included: true,
          created_by: 'user1'
        },
        {
          student_id: 'std2',
          class_id: 1,
          attendance_date: '2024-05-10',
          status: 'present' as const,
          meal_included: true,
          created_by: 'user1'
        }
      ];

      await upsertAttendanceBulk(input);

      const payload = mockUpsert.mock.calls[0][0];
      expect(payload[0].meal_included).toBe(false);
      expect(payload[1].meal_included).toBe(true);
    });
  });

  describe('Security: listAttendanceByClassAndDate', () => {
    it('should return FORBIDDEN if teacherId is provided but class is not managed by them', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
      });

      const result = await listAttendanceByClassAndDate({
        classId: 999,
        attendanceDate: '2024-05-10',
        teacherId: 'teacher-evil'
      });

      expect(result.error?.code).toBe('FORBIDDEN');
      expect(result.items).toHaveLength(0);
    });
  });
});
