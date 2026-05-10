import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listNotifications, createNotification, markAsRead } from '../notificationsService';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      single: vi.fn(),
      in: vi.fn().mockReturnThis(),
      then: vi.fn(),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    }
  },
}));

// Mock Timeout utility
vi.mock('@/lib/timeout', () => ({
  withSupabaseTimeout: vi.fn((promise) => promise),
}));

describe('notificationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockChain = (data: any, count: number | null = null, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error }),
    single: vi.fn().mockResolvedValue({ data, error }),
    in: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((cb) => cb({ data, count, error })),
  });

  describe('listNotifications', () => {
    it('should return notifications with read status', async () => {
      const mockNotifs = [{ id: 'n1', title: 'T1', body: 'B1', kind: 'general' }];
      const mockReads = [{ notification_id: 'n1' }];

      const fromMock = vi.mocked(supabase.from);
      // 1. Notifications query
      fromMock.mockReturnValueOnce(createMockChain(mockNotifs, 1) as any);
      // 2. Read status query
      fromMock.mockReturnValueOnce(createMockChain(mockReads) as any);

      const result = await listNotifications({ page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].is_read).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('createNotification', () => {
    it('should create notification and return mapped item', async () => {
      const mockNotif = { id: 'n1', title: 'T1', body: 'B1', kind: 'general', created_at: '2024' };
      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValue(createMockChain(mockNotif) as any);

      const result = await createNotification({ title: 'T1', body: 'B1', kind: 'general' });

      expect(result.item?.title).toBe('T1');
      expect(result.error).toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('should upsert read status', async () => {
      const fromMock = vi.mocked(supabase.from);
      const upsertChain = createMockChain(null);
      fromMock.mockReturnValue(upsertChain as any);

      await markAsRead('n1');

      expect(upsertChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ notification_id: 'n1', user_id: 'u1' }),
        expect.any(Object)
      );
    });
  });
});
