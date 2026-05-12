import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listStudents, getStudentById, deleteStudent, deleteStudents } from '../studentsService';
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

describe('Comprehensive Soft Delete & Bulk Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockChain = (finalResult = { data: [], count: 0, error: null }) => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue(finalResult),
      single: vi.fn().mockResolvedValue(finalResult),
      maybeSingle: vi.fn().mockResolvedValue(finalResult),
    };
    return chain;
  };

  it('TC01: listStudents should filter by del_yn=false', async () => {
    const mockChain = createMockChain();
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    await listStudents({ page: 1, pageSize: 10 });

    expect(supabase.from).toHaveBeenCalledWith('students');
    expect(mockChain.eq).toHaveBeenCalledWith('del_yn', false);
  });

  it('TC02: getStudentById should filter by del_yn=false', async () => {
    const mockChain = createMockChain();
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    await getStudentById('test-id');

    expect(supabase.from).toHaveBeenCalledWith('students');
    expect(mockChain.eq).toHaveBeenCalledWith('del_yn', false);
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'test-id');
  });

  it('TC03: deleteStudent should perform soft-delete and cascade', async () => {
    const mockChain = createMockChain({ data: null, count: 0, error: null } as any);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    // Mock ensureRole to pass
    vi.mock('../serviceGuards', () => ({
      ensureRole: vi.fn().mockResolvedValue({ error: null }),
      ensureStudentOwnership: vi.fn().mockResolvedValue({ error: null })
    }));

    await deleteStudent('test-id');

    // Check cascade soft deletes
    expect(supabase.from).toHaveBeenCalledWith('attendance');
    expect(supabase.from).toHaveBeenCalledWith('fee_records');
    expect(supabase.from).toHaveBeenCalledWith('notifications');
    
    // Check main student delete
    expect(supabase.from).toHaveBeenCalledWith('students');
    expect(mockChain.update).toHaveBeenCalledWith({ del_yn: true });
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'test-id');
  });

  it('TC04: deleteStudents (Bulk) should perform soft-delete for list and cascade', async () => {
    const mockChain = createMockChain({ data: null, count: 0, error: null } as any);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const ids = ['id1', 'id2', 'id3'];
    await deleteStudents(ids);

    // Check cascade
    expect(supabase.from).toHaveBeenCalledWith('attendance');
    expect(mockChain.in).toHaveBeenCalledWith('student_id', ids);
    
    // Check main bulk delete
    expect(supabase.from).toHaveBeenCalledWith('students');
    expect(mockChain.update).toHaveBeenCalledWith({ del_yn: true });
    expect(mockChain.in).toHaveBeenCalledWith('id', ids);
  });
});
