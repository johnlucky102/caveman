import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listAttendanceByClassAndDate, upsertAttendanceBulk, listAttendanceHistory } from '../attendanceService';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      single: vi.fn(),
      then: vi.fn(),
    })),
  },
}));

// Mock Timeout utility
vi.mock('@/lib/timeout', () => ({
  withSupabaseTimeout: vi.fn((promise) => promise),
}));

describe('attendanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error }),
    then: vi.fn().mockImplementation((cb) => cb({ data, error })),
  });

  describe('listAttendanceByClassAndDate', () => {
    it('should return combined student and attendance data', async () => {
      const mockStudents = [
        { id: 's1', full_name: 'Student A', class_id: 1, classes: { id: 1, name: 'Class 1' } },
        { id: 's2', full_name: 'Student B', class_id: 1, classes: { id: 1, name: 'Class 1' } },
      ];
      const mockAttendance = [
        { id: 'a1', student_id: 's1', status: 'present', meal_included: true },
      ];

      const fromMock = vi.mocked(supabase.from);
      // 1. Students list
      fromMock.mockReturnValueOnce(createMockChain(mockStudents) as any);
      // 2. Attendance list
      fromMock.mockReturnValueOnce(createMockChain(mockAttendance) as any);

      const result = await listAttendanceByClassAndDate({ classId: 1, attendanceDate: '2024-10-10' });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].student_id).toBe('s1');
      expect(result.items[0].status).toBe('present');
      expect(result.items[1].student_id).toBe('s2');
      expect(result.items[1].status).toBe('absent'); // Default
      expect(result.error).toBeNull();
    });
  });

  describe('upsertAttendanceBulk', () => {
    it('should call upsert with correct payload', async () => {
      const fromMock = vi.mocked(supabase.from);
      const upsertChain = createMockChain(null);
      fromMock.mockReturnValue(upsertChain as any);

      const input = [
        { student_id: 's1', class_id: 1, attendance_date: '2024-10-10', status: 'present' as any }
      ];

      const result = await upsertAttendanceBulk(input);

      expect(upsertChain.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ student_id: 's1', status: 'present' })
        ]),
        expect.objectContaining({ onConflict: 'student_id,attendance_date' })
      );
      expect(result.error).toBeNull();
    });
  });

  describe('listAttendanceHistory', () => {
    it('should list history with filters', async () => {
      const mockRows = [
        {
          id: 'a1',
          student_id: 's1',
          attendance_date: '2024-10-10',
          status: 'present',
          students: { full_name: 'Student A', classes: { name: 'Class 1' } }
        }
      ];

      const fromMock = vi.mocked(supabase.from);
      const historyChain = createMockChain(mockRows);
      fromMock.mockReturnValue(historyChain as any);

      const result = await listAttendanceHistory(1, 's1', '2024-10-01', '2024-10-31');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].student_name).toBe('Student A');
      expect(historyChain.eq).toHaveBeenCalledWith('class_id', 1);
      expect(historyChain.eq).toHaveBeenCalledWith('student_id', 's1');
      expect(historyChain.gte).toHaveBeenCalledWith('attendance_date', '2024-10-01');
      expect(historyChain.lte).toHaveBeenCalledWith('attendance_date', '2024-10-31');
    });
  });
});
