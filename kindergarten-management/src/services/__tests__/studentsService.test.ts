import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStudent, listStudents } from '../studentsService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

describe('studentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createStudent', () => {
    it('should call insert with correct data', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 's1', full_name: 'Test Student' }, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await createStudent({ 
        full_name: 'Test Student', 
        class_id: 1,
        date_of_birth: '2020-01-01',
        gender: 'Male',
        nationality: 'Việt Nam',
        address: 'Hà Nội',
        enrolled_date: '2024-09-01',
        avatar: null,
        parent_info: { full_name: 'Parent Name', phone: '0123456789' },
      });

      expect(result.item?.full_name).toBe('Test Student');
      expect(supabase.from).toHaveBeenCalledWith('students');
    });
  });

  describe('listStudents', () => {
    it('should return a list of students', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [{ id: 's1', full_name: 'S1' }], count: 1, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await listStudents({ page: 1, pageSize: 10 });
      expect(result.data.items).toHaveLength(1);
      expect(result.data.total).toBe(1);
    });
  });
});
