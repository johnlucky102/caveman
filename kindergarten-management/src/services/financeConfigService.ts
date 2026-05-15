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
  const { page, pageSize, search, sortBy = 'class_name', sortDirection = 'asc' } = query;

  let builder = supabase
    .from('class_finance_configs')
    .select('*, classes!inner(name)', { count: 'exact' })
    .eq('del_yn', false);

  if (search) {
    builder = builder.ilike('classes.name', `%${search}%`);
  }

  const sortColumn = sortBy === 'class_name' ? 'classes(name)' : sortBy;
  builder = builder.order(sortColumn, { ascending: sortDirection === 'asc' });

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

export async function getFinanceConfigByClassId(
  classId: number,
): Promise<{ item: ClassFinanceConfig | null; error: AppError | null }> {
  const { data, error } = await supabase
    .from('class_finance_configs')
    .select('*, classes!inner(name)')
    .eq('class_id', classId)
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

export async function createFinanceConfig(
  input: CreateFinanceConfigInput,
): Promise<{ item: ClassFinanceConfig | null; error: AppError | null }> {
  const guard = await ensureFinancialAccess(true);
  if (guard.error) return { item: null, error: guard.error };

  const { data, error } = await supabase
    .from('class_finance_configs')
    .insert({
      class_id: input.class_id,
      class_type: input.class_type,
      deduction_rules: input.deduction_rules || [],
    })
    .select('*, classes!inner(name)')
    .single();

  if (error) {
    return { item: null, error: toAppError(error, 'Không tạo được cấu hình tài chính') };
  }

  return { item: mapFinanceConfigRow(data as unknown as FinanceConfigRow), error: null };
}

export async function updateFinanceConfig(
  classId: number,
  input: UpdateFinanceConfigInput,
): Promise<{ item: ClassFinanceConfig | null; error: AppError | null }> {
  const guard = await ensureFinancialAccess(true);
  if (guard.error) return { item: null, error: guard.error };

  const updatePayload: any = {};
  if (input.class_type !== undefined) updatePayload.class_type = input.class_type;
  if (input.deduction_rules !== undefined) updatePayload.deduction_rules = input.deduction_rules;

  const { data, error } = await supabase
    .from('class_finance_configs')
    .update(updatePayload)
    .eq('class_id', classId)
    .eq('del_yn', false)
    .select('*, classes!inner(name)')
    .single();

  if (error) {
    return { item: null, error: toAppError(error, 'Không cập nhật được cấu hình tài chính') };
  }

  return { item: mapFinanceConfigRow(data as unknown as FinanceConfigRow), error: null };
}

export async function deleteFinanceConfig(
  classId: number,
): Promise<{ error: AppError | null }> {
  const guard = await ensureFinancialAccess(true);
  if (guard.error) return { error: guard.error };

  const { error } = await supabase
    .from('class_finance_configs')
    .update({ del_yn: true })
    .eq('class_id', classId)
    .eq('del_yn', false);

  if (error) {
    return { error: toAppError(error, 'Không xóa được cấu hình tài chính') };
  }

  return { error: null };
}

export async function ensureFinanceConfigExists(
  classId: number,
): Promise<{ created: boolean; error: AppError | null }> {
  const { item } = await getFinanceConfigByClassId(classId);
  if (item) return { created: false, error: null };

  const defaultConfig: CreateFinanceConfigInput = {
    class_id: classId,
    class_type: 'Daycare',
    deduction_rules: [],
  };

  const { error } = await createFinanceConfig(defaultConfig);
  return { created: !error, error };
}
