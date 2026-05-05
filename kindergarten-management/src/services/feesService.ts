import { supabase } from '@/lib/supabase';
import { withSupabaseTimeout } from '@/lib/timeout';
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

function validatePaidAmount(paidAmount: number, amount: number): AppError | null {
  if (!Number.isFinite(paidAmount) || paidAmount < 0) {
    return { code: 'VALIDATION', message: 'Paid amount must be greater than or equal to 0.' };
  }
  if (paidAmount > amount) {
    return { code: 'VALIDATION', message: 'Paid amount cannot exceed fee amount.' };
  }
  return null;
}

async function getFeeSearchFilters(term: string): Promise<{ studentIds: string[]; feeTypeIds: number[]; error: AppError | null }> {
  const [studentsResult, feeTypesResult] = await Promise.all([
    withSupabaseTimeout(
      supabase.from('students').select('id').ilike('full_name', `%${term}%`),
      5000,
      { data: null, error: { message: 'Timeout searching students', details: '', hint: '', code: 'TIMEOUT' } } as any
    ),
    withSupabaseTimeout(
      supabase.from('fee_types').select('id').ilike('name', `%${term}%`),
      5000,
      { data: null, error: { message: 'Timeout searching fee types', details: '', hint: '', code: 'TIMEOUT' } } as any
    ),
  ]);

  if (studentsResult.error) return { studentIds: [], feeTypeIds: [], error: toAppError(studentsResult.error, 'Cannot search students.') };
  if (feeTypesResult.error) return { studentIds: [], feeTypeIds: [], error: toAppError(feeTypesResult.error, 'Cannot search fee types.') };

  return {
    studentIds: (studentsResult.data || []).map((row) => row.id),
    feeTypeIds: (feeTypesResult.data || []).map((row) => Number(row.id)),
    error: null,
  };
}

export async function listFeeTypes(): Promise<{ items: FeeTypeRecordP2[]; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase
      .from('fee_types')
      .select('id, name, amount_vnd, grade_id, description, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    8000,
    { data: null, error: { message: 'Timeout loading fee types', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { items: [], error: toAppError(result.error, 'Cannot load fee types.') };
  return { items: (result.data || []) as FeeTypeRow[], error: null };
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

  if (query.search?.trim()) {
    const filters = await getFeeSearchFilters(query.search.trim());
    if (filters.error) {
      return { data: { items: [], total: 0, page, pageSize }, error: filters.error };
    }
    if (filters.studentIds.length === 0 && filters.feeTypeIds.length === 0) {
      return { data: { items: [], total: 0, page, pageSize }, error: null };
    }
    if (filters.studentIds.length > 0 && filters.feeTypeIds.length > 0) {
      statement = statement.or(`student_id.in.(${filters.studentIds.join(',')}),fee_type_id.in.(${filters.feeTypeIds.join(',')})`);
    } else if (filters.studentIds.length > 0) {
      statement = statement.in('student_id', filters.studentIds);
    } else {
      statement = statement.in('fee_type_id', filters.feeTypeIds);
    }
  }

  const result = await withSupabaseTimeout(
    statement.range(from, to),
    8000,
    { data: null, count: null, error: { message: 'Timeout loading fees', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) {
    return {
      data: { items: [], total: 0, page, pageSize },
      error: toAppError(result.error, 'Cannot load fees.'),
    };
  }

  return {
    data: {
      items: ((result.data || []) as unknown as FeeRow[]).map(mapFeeRow),
      total: result.count || 0,
      page,
      pageSize,
    },
    error: null,
  };
}

export async function createFeeRecord(input: CreateFeeInput): Promise<{ item: FeeRecordP2 | null; error: AppError | null }> {
  const validationError = validatePaidAmount(input.paid_amount_vnd, input.amount_vnd);
  if (validationError) return { item: null, error: validationError };

  const result = await withSupabaseTimeout(
    supabase
      .from('fee_records')
      .insert(input)
      .select('id, student_id, class_id, fee_type_id, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, created_at, updated_at, students(id, full_name, classes(id, name)), fee_types(id, name)')
      .single(),
    8000,
    { data: null, error: { message: 'Timeout creating fee record', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Cannot create fee record.') };
  return { item: mapFeeRow(result.data as unknown as FeeRow), error: null };
}

export async function updateFeeRecordStatus(
  id: string,
  paidAmount: number,
  paidDate: string | null,
  paymentMethod: 'cash' | 'bank_transfer' | null
): Promise<{ error: AppError | null }> {
  const existingResult = await withSupabaseTimeout(
    supabase.from('fee_records').select('amount_vnd').eq('id', id).single(),
    8000,
    { data: null, error: { message: 'Timeout loading fee record', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (existingResult.error) return { error: toAppError(existingResult.error, 'Cannot load fee record.') };

  const amount = Number(existingResult.data?.amount_vnd || 0);
  const validationError = validatePaidAmount(paidAmount, amount);
  if (validationError) return { error: validationError };

  const status = paidAmount <= 0 ? 'unpaid' : paidAmount >= amount ? 'paid' : 'partial';
  const updateResult = await withSupabaseTimeout(
    supabase
      .from('fee_records')
      .update({
        paid_amount_vnd: paidAmount,
        paid_date: paidDate,
        payment_method: paymentMethod,
        status,
      })
      .eq('id', id),
    8000,
    { data: null, error: { message: 'Timeout updating fee record', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (updateResult.error) return { error: toAppError(updateResult.error, 'Cannot update fee status.') };
  return { error: null };
}
