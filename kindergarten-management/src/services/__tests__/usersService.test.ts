import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTeacherProfile } from '../usersService';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('usersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTeacherProfile', () => {
    it('should invoke edge function correctly', async () => {
      const invokeMock = vi.mocked(supabase.functions.invoke);
      invokeMock.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });

      const result = await createTeacherProfile({ 
        email: 't@e.com', 
        full_name: 'Teacher T', 
        phone: '123',
        avatar: null
      });

      expect(result.error).toBeNull();
      expect(invokeMock).toHaveBeenCalledWith('create-user', expect.anything());
    });
  });
});
