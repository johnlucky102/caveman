/**
 * SW Cache Invalidation Utilities
 * 
 * Clears the Service Worker API cache for specific Supabase tables
 * after successful write operations (create, update, delete).
 * 
 * Usage example — after saving attendance:
 *   await upsertAttendanceBulk(rows);
 *   invalidateSwCache(['attendance']);
 * 
 * This ensures the next read fetches fresh data instead of
 * returning a stale SW-cached API response.
 */

const SW_API_CACHE = 'kidgarden-v1-api';

/**
 * Removes all cached Supabase API responses whose URL contains
 * any of the provided table name strings.
 */
export async function invalidateSwCache(tableNames: string[]): Promise<void> {
  if (!('caches' in window)) return;

  try {
    const cache = await caches.open(SW_API_CACHE);
    const keys = await cache.keys();

    const toDelete = keys.filter((request) =>
      tableNames.some((table) => request.url.includes(`/rest/v1/${table}`))
    );

    await Promise.all(toDelete.map((req) => cache.delete(req)));

    if (toDelete.length > 0) {
      console.debug(`[SW] Invalidated ${toDelete.length} cached entries for:`, tableNames);
    }
  } catch (err) {
    // Non-critical — silently ignore if cache API unavailable
    console.debug('[SW] Cache invalidation skipped:', err);
  }
}

/**
 * Invalidates all entries in the API cache.
 * Use after bulk operations or logout.
 */
export async function invalidateAllSwCache(): Promise<void> {
  if (!('caches' in window)) return;
  try {
    await caches.delete(SW_API_CACHE);
    console.debug('[SW] Full API cache cleared');
  } catch (err) {
    console.debug('[SW] Full cache clear skipped:', err);
  }
}
