import { vi } from 'vitest';

/**
 * Supabase mock utilities for service layer tests
 * Provides chainable query builder that mimics Supabase client API
 */

export interface MockQueryBuilder {
  select: (columns?: string, options?: any) => MockQueryBuilder;
  eq: (column: string, value: any) => MockQueryBuilder;
  neq: (column: string, value: any) => MockQueryBuilder;
  in: (column: string, values: any[]) => MockQueryBuilder;
  ilike: (column: string, pattern: string) => MockQueryBuilder;
  gte: (column: string, value: any) => MockQueryBuilder;
  lte: (column: string, value: any) => MockQueryBuilder;
  insert: (data: any) => MockQueryBuilder;
  update: (data: any) => MockQueryBuilder;
  upsert: (data: any, options?: any) => MockQueryBuilder;
  order: (column: string, options?: any) => MockQueryBuilder;
  range: (from: number, to: number) => MockQueryBuilder;
  single: () => Promise<{ data: any; error: null }>;
  maybeSingle: () => Promise<{ data: any; error: null }>;
  then: (resolve: (value: any) => void) => Promise<any>;
}

export interface MockSupabaseClient {
  from: (table: string) => MockQueryBuilder;
  auth: {
    getUser: () => Promise<{ data: { user: any }; error: null }>;
    getSession: () => Promise<{ data: { session: any }; error: null }>;
    signInWithPassword: (credentials: any) => Promise<{ data: any; error: null }>;
    signOut: () => Promise<{ error: null }>;
  };
  rpc: (fn: string, params?: any) => Promise<{ data: any; error: null }>;
}

/**
 * Create a chainable mock query builder
 * Supports fluent API: .from().select().eq().single()
 */
export function mockQueryChain(returnData: any): MockQueryBuilder {
  const chain: Partial<MockQueryBuilder> = {
    select: vi.fn(() => chain as MockQueryBuilder),
    eq: vi.fn(() => chain as MockQueryBuilder),
    neq: vi.fn(() => chain as MockQueryBuilder),
    in: vi.fn(() => chain as MockQueryBuilder),
    ilike: vi.fn(() => chain as MockQueryBuilder),
    gte: vi.fn(() => chain as MockQueryBuilder),
    lte: vi.fn(() => chain as MockQueryBuilder),
    insert: vi.fn(() => chain as MockQueryBuilder),
    update: vi.fn(() => chain as MockQueryBuilder),
    upsert: vi.fn(() => chain as MockQueryBuilder),
    order: vi.fn(() => chain as MockQueryBuilder),
    range: vi.fn(() => chain as MockQueryBuilder),
    single: vi.fn(async () => ({ data: returnData, error: null })),
    maybeSingle: vi.fn(async () => ({ data: returnData, error: null })),
    then: vi.fn(async (resolve) => {
      const result = { data: returnData, error: null, count: Array.isArray(returnData) ? returnData.length : null };
      return resolve(result);
    }),
  };

  return chain as MockQueryBuilder;
}

/**
 * Create a mock Supabase client with chainable query builder
 * Usage:
 *   const mockClient = createMockSupabaseClient();
 *   vi.mock('@/lib/supabase', () => ({ supabase: mockClient }));
 */
export function createMockSupabaseClient(): MockSupabaseClient {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'Test User',
      role: 'Admin',
    },
  };

  const mockSession = {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  return {
    from: vi.fn((table: string) => mockQueryChain([])),
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mockUser }, error: null })),
      getSession: vi.fn(async () => ({ data: { session: mockSession }, error: null })),
      signInWithPassword: vi.fn(async () => ({ data: { session: mockSession, user: mockUser }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    rpc: vi.fn(async () => ({ data: null, error: null })),
  };
}

/**
 * Create a mock query builder that returns specific data
 * Useful for setting up specific test scenarios
 */
export function createMockQueryBuilder(returnData: any): MockQueryBuilder {
  return mockQueryChain(returnData);
}

/**
 * Mock error responses for testing error scenarios
 */
export const MOCK_ERRORS = {
  notFound: {
    code: 'PGRST116',
    message: 'No rows found',
    details: null,
    hint: null,
  },
  uniqueViolation: {
    code: '23505',
    message: 'duplicate key value violates unique constraint',
    details: 'Key (class_type, del_yn)=(Daycare, false) already exists',
    hint: null,
  },
  timeout: {
    code: 'TIMEOUT',
    message: 'Request timeout',
    details: null,
    hint: null,
  },
  unauthorized: {
    code: 'UNAUTHORIZED',
    message: 'Bạn chưa đăng nhập.',
    details: null,
    hint: null,
  },
  forbidden: {
    code: 'FORBIDDEN',
    message: 'Bạn không có quyền thực hiện thao tác này.',
    details: null,
    hint: null,
  },
};

/**
 * Create a mock query builder that returns an error
 */
export function mockQueryChainWithError(error: any): MockQueryBuilder {
  const chain: Partial<MockQueryBuilder> = {
    select: vi.fn(() => chain as MockQueryBuilder),
    eq: vi.fn(() => chain as MockQueryBuilder),
    neq: vi.fn(() => chain as MockQueryBuilder),
    in: vi.fn(() => chain as MockQueryBuilder),
    ilike: vi.fn(() => chain as MockQueryBuilder),
    gte: vi.fn(() => chain as MockQueryBuilder),
    lte: vi.fn(() => chain as MockQueryBuilder),
    insert: vi.fn(() => chain as MockQueryBuilder),
    update: vi.fn(() => chain as MockQueryBuilder),
    upsert: vi.fn(() => chain as MockQueryBuilder),
    order: vi.fn(() => chain as MockQueryBuilder),
    range: vi.fn(() => chain as MockQueryBuilder),
    single: vi.fn(async () => ({ data: null, error })),
    maybeSingle: vi.fn(async () => ({ data: null, error })),
    then: vi.fn(async (resolve) => {
      const result = { data: null, error, count: null };
      return resolve(result);
    }),
  };

  return chain as MockQueryBuilder;
}
