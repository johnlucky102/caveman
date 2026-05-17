import { supabase } from '@/lib/supabase';
import { ensureFinancialAccess } from '@/services/serviceGuards';
import { toAppError } from '@/services/supabaseErrors';
import type { AppError, ListEnvelope } from '@/types/domain';
import type {
  ClassFinanceConfig,
  CreateFinanceConfigInput,
  FinanceConfigListQuery,
  UpdateFinanceConfigInput,
} from '@/types/domain';

type FinanceConfigRow = {
  id: number;
  class_id: number;
  class_type: string;
  deduction_rules: any;
  del_yn: boolean;
  created_at: string;
  updated_at: string;
  classes?: { name: string } | null;
};

function parseRules(raw: any) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function mapFinanceConfigRow(row: FinanceConfigRow): ClassFinanceConfig {
  return {
    id: row.id,
    class_id: row.class_id,
    class_name: row.classes?.name || undefined,
    class_type: row.class_type as 'Daycare' | 'Evening',
    deduction_rules: parseRules(row.deduction_rules),
    del_yn: row.del_yn,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listFinanceConfigs(
  query: FinanceConfigListQuery,
): Promise<{ data: ListEnvelope<ClassFinanceConfig>; error: AppError | null }> {
  const { page, pageSize, search, sortBy = 'class_type', sortDirection = 'asc' } = query;

  let builder = supabase
    .from('class_finance_configs')
    .select('*', { count: 'exact' })
    .eq('del_yn', false);

  if (search) {
    builder = builder.ilike('class_type', `%${search}%`);
  }

  builder = builder.order(sortBy, { ascending: sortDirection === 'asc' });

  const from = (page - 1) * pageSize;
  builder = builder.range(from, from + pageSize - 1);

  const { data, error, count } = await builder;

  if (error) {
    return { data: { items: [], total: 0, page, pageSize }, error: toAppError(error, 'Không tải được danh sách cấu hình tài chính') };
  }

  const items = ((data as unknown as FinanceConfigRow[]) || []).map(mapFinanceConfigRow);

  return {
    data: { items, total: count || 0, page, pageSize },
    error: null,
  };
}

export async function getFinanceConfigByType(
  classType: 'Daycare' | 'Evening',
): Promise<{ item: ClassFinanceConfig | null; error: AppError | null }> {
  const { data, error } = await supabase
    .from('class_finance_configs')
    .select('*')
    .eq('class_type', classType)
    .eq('del_yn', false)
    .maybeSingle();

  if (error) {
    return { item: null, error: toAppError(error, 'Không tải được cấu hình tài chính') };
  }

  if (!data) {
    return { item: null, error: null };
  }

  return { item: mapFinanceConfigRow(data as unknown as FinanceConfigRow), error: null };
}

/** @deprecated Use getFinanceConfigByType */
export async function getFinanceConfigByClassId(
  classId: number,
): Promise<{ item: ClassFinanceConfig | null; error: AppError | null }> {
  const { data: classData } = await supabase.from('classes').select('class_type').eq('id', classId).single();
  if (classData?.class_type) {
    return getFinanceConfigByType(classData.class_type as any);
  }
  return { item: null, error: null };
}

export async function createFinanceConfig(
  input: CreateFinanceConfigInput,
): Promise<{ item: ClassFinanceConfig | null; error: AppError | null }> {
  const guard = await ensureFinancialAccess(true);
  if (guard.error) return { item: null, error: guard.error };

  const { data, error } = await supabase
    .from('class_finance_configs')
    .upsert({
      class_type: input.class_type,
      deduction_rules: input.deduction_rules || [],
      del_yn: false,
    }, { onConflict: 'class_type', ignoreDuplicates: false })
    .select('*')
    .single();

  if (error) {
    return { item: null, error: toAppError(error, 'Không tạo được cấu hình tài chính') };
  }

  // Trigger background fee sync for the entire class
  import('./feesService').then(({ bulkSyncFeesByFilter }) => {
    bulkSyncFeesByFilter({ class_id: input.class_id })
      .catch(e => console.error('[AutoSync] Failed to sync fees after config creation', e));
  }).catch(e => console.error('[AutoSync] Failed to load feesService', e));

  return { item: mapFinanceConfigRow(data as unknown as FinanceConfigRow), error: null };
}

export async function updateFinanceConfig(
  classType: string,
  input: UpdateFinanceConfigInput,
): Promise<{ item: ClassFinanceConfig | null; error: AppError | null }> {
  const guard = await ensureFinancialAccess(true);
  if (guard.error) return { item: null, error: guard.error };

  const updatePayload: any = {};
  if (input.deduction_rules !== undefined) updatePayload.deduction_rules = input.deduction_rules;

  const { data, error } = await supabase
    .from('class_finance_configs')
    .update(updatePayload)
    .eq('class_type', classType)
    .eq('del_yn', false)
    .select('*')
    .single();

  if (error) {
    return { item: null, error: toAppError(error, 'Không cập nhật được cấu hình tài chính') };
  }

  // Trigger background fee sync for the entire class
  import('./feesService').then(({ bulkSyncFeesByFilter }) => {
    bulkSyncFeesByFilter({ class_id: classId })
      .catch(e => console.error('[AutoSync] Failed to sync fees after config update', e));
  }).catch(e => console.error('[AutoSync] Failed to load feesService', e));

  return { item: mapFinanceConfigRow(data as unknown as FinanceConfigRow), error: null };
}

export async function deleteFinanceConfig(
  classType: string,
): Promise<{ error: AppError | null }> {
  const guard = await ensureFinancialAccess(true);
  if (guard.error) return { error: guard.error };

  const { error } = await supabase
    .from('class_finance_configs')
    .update({ del_yn: true })
    .eq('class_type', classType)
    .eq('del_yn', false);

  if (error) {
    return { error: toAppError(error, 'Không xóa được cấu hình tài chính') };
  }

  return { error: null };
}

export async function ensureFinanceConfigExists(
  classType: 'Daycare' | 'Evening',
): Promise<{ created: boolean; error: AppError | null }> {
  const { item } = await getFinanceConfigByType(classType);
  if (item) return { created: false, error: null };

  const defaultConfig: CreateFinanceConfigInput = {
    class_id: 0, // No longer used but kept for type compatibility if needed
    class_type: classType,
    deduction_rules: [],
  };

  const { error } = await createFinanceConfig(defaultConfig);
  return { created: !error, error };
}
