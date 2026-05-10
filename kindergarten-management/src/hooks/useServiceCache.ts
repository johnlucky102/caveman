/**
 * useServiceCache — Lightweight SWR-style cache for service function calls.
 *
 * Prevents redundant DB round-trips when the same data is requested multiple times
 * within a short window (e.g. navigating back to Dashboard, component re-mounts).
 *
 * Usage:
 *   const { data, loading, error, refetch } = useServiceCache(
 *     'dashboard-stats',
 *     () => getDashboardStats(),
 *     { staleTime: 60_000 }  // cache for 60 seconds
 *   );
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── In-memory cache shared across all hook instances ─────────────────────────
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/** Invalidate all cache entries whose key starts with a given prefix */
export function invalidateCache(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/** Invalidate one exact cache key */
export function invalidateCacheKey(key: string): void {
  cache.delete(key);
}

/** Clear the entire cache (e.g. on logout) */
export function clearAllCache(): void {
  cache.clear();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
interface UseServiceCacheOptions {
  /** How long (ms) the cached data is considered fresh. Default: 30 000ms */
  staleTime?: number;
  /** If false, the fetch will not run (useful for conditional fetching). Default: true */
  enabled?: boolean;
}

interface UseServiceCacheResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** Force a fresh fetch, bypassing the cache */
  refetch: () => void;
}

export function useServiceCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseServiceCacheOptions = {}
): UseServiceCacheResult<T> {
  const { staleTime = 30_000, enabled = true } = options;

  const [data, setData] = useState<T | null>(() => {
    // Hydrate from cache synchronously on first render
    const entry = cache.get(key) as CacheEntry<T> | undefined;
    if (entry && Date.now() - entry.timestamp < staleTime) {
      return entry.data;
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Keep a stable ref to the fetcher to avoid stale closures
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) return;

    const cached = cache.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < staleTime && refreshTick === 0) {
      setData(cached.data);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcherRef
      .current()
      .then((result) => {
        if (cancelled) return;
        cache.set(key, { data: result, timestamp: Date.now() });
        setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // refreshTick intentionally triggers a re-fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, staleTime, enabled, refreshTick]);

  const refetch = useCallback(() => {
    invalidateCacheKey(key);
    setRefreshTick((t) => t + 1);
  }, [key]);

  return { data, loading, error, refetch };
}
