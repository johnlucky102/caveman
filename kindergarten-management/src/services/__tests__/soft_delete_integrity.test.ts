import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listFees } from '../feesService';
import { listStudents } from '../studentsService';
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

describe('Soft Delete Integrity Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockChain = (finalResult = { data: [], count: 0, error: null }) => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue(finalResult),
      single: vi.fn().mockResolvedValue(finalResult),
      maybeSingle: vi.fn().mockResolvedValue(finalResult),
    };
    return chain;
  };

  it('listFees should always filter by del_yn=false', async () => {
    const mockChain = createMockChain();
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    await listFees({ page: 1, pageSize: 10 });

    expect(mockChain.eq).toHaveBeenCalledWith('del_yn', false);
  });

  it('listStudents should always filter by del_yn=false', async () => {
    const mockChain = createMockChain();
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    await listStudents({ page: 1, pageSize: 10 });

    expect(mockChain.eq).toHaveBeenCalledWith('del_yn', false);
  });
});
