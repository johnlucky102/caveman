/**
 * Example usage of Supabase mock utilities
 * 
 * This file demonstrates how to use the mock utilities in service tests.
 * Copy patterns from here into actual test files.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient, mockQueryChain, MOCK_ERRORS } from './supabaseMocks';
import { TEST_FINANCE_CONFIGS } from './mockFactories';

// Example 1: Mock entire Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: createMockSupabaseClient(),
}));

describe('Example: Service with Supabase mock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('example: query by class_type', async () => {
    // Import after mock is set up
    const { supabase } = await import('@/lib/supabase');

    // Set up specific return data for this test
    const mockChain = mockQueryChain(TEST_FINANCE_CONFIGS.daycare);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    // Execute query
    const result = await supabase
      .from('class_finance_configs')
      .select('*')
      .eq('class_type', 'Daycare')
      .eq('del_yn', false)
      .maybeSingle();

    // Verify
    expect(result.data).toEqual(TEST_FINANCE_CONFIGS.daycare);
    expect(supabase.from).toHaveBeenCalledWith('class_finance_configs');
    expect(mockChain.eq).toHaveBeenCalledWith('class_type', 'Daycare');
  });

  it('example: insert with upsert', async () => {
    const { supabase } = await import('@/lib/supabase');

    const mockData = { id: 1, class_type: 'Evening' };
    const mockChain = mockQueryChain(mockData);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const result = await supabase
      .from('class_finance_configs')
      .upsert(
        { class_type: 'Evening', deduction_rules: [] },
        { onConflict: 'class_type' }
      )
      .select('*')
      .single();

    expect(result.data).toEqual(mockData);
    expect(mockChain.upsert).toHaveBeenCalled();
  });

  it('example: update by class_type', async () => {
    const { supabase } = await import('@/lib/supabase');

    const mockData = { id: 1, class_type: 'Daycare', updated: true };
    const mockChain = mockQueryChain(mockData);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const result = await supabase
      .from('class_finance_configs')
      .update({ deduction_rules: [] })
      .eq('class_type', 'Daycare')
      .eq('del_yn', false)
      .select('*')
      .single();

    expect(result.data).toEqual(mockData);
    expect(mockChain.update).toHaveBeenCalled();
    expect(mockChain.eq).toHaveBeenCalledWith('class_type', 'Daycare');
  });

  it('example: list with pagination', async () => {
    const { supabase } = await import('@/lib/supabase');

    const mockData = [TEST_FINANCE_CONFIGS.daycare, TEST_FINANCE_CONFIGS.evening];
    const mockChain = mockQueryChain(mockData);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const result = await supabase
      .from('class_finance_configs')
      .select('*', { count: 'exact' })
      .eq('del_yn', false)
      .order('class_type', { ascending: true })
      .range(0, 9);

    expect(result.data).toEqual(mockData);
    expect(mockChain.order).toHaveBeenCalledWith('class_type', { ascending: true });
    expect(mockChain.range).toHaveBeenCalledWith(0, 9);
  });

  it('example: handle not found error', async () => {
    const { supabase } = await import('@/lib/supabase');

    // Use error mock
    const mockChain = mockQueryChain(null);
    vi.mocked(mockChain.maybeSingle).mockResolvedValue({
      data: null,
      error: MOCK_ERRORS.notFound,
    });
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const result = await supabase
      .from('class_finance_configs')
      .select('*')
      .eq('class_type', 'Invalid')
      .maybeSingle();

    expect(result.data).toBeNull();
    expect(result.error).toEqual(MOCK_ERRORS.notFound);
  });

  it('example: mock auth.getUser', async () => {
    const { supabase } = await import('@/lib/supabase');

    const result = await supabase.auth.getUser();

    expect(result.data.user).toBeDefined();
    expect(result.data.user.email).toBe('test@example.com');
    expect(result.data.user.user_metadata.role).toBe('Admin');
  });
});

// Example 2: Mock specific query chains inline
describe('Example: Inline query chain mocking', () => {
  it('example: mock specific chain for one test', async () => {
    const mockData = { id: 1, class_type: 'Daycare' };
    const chain = mockQueryChain(mockData);

    // Use chain directly without full client mock
    const result = await chain
      .select('*')
      .eq('class_type', 'Daycare')
      .single();

    expect(result.data).toEqual(mockData);
  });
});

// Example 3: Verify query construction
describe('Example: Verify query calls', () => {
  it('example: verify correct query methods called', async () => {
    const { supabase } = await import('@/lib/supabase');

    const mockChain = mockQueryChain(TEST_FINANCE_CONFIGS.daycare);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    await supabase
      .from('class_finance_configs')
      .select('*')
      .eq('class_type', 'Daycare')
      .eq('del_yn', false)
      .maybeSingle();

    // Verify query construction
    expect(supabase.from).toHaveBeenCalledWith('class_finance_configs');
    expect(mockChain.select).toHaveBeenCalledWith('*');
    expect(mockChain.eq).toHaveBeenCalledWith('class_type', 'Daycare');
    expect(mockChain.eq).toHaveBeenCalledWith('del_yn', false);
    expect(mockChain.maybeSingle).toHaveBeenCalled();
  });
});
