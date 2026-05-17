import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listClasses, getClassById, updateClass, deleteClass } from '../classesService';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-admin' } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      in: vi.fn().mockReturnThis(),
      then: vi.fn(),
    })),
  },
}));

// Mock Timeout utility
vi.mock('@/lib/timeout', () => ({
  withSupabaseTimeout: vi.fn((promise) => promise),
}));

describe('classesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockChain = (data: any, count: number | null = null, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    in: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((cb) => cb({ data, count, error })),
  });

  describe('listClasses', () => {
    it('should return classes with student counts', async () => {
      const mockClasses = [{ id: 1, name: 'Mầm 1' }];
      const mockStudents = [{ class_id: 1 }]; // 1 student in class 1

      const fromMock = vi.mocked(supabase.from);
      // 1. Classes query
      fromMock.mockReturnValueOnce(createMockChain(mockClasses, 1) as any);
      // 2. Student counts query
      fromMock.mockReturnValueOnce(createMockChain(mockStudents) as any);

      const result = await listClasses({ page: 1, pageSize: 10 });

      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].student_count).toBe(1);
      expect(result.error).toBeNull();
    });
  });

  describe('updateClass', () => {
    it('should fail if max_students is less than current student count', async () => {
      const mockStudents = [{ class_id: 1 }, { class_id: 1 }]; // 2 students

      const fromMock = vi.mocked(supabase.from);
      // 1. users RBAC check (ensureClassOwnership)
      fromMock.mockReturnValueOnce(createMockChain({ role: 'Admin' }) as any);
      // 2. students count check
      fromMock.mockReturnValueOnce(createMockChain(mockStudents) as any);

      const result = await updateClass(1, { max_students: 1 });

      expect(result.error?.code).toBe('VALIDATION');
      expect(result.error?.message).toContain('không được nhỏ hơn số học sinh hiện tại (2)');
    });
  });

  describe('deleteClass', () => {
    it('should fail if class has students', async () => {
      const mockStudents = [{ class_id: 1 }];

      const fromMock = vi.mocked(supabase.from);
      // 1. users RBAC check (ensureRole)
      fromMock.mockReturnValueOnce(createMockChain({ role: 'Admin' }) as any);
      // 2. students count check
      fromMock.mockReturnValueOnce(createMockChain(mockStudents) as any);

      const result = await deleteClass(1);

      expect(result.error?.code).toBe('VALIDATION');
      expect(result.error?.message).toBe('Không thể xóa lớp đang có học sinh.');
    });

    it('should soft delete class if empty', async () => {
      const fromMock = vi.mocked(supabase.from);
      // 1. users RBAC check (ensureRole)
      fromMock.mockReturnValueOnce(createMockChain({ role: 'Admin' }) as any);
      // 2. Student count check (empty)
      fromMock.mockReturnValueOnce(createMockChain([]) as any);
      // 3. Delete operation
      const deleteChain = createMockChain(null);
      fromMock.mockReturnValueOnce(deleteChain as any);

      const result = await deleteClass(1);

      expect(deleteChain.update).toHaveBeenCalledWith({ del_yn: true });
      expect(result.error).toBeNull();
    });
  });
});
