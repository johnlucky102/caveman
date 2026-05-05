/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within the timeout,
 * returns the fallback value instead.
 * 
 * IMPORTANT: Pass the actual Promise (after awaiting the query builder), not the builder itself.
 * Example: withTimeout(statement.range(from, to), 8000, fallback)
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

/**
 * Wraps a Supabase query with timeout. Returns fallback if query doesn't complete in time
 * or if the query rejects.
 * Use this for Supabase query builders that need timeout protection.
 */
export async function withSupabaseTimeout<T>(
  queryBuilder: { then: (onfulfilled: (value: T) => void) => void },
  timeoutMs: number,
  fallback: T
): Promise<T> {
  return Promise.race([
    Promise.resolve(queryBuilder).catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}
