import { supabase } from '@/lib/supabase';
import type {
  AppError,
  CreateFeeInput,
  FeeListQuery,
  FeeRecordP2,
  FeeTypeRecordP2,
  ListEnvelope,
} from '@/types/domain';
import { toAppError } from './supabaseErrors';

type FeeTypeRow = FeeTypeRecordP2;

type FeeRow = {
  id: string;
  student_id: string;
  class_id: number;
  fee_type_id: number;
  school_year: string;
  month: number | null;
  amount_vnd: number;
  paid_amount_vnd: number;
  paid_date: string | null;
  due_date: string | null;
  payment_method: 'cash' | 'bank_transfer' | null;
  status: 'unpaid' | 'partial' | 'paid';
  created_at: string;
  updated_at: string;
  students: { id: string; full_name: string; classes: { id: number; name: string } | null } | null;
  fee_types: { id: number; name: string } | null;
};

function mapFeeRow(row: FeeRow): FeeRecordP2 {
  return {
    id: row.id,
    student_id: row.student_id,
    student_name: row.students?.full_name || 'N/A',
    class_id: row.class_id,
    class_name: row.students?.classes?.name || 'N/A',
    fee_type_id: row.fee_type_id,
    fee_type_name: row.fee_types?.name || 'N/A',
    school_year: row.school_year,
    month: row.month,
    amount_vnd: row.amount_vnd,
    paid_amount_vnd: row.paid_amount_vnd,
    paid_date: row.paid_date,
    due_date: row.due_date,
    payment_method: row.payment_method,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listFeeTypes(): Promise<{ items: FeeTypeRecordP2[]; error: AppError | null }> {
  const { data, error } = await supabase
    .from('fee_types')
    .select('id, name, amount_vnd, grade_id, description, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) return { items: [], error: toAppError(error, 'Không tải được loại phí.') };
  return { items: (data || []) as FeeTypeRow[], error: null };
}

export async function listFees(query: FeeListQuery): Promise<{ data: ListEnvelope<FeeRecordP2>; error: AppError | null }> {
  const page = Math.max(1, query.page);
  const pageSize = Math.max(1, query.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let statement = supabase
    .from('fee_records')
    .select('id, student_id, class_id, fee_type_id, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, created_at, updated_at, students(id, full_name, classes(id, name)), fee_types(id, name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (query.status) statement = statement.eq('status', query.status);

  const { data, count, error } = await statement.range(from, to);
  if (error) {
    return {
      data: { items: [], total: 0, page, pageSize },
      error: toAppError(error, 'Không tải được danh sách học phí.'),
    };
  }

  let items = ((data || []) as unknown as FeeRow[]).map(mapFeeRow);
  if (query.search?.trim()) {
    const term = query.search.trim().toLowerCase();
    items = items.filter((row) => row.student_name.toLowerCase().includes(term) || row.fee_type_name.toLowerCase().includes(term));
  }

  return {
    data: {
      items,
      total: count || 0,
      page,
      pageSize,
    },
    error: null,
  };
}

export async function createFeeRecord(input: CreateFeeInput): Promise<{ item: FeeRecordP2 | null; error: AppError | null }> {
  const { data, error } = await supabase
    .from('fee_records')
    .insert(input)
    .select('id, student_id, class_id, fee_type_id, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, created_at, updated_at, students(id, full_name, classes(id, name)), fee_types(id, name)')
    .single();

  if (error) return { item: null, error: toAppError(error, 'Tạo bản ghi học phí thất bại.') };
  return { item: mapFeeRow(data as unknown as FeeRow), error: null };
}

export async function updateFeeRecordStatus(
  id: string,
  paidAmount: number,
  paidDate: string | null,
  paymentMethod: 'cash' | 'bank_transfer' | null
): Promise<{ error: AppError | null }> {
  const { data: existing, error: existingError } = await supabase
    .from('fee_records')
    .select('amount_vnd')
    .eq('id', id)
    .single();

  if (existingError) return { error: toAppError(existingError, 'Không tải được bản ghi học phí.') };

  const amount = Number(existing.amount_vnd || 0);
  const status = paidAmount <= 0 ? 'unpaid' : paidAmount >= amount ? 'paid' : 'partial';

  const { error } = await supabase
    .from('fee_records')
    .update({
      paid_amount_vnd: paidAmount,
      paid_date: paidDate,
      payment_method: paymentMethod,
      status,
    })
    .eq('id', id);

  if (error) return { error: toAppError(error, 'Cập nhật trạng thái học phí thất bại.') };
  return { error: null };
}
