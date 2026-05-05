import { describe, expect, it } from 'vitest';
import { withSupabaseTimeout, withTimeout } from './timeout';

describe('timeout helpers', () => {
  it('returns resolved value before timeout', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 100, 'fallback')).resolves.toBe('ok');
  });

  it('returns fallback when promise rejects', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 100, 'fallback')).resolves.toBe('fallback');
  });

  it('returns fallback when supabase query rejects', async () => {
    const fallback = { data: null, error: { message: 'fallback' } };
    const query = Promise.reject(new Error('query failed'));

    await expect(withSupabaseTimeout(query, 100, fallback)).resolves.toBe(fallback);
  });

  it('returns fallback when supabase query times out', async () => {
    const fallback = { data: null, error: { message: 'timeout' } };
    const query = new Promise(() => {});

    await expect(withSupabaseTimeout(query, 1, fallback)).resolves.toBe(fallback);
  });
});
