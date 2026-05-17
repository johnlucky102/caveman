import { describe, it, expect, vi } from 'vitest';
import {
  createMockSupabaseClient,
  mockQueryChain,
  mockQueryChainWithError,
  MOCK_ERRORS,
} from './supabaseMocks';

describe('supabaseMocks', () => {
  describe('createMockSupabaseClient', () => {
    it('creates client with from method', () => {
      const client = createMockSupabaseClient();
      expect(client.from).toBeDefined();
      expect(vi.isMockFunction(client.from)).toBe(true);
    });

    it('creates client with auth methods', () => {
      const client = createMockSupabaseClient();
      expect(client.auth.getUser).toBeDefined();
      expect(client.auth.getSession).toBeDefined();
      expect(vi.isMockFunction(client.auth.getUser)).toBe(true);
    });

    it('auth.getUser returns mock user', async () => {
      const client = createMockSupabaseClient();
      const result = await client.auth.getUser();
      expect(result.data.user).toBeDefined();
      expect(result.data.user.email).toBe('test@example.com');
      expect(result.error).toBeNull();
    });
  });

  describe('mockQueryChain', () => {
    it('supports chainable select().eq().single()', async () => {
      const mockData = { id: 1, name: 'Test' };
      const chain = mockQueryChain(mockData);

      const result = await chain.select('*').eq('id', 1).single();

      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
      expect(vi.isMockFunction(chain.select)).toBe(true);
      expect(vi.isMockFunction(chain.eq)).toBe(true);
    });

    it('supports chainable select().eq().maybeSingle()', async () => {
      const mockData = { id: 1, class_type: 'Daycare' };
      const chain = mockQueryChain(mockData);

      const result = await chain
        .select('*')
        .eq('class_type', 'Daycare')
        .eq('del_yn', false)
        .maybeSingle();

      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });

    it('supports insert().select().single()', async () => {
      const mockData = { id: 1, class_type: 'Evening' };
      const chain = mockQueryChain(mockData);

      const result = await chain
        .insert({ class_type: 'Evening' })
        .select('*')
        .single();

      expect(result.data).toEqual(mockData);
      expect(vi.isMockFunction(chain.insert)).toBe(true);
    });

    it('supports update().eq().select().single()', async () => {
      const mockData = { id: 1, class_type: 'Daycare', updated: true };
      const chain = mockQueryChain(mockData);

      const result = await chain
        .update({ updated: true })
        .eq('class_type', 'Daycare')
        .select('*')
        .single();

      expect(result.data).toEqual(mockData);
      expect(vi.isMockFunction(chain.update)).toBe(true);
    });

    it('supports upsert with options', async () => {
      const mockData = { id: 1, class_type: 'Daycare' };
      const chain = mockQueryChain(mockData);

      const result = await chain
        .upsert({ class_type: 'Daycare' }, { onConflict: 'class_type' })
        .select('*')
        .single();

      expect(result.data).toEqual(mockData);
      expect(vi.isMockFunction(chain.upsert)).toBe(true);
    });

    it('supports order and range for pagination', async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      const chain = mockQueryChain(mockData);

      const result = await chain
        .select('*')
        .order('id', { ascending: true })
        .range(0, 9);

      expect(result.data).toEqual(mockData);
      expect(vi.isMockFunction(chain.order)).toBe(true);
      expect(vi.isMockFunction(chain.range)).toBe(true);
    });

    it('supports ilike for search', async () => {
      const mockData = [{ name: 'Daycare' }];
      const chain = mockQueryChain(mockData);

      const result = await chain
        .select('*')
        .ilike('class_type', '%Day%');

      expect(result.data).toEqual(mockData);
      expect(vi.isMockFunction(chain.ilike)).toBe(true);
    });

    it('supports in for multiple values', async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      const chain = mockQueryChain(mockData);

      const result = await chain
        .select('*')
        .in('id', [1, 2]);

      expect(result.data).toEqual(mockData);
      expect(vi.isMockFunction(chain.in)).toBe(true);
    });

    it('supports gte and lte for date ranges', async () => {
      const mockData = [{ date: '2024-01-15' }];
      const chain = mockQueryChain(mockData);

      const result = await chain
        .select('*')
        .gte('date', '2024-01-01')
        .lte('date', '2024-01-31');

      expect(result.data).toEqual(mockData);
      expect(vi.isMockFunction(chain.gte)).toBe(true);
      expect(vi.isMockFunction(chain.lte)).toBe(true);
    });
  });

  describe('mockQueryChainWithError', () => {
    it('returns error from single()', async () => {
      const chain = mockQueryChainWithError(MOCK_ERRORS.notFound);

      const result = await chain.select('*').eq('id', 999).single();

      expect(result.data).toBeNull();
      expect(result.error).toEqual(MOCK_ERRORS.notFound);
    });

    it('returns error from maybeSingle()', async () => {
      const chain = mockQueryChainWithError(MOCK_ERRORS.timeout);

      const result = await chain.select('*').maybeSingle();

      expect(result.data).toBeNull();
      expect(result.error).toEqual(MOCK_ERRORS.timeout);
    });
  });

  describe('MOCK_ERRORS', () => {
    it('provides notFound error', () => {
      expect(MOCK_ERRORS.notFound.code).toBe('PGRST116');
      expect(MOCK_ERRORS.notFound.message).toBe('No rows found');
    });

    it('provides uniqueViolation error', () => {
      expect(MOCK_ERRORS.uniqueViolation.code).toBe('23505');
      expect(MOCK_ERRORS.uniqueViolation.message).toContain('unique constraint');
    });

    it('provides timeout error', () => {
      expect(MOCK_ERRORS.timeout.code).toBe('TIMEOUT');
    });

    it('provides unauthorized error', () => {
      expect(MOCK_ERRORS.unauthorized.code).toBe('UNAUTHORIZED');
    });

    it('provides forbidden error', () => {
      expect(MOCK_ERRORS.forbidden.code).toBe('FORBIDDEN');
    });
  });
});
