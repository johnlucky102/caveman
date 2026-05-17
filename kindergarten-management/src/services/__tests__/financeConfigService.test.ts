import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listFinanceConfigs,
  getFinanceConfigByType,
  getFinanceConfigByClassId,
  createFinanceConfig,
  updateFinanceConfig,
  deleteFinanceConfig,
  ensureFinanceConfigExists,
} from '../financeConfigService';
import { supabase } from '@/lib/supabase';
import { TEST_FINANCE_CONFIGS } from '@/test/utils/testData';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-admin' } } }),
    },
    from: vi.fn(),
  },
}));

// Mock timeout
vi.mock('@/lib/timeout', () => ({
  withSupabaseTimeout: vi.fn(async (query) => query),
}));

const createMockChain = (data: any, count: number | null = null, error: any = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
  maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  then: vi.fn().mockImplementation((cb: any) => cb({ data, count, error })),
});

// Helper: mock ensureFinancialAccess for mutations (users table then the actual table)
function primeFinancialGuard() {
  vi.mocked(supabase.from).mockImplementationOnce(((table: string) => {
    if (table === 'users') return createMockChain({ role: 'Admin' }) as any;
    return createMockChain([]) as any;
  }) as any);
}

describe('financeConfigService - class_type refactor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFinanceConfigByType', () => {
    it('should query by class_type for Daycare', async () => {
      const mockConfig = TEST_FINANCE_CONFIGS.daycare;
      const fromMock = vi.mocked(supabase.from);
      const chain = createMockChain(mockConfig) as any;
      fromMock.mockReturnValueOnce(chain);

      const result = await getFinanceConfigByType('Daycare');

      expect(chain.eq).toHaveBeenCalledWith('class_type', 'Daycare');
      expect(chain.eq).toHaveBeenCalledWith('del_yn', false);
      expect(result.error).toBeNull();
      expect(result.item?.class_type).toBe('Daycare');
      expect(result.item?.deduction_rules).toEqual(mockConfig.deduction_rules);
    });

    it('should query by class_type for Evening', async () => {
      const mockConfig = TEST_FINANCE_CONFIGS.evening;
      const fromMock = vi.mocked(supabase.from);
      const chain = createMockChain(mockConfig) as any;
      fromMock.mockReturnValueOnce(chain);

      const result = await getFinanceConfigByType('Evening');

      expect(chain.eq).toHaveBeenCalledWith('class_type', 'Evening');
      expect(chain.eq).toHaveBeenCalledWith('del_yn', false);
      expect(result.error).toBeNull();
      expect(result.item?.class_type).toBe('Evening');
    });

    it('should return null when config not found', async () => {
      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValueOnce(createMockChain(null) as any);

      const result = await getFinanceConfigByType('Daycare');

      expect(result.error).toBeNull();
      expect(result.item).toBeNull();
    });
  });

  describe('listFinanceConfigs', () => {
    it('should include class_type field for each config', async () => {
      const mockConfigs = [
        { id: 1, class_id: null, class_type: 'Daycare', deduction_rules: [], del_yn: false, created_at: '2026-01-01', updated_at: '2026-01-01' },
        { id: 2, class_id: null, class_type: 'Evening', deduction_rules: [], del_yn: false, created_at: '2026-01-01', updated_at: '2026-01-01' },
      ];

      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValueOnce(createMockChain(mockConfigs, 2) as any);

      const result = await listFinanceConfigs({ page: 1, pageSize: 10 });

      expect(result.error).toBeNull();
      expect(result.data.items).toHaveLength(2);
      expect(result.data.items[0].class_type).toBe('Daycare');
      expect(result.data.items[1].class_type).toBe('Evening');
    });

    it('should sort by class_type by default', async () => {
      const fromMock = vi.mocked(supabase.from);
      const chain = createMockChain([], 0) as any;
      fromMock.mockReturnValueOnce(chain);

      await listFinanceConfigs({ page: 1, pageSize: 10 });

      expect(chain.order).toHaveBeenCalledWith('class_type', { ascending: true });
    });

    it('should support custom sort by class_type', async () => {
      const fromMock = vi.mocked(supabase.from);
      const chain = createMockChain([], 0) as any;
      fromMock.mockReturnValueOnce(chain);

      await listFinanceConfigs({ page: 1, pageSize: 10, sortBy: 'class_type', sortDirection: 'desc' });

      expect(chain.order).toHaveBeenCalledWith('class_type', { ascending: false });
    });

    it('should filter by search term on class_type', async () => {
      const fromMock = vi.mocked(supabase.from);
      const chain = createMockChain([], 0) as any;
      fromMock.mockReturnValueOnce(chain);

      await listFinanceConfigs({ page: 1, pageSize: 10, search: 'Day' });

      expect(chain.ilike).toHaveBeenCalledWith('class_type', '%Day%');
    });
  });

  describe('createFinanceConfig', () => {
    it('should insert with class_type and null class_id', async () => {
      const mockConfig = { id: 1, class_id: null, class_type: 'Daycare', deduction_rules: TEST_FINANCE_CONFIGS.daycare.deduction_rules, del_yn: false, created_at: '2026-01-01', updated_at: '2026-01-01' };

      const fromMock = vi.mocked(supabase.from);
      primeFinancialGuard();
      fromMock.mockReturnValueOnce(createMockChain(mockConfig) as any);

      const result = await createFinanceConfig({
        class_id: 0,
        class_type: 'Daycare',
        deduction_rules: TEST_FINANCE_CONFIGS.daycare.deduction_rules,
      });

      expect(result.error).toBeNull();
      expect(result.item?.class_type).toBe('Daycare');
      expect(result.item?.class_id).toBe(null);
    });

    it('should use upsert with onConflict for class_type', async () => {
      const mockConfig = { id: 1, class_id: null, class_type: 'Daycare', deduction_rules: [], del_yn: false, created_at: '2026-01-01', updated_at: '2026-01-01' };

      const fromMock = vi.mocked(supabase.from);
      primeFinancialGuard();
      const chain = createMockChain(mockConfig) as any;
      fromMock.mockReturnValueOnce(chain);

      await createFinanceConfig({
        class_id: 0,
        class_type: 'Daycare',
        deduction_rules: [],
      });

      expect(chain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ class_type: 'Daycare', del_yn: false }),
        { onConflict: 'class_type', ignoreDuplicates: false }
      );
    });

    it('should reject when user is not Admin/Accountant', async () => {
      vi.mocked(supabase.from).mockImplementationOnce(((table: string) => {
        if (table === 'users') return createMockChain({ role: 'Teacher' }) as any;
        return createMockChain([]) as any;
      }) as any);

      const result = await createFinanceConfig({
        class_id: 0,
        class_type: 'Daycare',
        deduction_rules: [],
      });

      expect(result.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('updateFinanceConfig', () => {
    it('should update by class_type', async () => {
      const mockUpdated = { id: 1, class_id: null, class_type: 'Evening', deduction_rules: [{ id: '3', name: 'Tiền cơm tối', amount: 45000 }], del_yn: false, created_at: '2026-01-01', updated_at: '2026-01-01' };

      const fromMock = vi.mocked(supabase.from);
      primeFinancialGuard();
      const chain = createMockChain(mockUpdated) as any;
      fromMock.mockReturnValueOnce(chain);

      const result = await updateFinanceConfig('Evening', {
        deduction_rules: [{ id: '3', name: 'Tiền cơm tối', amount: 45000 }],
      });

      expect(chain.eq).toHaveBeenCalledWith('class_type', 'Evening');
      expect(chain.eq).toHaveBeenCalledWith('del_yn', false);
      expect(result.error).toBeNull();
      expect(result.item?.deduction_rules[0].amount).toBe(45000);
    });

    it('should reject when user is not Admin/Accountant', async () => {
      vi.mocked(supabase.from).mockImplementationOnce(((table: string) => {
        if (table === 'users') return createMockChain({ role: 'Teacher' }) as any;
        return createMockChain([]) as any;
      }) as any);

      const result = await updateFinanceConfig('Daycare', { deduction_rules: [] });

      expect(result.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('deleteFinanceConfig', () => {
    it('should soft delete by class_type', async () => {
      const fromMock = vi.mocked(supabase.from);
      primeFinancialGuard();
      const chain = createMockChain(null) as any;
      fromMock.mockReturnValueOnce(chain);

      const result = await deleteFinanceConfig('Daycare');

      expect(chain.eq).toHaveBeenCalledWith('class_type', 'Daycare');
      expect(chain.eq).toHaveBeenCalledWith('del_yn', false);
      expect(chain.update).toHaveBeenCalledWith({ del_yn: true });
      expect(result.error).toBeNull();
    });

    it('should reject when user is not Admin/Accountant', async () => {
      vi.mocked(supabase.from).mockImplementationOnce(((table: string) => {
        if (table === 'users') return createMockChain({ role: 'Teacher' }) as any;
        return createMockChain([]) as any;
      }) as any);

      const result = await deleteFinanceConfig('Daycare');

      expect(result.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('ensureFinanceConfigExists', () => {
    it('should query by class_type and return created=false if exists', async () => {
      const mockConfig = TEST_FINANCE_CONFIGS.daycare;
      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValueOnce(createMockChain(mockConfig) as any);

      const result = await ensureFinanceConfigExists('Daycare');

      expect(result.created).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should create config with class_type if missing', async () => {
      const fromMock = vi.mocked(supabase.from);
      // getFinanceConfigByType returns null
      fromMock.mockReturnValueOnce(createMockChain(null) as any);
      // createFinanceConfig with guard
      primeFinancialGuard();
      const mockCreated = { id: 1, class_id: null, class_type: 'Evening', deduction_rules: [], del_yn: false, created_at: '2026-01-01', updated_at: '2026-01-01' };
      fromMock.mockReturnValueOnce(createMockChain(mockCreated) as any);

      const result = await ensureFinanceConfigExists('Evening');

      expect(result.created).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('getFinanceConfigByClassId (deprecated)', () => {
    it('should fetch class_type from classes table then get config', async () => {
      const fromMock = vi.mocked(supabase.from);
      // First call: get class_type from classes
      fromMock.mockReturnValueOnce(createMockChain({ class_type: 'Daycare' }) as any);
      // Second call: get config by type
      fromMock.mockReturnValueOnce(createMockChain(TEST_FINANCE_CONFIGS.daycare) as any);

      const result = await getFinanceConfigByClassId(1);

      expect(result.error).toBeNull();
      expect(result.item?.class_type).toBe('Daycare');
    });
  });
});