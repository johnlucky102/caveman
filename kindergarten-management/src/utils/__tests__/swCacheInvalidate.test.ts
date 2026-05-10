import { describe, expect, it, vi, beforeEach } from 'vitest';
import { invalidateSwCache, invalidateAllSwCache } from '../swCacheInvalidate';

describe('Service Worker Cache Invalidation', () => {
  const mockCache = {
    keys: vi.fn(),
    delete: vi.fn(),
  };

  const mockCaches = {
    open: vi.fn().mockResolvedValue(mockCache),
    delete: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup global caches mock
    vi.stubGlobal('caches', mockCaches);
  });

  it('invalidateSwCache deletes specific table entries', async () => {
    const mockRequests = [
      { url: 'https://api.supabase.co/rest/v1/students?id=1' },
      { url: 'https://api.supabase.co/rest/v1/attendance?date=2024-01-01' },
      { url: 'https://api.supabase.co/rest/v1/classes' },
    ];
    
    mockCache.keys.mockResolvedValue(mockRequests);

    await invalidateSwCache(['students', 'attendance']);

    expect(mockCaches.open).toHaveBeenCalledWith('kidgarden-v1-api');
    // Should delete student and attendance requests
    expect(mockCache.delete).toHaveBeenCalledTimes(2);
    expect(mockCache.delete).toHaveBeenCalledWith(mockRequests[0]);
    expect(mockCache.delete).toHaveBeenCalledWith(mockRequests[1]);
    // Should NOT delete classes
    expect(mockCache.delete).not.toHaveBeenCalledWith(mockRequests[2]);
  });

  it('invalidateAllSwCache deletes the entire API cache bucket', async () => {
    await invalidateAllSwCache();
    expect(mockCaches.delete).toHaveBeenCalledWith('kidgarden-v1-api');
  });

  it('gracefully handles missing caches API', async () => {
    vi.stubGlobal('caches', undefined);
    // Should not throw
    await expect(invalidateSwCache(['students'])).resolves.not.toThrow();
  });
});
