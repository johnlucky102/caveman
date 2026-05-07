import { supabase } from '@/lib/supabase';
import { withSupabaseTimeout } from '@/lib/timeout';
import type {
  AppError,
  CreateFeeInput,
  FeeListQuery,
  FeeRecordP2,
  ListEnvelope,
} from '@/types/domain';
import { toAppError } from './supabaseErrors';


type FeeRow = {
  id: string;
  student_id: string;
  class_id: number;
  title: string | null;
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
};

function mapFeeRow(row: FeeRow): FeeRecordP2 {
  return {
    id: row.id,
    student_id: row.student_id,
    student_name: row.students?.full_name || 'N/A',
    class_id: row.class_id,
    class_name: row.students?.classes?.name || 'N/A',
    title: row.title || 'Học phí',
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

async function getFeeSearchFilters(term: string): Promise<{ studentIds: string[]; error: AppError | null }> {
  const studentsResult = await withSupabaseTimeout(
    supabase.from('students').select('id').ilike('full_name', `%${term}%`).eq('del_yn', false),
    5000,
    { data: null, error: { message: 'Timeout searching students', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (studentsResult.error) return { studentIds: [], error: toAppError(studentsResult.error, 'Không thể tìm kiếm học sinh.') };

  return {
    studentIds: (studentsResult.data || []).map((row) => row.id),
    error: null,
  };
}

export async function listFees(query: FeeListQuery): Promise<{ data: ListEnvelope<FeeRecordP2>; error: AppError | null }> {
  const page = Math.max(1, query.page);
  const pageSize = Math.max(1, query.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // 1. Build filter conditions
  let filterBuilder = supabase.from('fee_records').select('id', { count: 'exact', head: true }).eq('del_yn', false);

  if (query.status) {
    filterBuilder = filterBuilder.eq('status', query.status);
  }

  if (query.studentId) {
    filterBuilder = filterBuilder.eq('student_id', query.studentId);
  }

  if (query.month) {
    filterBuilder = filterBuilder.eq('month', query.month);
  }

  if (query.schoolYear) {
    filterBuilder = filterBuilder.eq('school_year', query.schoolYear);
  }

  if (query.search?.trim()) {
    const filters = await getFeeSearchFilters(query.search.trim());
    if (filters.error) {
      return { data: { items: [], total: 0, page, pageSize }, error: filters.error };
    }
    if (filters.studentIds.length === 0) {
      return { data: { items: [], total: 0, page, pageSize }, error: null };
    }
    
    const orFilter = [];
    if (filters.studentIds.length > 0) orFilter.push(`student_id.in.(${filters.studentIds.join(',')})`);
    filterBuilder = filterBuilder.or(orFilter.join(','));
  }

  // 2. Get Total Count
  const countResult = await withSupabaseTimeout(
    filterBuilder,
    5000,
    { data: null, count: 0, error: { message: 'Timeout loading fee count', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (countResult.error) {
    return { data: { items: [], total: 0, page, pageSize }, error: toAppError(countResult.error, 'Không thể đếm số lượng học phí.') };
  }

  const total = countResult.count || 0;
  if (total === 0) {
    return { data: { items: [], total: 0, page, pageSize }, error: null };
  }

  // 3. Get Paginated Data
  let dataQuery = supabase
    .from('fee_records')
    .select('id, student_id, class_id, title, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, created_at, updated_at, students(id, full_name, classes(id, name))')
    .eq('del_yn', false)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (query.status) {
    dataQuery = dataQuery.eq('status', query.status);
  }

  if (query.studentId) {
    dataQuery = dataQuery.eq('student_id', query.studentId);
  }

  if (query.month) {
    dataQuery = dataQuery.eq('month', query.month);
  }

  if (query.schoolYear) {
    dataQuery = dataQuery.eq('school_year', query.schoolYear);
  }

  if (query.search?.trim()) {
    const filters = await getFeeSearchFilters(query.search.trim());
    const orFilter = [];
    if (filters.studentIds.length > 0) orFilter.push(`student_id.in.(${filters.studentIds.join(',')})`);
    if (orFilter.length > 0) {
      dataQuery = dataQuery.or(orFilter.join(','));
    }
  }

  const result = await withSupabaseTimeout(
    dataQuery,
    8000,
    { data: null, error: { message: 'Timeout loading fees', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) {
    return {
      data: { items: [], total, page, pageSize },
      error: toAppError(result.error, 'Không thể tải danh sách học phí.'),
    };
  }

  return {
    data: {
      items: (result.data || []).map((row: any) => mapFeeRow(row as unknown as FeeRow)),
      total,
      page,
      pageSize,
    },
    error: null,
  };
}

export async function getFeeById(id: string): Promise<{ item: FeeRecordP2 | null; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase
      .from('fee_records')
      .select('id, student_id, class_id, title, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, created_at, updated_at, students(id, full_name, classes(id, name))')
      .eq('id', id)
      .eq('del_yn', false)
      .maybeSingle(),
    8000,
    { data: null, error: { message: 'Timeout loading fee record', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Không thể tải bản ghi học phí.') };
  if (!result.data) return { item: null, error: null };
  return { item: mapFeeRow(result.data as unknown as FeeRow), error: null };
}

export async function createFeeRecord(input: CreateFeeInput): Promise<{ item: FeeRecordP2 | null; error: AppError | null }> {
  const validationError = validatePaidAmount(input.paid_amount_vnd, input.amount_vnd);
  if (validationError) return { item: null, error: validationError };

  const result = await withSupabaseTimeout(
    supabase
      .from('fee_records')
      .insert(input)
      .select('id, student_id, class_id, title, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, created_at, updated_at, students(id, full_name, classes(id, name))')
      .single(),
    8000,
    { data: null, error: { message: 'Timeout creating fee record', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) {
    const err = result.error as any;
    if (err.code === '23505') {
      return {
        item: null,
        error: {
          code: 'CONFLICT',
          message: `Học sinh này đã có bản ghi học phí trong tháng ${input.month || ''} năm học ${input.school_year}.`,
        },
      };
    }
    return { item: null, error: toAppError(result.error, 'Không thể tạo bản ghi học phí.') };
  }
  return { item: mapFeeRow(result.data as unknown as FeeRow), error: null };
}

export async function updateFeeRecordStatus(
  id: string,
  paidAmount: number,
  paidDate: string | null,
  paymentMethod: 'cash' | 'bank_transfer' | null
): Promise<{ error: AppError | null }> {
  const existingResult = await withSupabaseTimeout(
    supabase.from('fee_records').select('amount_vnd').eq('id', id).eq('del_yn', false).single(),
    8000,
    { data: null, error: { message: 'Timeout loading fee record', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (existingResult.error) return { error: toAppError(existingResult.error, 'Không thể tải bản ghi học phí.') };

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

  if (updateResult.error) return { error: toAppError(updateResult.error, 'Không thể cập nhật trạng thái học phí.') };
  return { error: null };
}

export async function updateFeeRecord(id: string, payload: Partial<CreateFeeInput>): Promise<{ item: FeeRecordP2 | null; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase
      .from('fee_records')
      .update(payload)
      .eq('id', id)
      .select('id, student_id, class_id, title, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, created_at, updated_at, students(id, full_name, classes(id, name))')
      .single(),
    8000,
    { data: null, error: { message: 'Timeout cập nhật học phí', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Không thể cập nhật bản ghi học phí.') };
  return { item: mapFeeRow(result.data as unknown as FeeRow), error: null };
}

export async function deleteFeeRecord(id: string): Promise<{ error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase.from('fee_records').update({ del_yn: true }).eq('id', id),
    8000,
    { data: null, error: { message: 'Timeout xóa học phí', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { error: toAppError(result.error, 'Không thể xóa bản ghi học phí.') };
  return { error: null };
}

export async function deleteFeeRecords(ids: string[]): Promise<{ error: AppError | null }> {
  if (!ids.length) return { error: null };
  const result = await withSupabaseTimeout(
    supabase.from('fee_records').update({ del_yn: true }).in('id', ids),
    8000,
    { data: null, error: { message: 'Timeout xóa danh sách học phí', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { error: toAppError(result.error, 'Không thể xóa danh sách học phí.') };
  return { error: null };
}
