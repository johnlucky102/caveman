import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateClass } from '../classesService';
import { updateStudent, createStudent } from '../studentsService';
import { upsertAttendanceBulk } from '../attendanceService';
import { createClassFees } from '../feesService';
import { supabase } from '@/lib/supabase';

// Mock Supabase with a more robust chainable builder
const createMockBuilder = (data: any, error: any = null) => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    // Handle the .then() used by Supabase client
    then: vi.fn().mockImplementation((cb) => Promise.resolve(cb({ data, error }))),
  };
  return builder;
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('@/lib/timeout', () => ({
  withSupabaseTimeout: vi.fn(async (query) => query),
}));

describe('Security & Permission Controls (Post-Hardening)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupContext = (userId: string, role: string, hasOwnership: boolean = true) => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: userId } } } as any);
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') return createMockBuilder({ role });
      
      if (table === 'classes') {
        // For ownership check, we return data only if hasOwnership is true
        // In the real app, .eq('teacher_id', userId) would filter this out
        return createMockBuilder(hasOwnership ? { id: 1, teacher_id: userId } : null);
      }
      
      if (table === 'class_teachers') {
        return createMockBuilder(hasOwnership ? { class_id: 1 } : null);
      }
      
      if (table === 'students') {
        // When checking student ownership, we need to return a class_id
        return createMockBuilder([{ id: 'std-1', class_id: 1 }]);
      }

      if (table === 'fee_records') {
          return createMockBuilder({ status: 'unpaid' });
      }
      
      return createMockBuilder([]);
    });
  };

  describe('Financial Controls', () => {
    it('Teacher should REJECT financial updates in classes', async () => {
      setupContext('teacher-1', 'Teacher');
      const result = await updateClass(1, { meal_rate: 50000 } as any);
      expect(result.error?.code).toBe('FORBIDDEN');
    });

    it('Teacher should REJECT bulk fee creation', async () => {
      setupContext('teacher-1', 'Teacher');
      const result = await createClassFees(1, 10, '2024-2025', 'Tuition', 3000000);
      expect(result.error?.code).toBe('FORBIDDEN');
    });

    it('Admin should ALLOW financial updates', async () => {
      setupContext('admin-1', 'Admin');
      const result = await updateClass(1, { meal_rate: 50000 } as any);
      expect(result.error).toBeNull();
    });
  });

  describe('Ownership Isolation', () => {
    it('Teacher should REJECT update for a class they do not manage', async () => {
      setupContext('teacher-1', 'Teacher', false); // No ownership
      const result = await updateClass(2, { name: 'New Name' });
      expect(result.error?.code).toBe('FORBIDDEN');
      expect(result.error?.message).toContain('quản lý lớp học này');
    });

    it('Teacher should REJECT student update in other class', async () => {
      setupContext('teacher-1', 'Teacher', false); // Student's class is NOT owned
      const result = await updateStudent('std-1', { full_name: 'New Name' });
      expect(result.error?.code).toBe('FORBIDDEN');
    });

    it('Teacher should REJECT bulk attendance for other class', async () => {
      setupContext('teacher-1', 'Teacher', false);
      const result = await upsertAttendanceBulk([{ class_id: 2, student_id: 's1', attendance_date: '2026-01-01', status: 'present' }]);
      expect(result.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('Role-based Mutation Restrictions', () => {
    it('Teacher should REJECT student creation', async () => {
      setupContext('teacher-1', 'Teacher');
      const result = await createStudent({ full_name: 'New Student', class_id: 1 } as any);
      expect(result.error?.code).toBe('FORBIDDEN');
    });

    it('Admin should ALLOW student creation', async () => {
      setupContext('admin-1', 'Admin');
      const result = await createStudent({ full_name: 'New Student', class_id: 1 } as any);
      expect(result.error).toBeNull();
    });
  });
});
