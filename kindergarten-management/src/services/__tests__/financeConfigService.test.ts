import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listFinanceConfigs,
  getFinanceConfigByClassId,
  createFinanceConfig,
  updateFinanceConfig,
  deleteFinanceConfig,
  ensureFinanceConfigExists,
} from '../financeConfigService';
import { supabase } from '@/lib/supabase';

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

describe('financeConfigService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listFinanceConfigs', () => {
    it('should return configs with class names', async () => {
      const mockConfigs = [
        { id: 1, class_id: 1, class_type: 'Daycare', meal_rate: 20000, cancel_rate: 50000, hospital_deduction_type: 'Fixed', hospital_deduction_value: 0, del_yn: false, created_at: '2026-01-01', updated_at: '2026-01-01', classes: { name: 'Mầm 1' } },
        { id: 2, class_id: 2, class_type: 'Evening', meal_rate: 0, cancel_rate: 30000, hospital_deduction_type: 'Daily', hospital_deduction_value: 50, del_yn: false, created_at: '2026-01-01', updated_at: '2026-01-01', classes: { name: 'Tối 1' } },
      ];

      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValueOnce(createMockChain(mockConfigs, 2) as any);

      const result = await listFinanceConfigs({ page: 1, pageSize: 10 });

      expect(result.error).toBeNull();
      expect(result.data.items).toHaveLength(2);
      expect(result.data.total).toBe(2);
      expect(result.data.items[0].class_name).toBe('Mầm 1');
      expect(result.data.items[1].class_name).toBe('Tối 1');
      expect(result.data.items[1].class_type).toBe('Evening');
    });

    it('should filter by search term on class name', async () => {
      const fromMock = vi.mocked(supabase.from);
      const chain = createMockChain([], 0) as any;
      fromMock.mockReturnValueOnce(chain);

      await listFinanceConfigs({ page: 1, pageSize: 10, search: 'Mầm' });

      expect(chain.ilike).toHaveBeenCalledWith('classes.name', '%Mầm%');
    });

    it('should support sort by class_type', async () => {
      const fromMock = vi.mocked(supabase.from);
      const chain = createMockChain([], 0) as any;
      fromMock.mockReturnValueOnce(chain);

      await listFinanceConfigs({ page: 1, pageSize: 10, sortBy: 'class_type', sortDirection: 'desc' });

      expect(chain.order).toHaveBeenCalledWith('class_type', { ascending: false });
    });

    it('should handle database errors', async () => {
      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValueOnce(createMockChain(null, null, { message: 'DB error' }) as any);

      const result = await listFinanceConfigs({ page: 1, pageSize: 10 });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe('DB error');
    });
  });

  describe('getFinanceConfigByClassId', () => {
    it('should return config for a class', async () => {
      const mockConfig = { id: 1, class_id: 1, class_type: 'Daycare', meal_rate: 20000, cancel_rate: 50000, hospital_deduction_type: 'Fixed', hospital_deduction_value: 0, del_yn: false, created_at: '2026-01-01', updated_at: '2026-01-01', classes: { name: 'Mầm 1' } };

      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValueOnce(createMockChain(mockConfig) as any);

      const result = await getFinanceConfigByClassId(1);

      expect(result.error).toBeNull();
      expect(result.item?.class_id).toBe(1);
      expect(result.item?.class_name).toBe('Mầm 1');
    });

    it('should return null when no config found (no error)', async () => {
      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValueOnce(createMockChain(null) as any);

      const result = await getFinanceConfigByClassId(999);

      expect(result.error).toBeNull();
      expect(result.item).toBeNull();
    });

    it('should handle database errors', async () => {
      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValueOnce(createMockChain(null, null, { message: 'DB error' }) as any);

      const result = await getFinanceConfigByClassId(1);

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe('DB error');
    });
  });

  describe('createFinanceConfig', () => {
    it('should create a new finance config', async () => {
      const mockConfig = { id: 1, class_id: 2, class_type: 'Daycare', meal_rate: 30000, cancel_rate: 60000, hospital_deduction_type: 'Daily', hospital_deduction_value: 20, del_yn: false, created_at: '2026-01-01', updated_at: '2026-01-01', classes: { name: 'Mầm 2' } };

      const fromMock = vi.mocked(supabase.from);
      primeFinancialGuard();
      fromMock.mockReturnValueOnce(createMockChain(mockConfig) as any);

      const result = await createFinanceConfig({
        class_id: 2,
        class_type: 'Daycare',
        deduction_rules: [
          { id: 'meal', name: 'Tiền cơm', amount: 30000 },
          { id: 'cancel', name: 'Tiền nghỉ', amount: 60000 },
        ],
      });

      expect(result.error).toBeNull();
      expect(result.item?.class_id).toBe(2);
    });

    it('should reject when user is not Admin/Accountant', async () => {
      // Mock users table to return Teacher role
      vi.mocked(supabase.from).mockImplementationOnce(((table: string) => {
        if (table === 'users') return createMockChain({ role: 'Teacher' }) as any;
        return createMockChain([]) as any;
      }) as any);

      const result = await createFinanceConfig({
        class_id: 1,
        class_type: 'Daycare',
        deduction_rules: [
          { id: 'meal', name: 'Tiền cơm', amount: 20000 },
          { id: 'cancel', name: 'Tiền nghỉ', amount: 50000 },
        ],
      });

      expect(result.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('updateFinanceConfig', () => {
    it('should update deduction_rules', async () => {
      const mockUpdated = { id: 1, class_id: 1, class_type: 'Daycare', deduction_rules: [{ id: 'meal', name: 'Tiền cơm', amount: 35000 }, { id: 'cancel', name: 'Tiền nghỉ', amount: 50000 }], del_yn: false, created_at: '2026-01-01', updated_at: '2026-01-01', classes: { name: 'Mầm 1' } };

      const fromMock = vi.mocked(supabase.from);
      primeFinancialGuard();
      fromMock.mockReturnValueOnce(createMockChain(mockUpdated) as any);

      const result = await updateFinanceConfig(1, { deduction_rules: [{ id: 'meal', name: 'Tiền cơm', amount: 35000 }] });

      expect(result.error).toBeNull();
      expect(result.item?.deduction_rules?.[0]?.amount).toBe(35000);
    });

    it('should reject when user is not Admin/Accountant', async () => {
      vi.mocked(supabase.from).mockImplementationOnce(((table: string) => {
        if (table === 'users') return createMockChain({ role: 'Teacher' }) as any;
        return createMockChain([]) as any;
      }) as any);

      const result = await updateFinanceConfig(1, { deduction_rules: [{ id: 'meal', name: 'Tiền cơm', amount: 35000 }] });

      expect(result.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('deleteFinanceConfig', () => {
    it('should soft delete a finance config', async () => {
      const fromMock = vi.mocked(supabase.from);
      primeFinancialGuard();
      const deleteChain = createMockChain(null);
      fromMock.mockReturnValueOnce(deleteChain as any);

      const result = await deleteFinanceConfig(1);

      expect(result.error).toBeNull();
      expect(deleteChain.update).toHaveBeenCalledWith({ del_yn: true });
    });

    it('should reject when user is not Admin/Accountant', async () => {
      vi.mocked(supabase.from).mockImplementationOnce(((table: string) => {
        if (table === 'users') return createMockChain({ role: 'Teacher' }) as any;
        return createMockChain([]) as any;
      }) as any);

      const result = await deleteFinanceConfig(1);

      expect(result.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('ensureFinanceConfigExists', () => {
    it('should return created=false if config already exists', async () => {
      const mockConfig = { id: 1, class_id: 1, class_type: 'Daycare', meal_rate: 20000, cancel_rate: 50000, hospital_deduction_type: 'Fixed', hospital_deduction_value: 0, del_yn: false, created_at: '2026-01-01', updated_at: '2026-01-01', classes: { name: 'Mầm 1' } };

      const fromMock = vi.mocked(supabase.from);
      // getFinanceConfigByClassId returns existing config
      fromMock.mockReturnValueOnce(createMockChain(mockConfig) as any);

      const result = await ensureFinanceConfigExists(1);

      expect(result.created).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should auto-create config if not exists', async () => {
      const fromMock = vi.mocked(supabase.from);
      // getFinanceConfigByClassId returns null (no config)
      fromMock.mockReturnValueOnce(createMockChain(null) as any);
      // createFinanceConfig: guard (users) then insert
      primeFinancialGuard();
      const mockCreated = { id: 1, class_id: 2, class_type: 'Daycare', meal_rate: 20000, cancel_rate: 50000, hospital_deduction_type: 'Fixed', hospital_deduction_value: 0, del_yn: false, created_at: '2026-01-01', updated_at: '2026-01-01', classes: { name: 'Mầm 2' } };
      fromMock.mockReturnValueOnce(createMockChain(mockCreated) as any);

      const result = await ensureFinanceConfigExists(2);

      expect(result.created).toBe(true);
      expect(result.error).toBeNull();
    });
  });
});