import { supabase } from '@/lib/supabase';
import { withSupabaseTimeout } from '@/lib/timeout';
import type {
  AppError,
  CreateFeeInput,
  FeeListQuery,
  FeeRecordP2,
  ListEnvelope,
  DeductionRule,
} from '@/types/domain';
import { toAppError } from './supabaseErrors';
import { invalidateSwCache } from '@/utils/swCacheInvalidate';
import { invalidateCache } from '@/hooks/useServiceCache';
import { ensureFinancialAccess, ensureFeeModificationAccess } from './serviceGuards';
import { calendarYearFromSchoolMonth } from '@/utils/schoolYearCalendar';

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
  base_amount_vnd: number | null;
  attendance_deduction_vnd: number | null;
  deduction_details: any;
  deduction_note: string | null;
  students: { id: string; full_name: string; classes: { id: number; name: string } | null } | null;
};

function parseDetails(raw: any): DeductionRule[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

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
    base_amount_vnd: row.base_amount_vnd || row.amount_vnd,
    attendance_deduction_vnd: row.attendance_deduction_vnd || 0,
    deduction_details: parseDetails(row.deduction_details),
    deduction_note: row.deduction_note,
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

  let dataQuery = supabase
    .from('fee_records')
    .select(
      'id, student_id, class_id, title, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, base_amount_vnd, attendance_deduction_vnd, deduction_details, deduction_note, created_at, updated_at, students!inner(id, full_name, classes(id, name))',
      { count: 'exact' }
    )
    .eq('del_yn', false);

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

  if (query.classId) {
    dataQuery = dataQuery.eq('class_id', query.classId);
  }

  if (query.search?.trim()) {
    dataQuery = dataQuery.ilike('students.full_name', `%${query.search.trim()}%`);
  }

  const result = await withSupabaseTimeout(
    dataQuery.order('created_at', { ascending: false }).range(from, to),
    8000,
    { data: null, count: 0, error: { message: 'Timeout loading fees', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) {
    return {
      data: { items: [], total: 0, page, pageSize },
      error: toAppError(result.error, 'Không thể tải danh sách học phí.'),
    };
  }

  const total = result.count || 0;

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

export async function getFeeSummary(query: FeeListQuery): Promise<{ data: { totalAmount: number; totalPaid: number; totalDebt: number; debtCount: number }; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase.rpc('get_fee_summary', {
      p_search: query.search?.trim() || null,
      p_status: query.status || null,
      p_month: query.month || null,
      p_class_id: query.classId || null,
      p_school_year: query.schoolYear || null,
      p_student_id: query.studentId || null,
    }),
    8000,
    { data: null, error: { message: 'Timeout loading fee summary', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) {
    return {
      data: { totalAmount: 0, totalPaid: 0, totalDebt: 0, debtCount: 0 },
      error: toAppError(result.error, 'Không thể tải tổng quan học phí.'),
    };
  }

  return {
    data: result.data as { totalAmount: number; totalPaid: number; totalDebt: number; debtCount: number },
    error: null,
  };
}


export async function getFeeById(id: string): Promise<{ item: FeeRecordP2 | null; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase
      .from('fee_records')
      .select('id, student_id, class_id, title, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, base_amount_vnd, attendance_deduction_vnd, deduction_details, deduction_note, created_at, updated_at, students(id, full_name, classes(id, name))')
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
  const accessError = await ensureFinancialAccess(true);
  if (accessError.error) return { item: null, error: accessError.error };

  const { data, error } = await supabase
    .from('fee_records')
    .insert({
      student_id: input.student_id,
      class_id: input.class_id,
      title: input.title || 'Học phí',
      school_year: input.school_year,
      month: input.month,
      amount_vnd: input.amount_vnd,
      paid_amount_vnd: input.paid_amount_vnd,
      paid_date: input.paid_date,
      due_date: input.due_date,
      payment_method: input.payment_method,
      status: input.status,
      base_amount_vnd: input.base_amount_vnd,
      attendance_deduction_vnd: input.attendance_deduction_vnd,
      deduction_details: input.deduction_details || [],
      deduction_note: input.deduction_note,
    })
    .select('id, student_id, class_id, title, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, base_amount_vnd, attendance_deduction_vnd, deduction_details, deduction_note, created_at, updated_at, students(id, full_name, classes(id, name))')
    .single();

  if (error) {
    return { item: null, error: toAppError(error, 'Không thể tạo học phí.') };
  }

  // Auto sync attendance deduction after creation
  const syncResult = await syncFeeWithAttendance(data.id);
  if (syncResult.error) {
    console.warn('[feesService] Tu dong dong bo chuyen can that bai:', syncResult.error.message);
  }

  invalidateSwCache(['fees', 'dashboard']);
  invalidateCache('dashboard');
  invalidateCache('fees');

  return { item: mapFeeRow((syncResult.item || data) as unknown as FeeRow), error: null };
}

export async function updateFeeRecord(
  id: string,
  input: Partial<CreateFeeInput>,
): Promise<{ item: FeeRecordP2 | null; error: AppError | null }> {
  const accessError = await ensureFinancialAccess(true);
  if (accessError.error) return { item: null, error: accessError.error };

  const updatePayload: any = { ...input };
  if (updatePayload.deduction_details) {
    updatePayload.deduction_details = updatePayload.deduction_details;
  }

  const { data, error } = await supabase
    .from('fee_records')
    .update(updatePayload)
    .eq('id', id)
    .eq('del_yn', false)
    .select('id, student_id, class_id, title, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, base_amount_vnd, attendance_deduction_vnd, deduction_details, deduction_note, created_at, updated_at, students(id, full_name, classes(id, name))')
    .single();

  if (error) {
    return { item: null, error: toAppError(error, 'Không thể cập nhật học phí.') };
  }

  invalidateSwCache(['fees', 'dashboard']);
  invalidateCache('dashboard');
  invalidateCache('fees');

  return { item: mapFeeRow(data as unknown as FeeRow), error: null };
}

export async function deleteFeeRecord(feeId: string): Promise<{ error: AppError | null }> {
  return deleteFeeRecords([feeId]);
}

export async function deleteFeeRecords(feeIds: string[]): Promise<{ error: AppError | null }> {
  if (feeIds.length === 0) return { error: null };

  const accessError = await ensureFinancialAccess(true);
  if (accessError.error) return { error: accessError.error };

  const { error } = await supabase
    .from('fee_records')
    .update({ del_yn: true })
    .in('id', feeIds)
    .eq('del_yn', false);

  if (error) {
    return { error: toAppError(error, 'Không thể xóa học phí.') };
  }

  invalidateSwCache(['fees', 'dashboard']);
  invalidateCache('dashboard');
  invalidateCache('fees');

  return { error: null };
}

export async function syncFeeWithAttendance(feeId: string): Promise<{ item: FeeRecordP2 | null; error: AppError | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { item: null, error: { code: 'UNAUTHORIZED', message: 'Bạn chưa đăng nhập.' } };

  // 1. Load the fee record
  const feeResult = await supabase
    .from('fee_records')
    .select('id, student_id, class_id, title, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, base_amount_vnd, attendance_deduction_vnd, deduction_details, deduction_note, created_at, updated_at, students(id, full_name, classes(id, name))')
    .eq('id', feeId)
    .single();

  if (feeResult.error || !feeResult.data) {
    return { item: null, error: toAppError(feeResult.error || { message: 'Fee not found', code: 'NOT_FOUND' }, 'Không tìm thấy bản ghi học phí.') };
  }
  const fee = feeResult.data;

  // 2. Load class finance config
  const configResult = await supabase
    .from('class_finance_configs')
    .select('class_type, deduction_rules')
    .eq('class_id', fee.class_id)
    .eq('del_yn', false)
    .maybeSingle();

  if (configResult.error || !configResult.data) {
    return { item: null, error: toAppError(configResult.error || { message: 'Config not found', code: 'NOT_FOUND' }, 'Không tìm thấy cấu hình tài chính cho lớp này.') };
  }
  const classConfig = configResult.data;

  const rules: DeductionRule[] = (classConfig.deduction_rules || []);
  if (rules.length === 0) {
    // No rules — no deduction
    const updateResult = await supabase
      .from('fee_records')
      .update({
        amount_vnd: fee.base_amount_vnd || fee.amount_vnd,
        attendance_deduction_vnd: 0,
        deduction_details: [],
        deduction_note: '',
      })
      .eq('id', feeId)
      .select('id, student_id, class_id, title, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, base_amount_vnd, attendance_deduction_vnd, deduction_details, deduction_note, created_at, updated_at, students(id, full_name, classes(id, name))')
      .single();

    if (updateResult.error) return { item: null, error: toAppError(updateResult.error, 'Lỗi khi cập nhật học phí.') };
    return { item: mapFeeRow(updateResult.data as unknown as FeeRow), error: null };
  }

  // 3. Load attendance for this student's month
  const { month, school_year } = fee;
  if (!month || !school_year) {
    return { item: null, error: { code: 'VALIDATION', message: 'Học phí không có tháng để đồng bộ chuyên cần.' } };
  }
  const calendarYear = calendarYearFromSchoolMonth(school_year, month);
  const startDate = `${calendarYear}-${String(month).padStart(2, '0')}-01`;
  const endDateObj = new Date(calendarYear, month, 0);
  const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

  const attendanceResult = await supabase
    .from('attendance')
    .select('status')
    .eq('student_id', fee.student_id)
    .eq('class_id', fee.class_id as number)
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate)
    .eq('del_yn', false);

  if (attendanceResult.error) return { item: null, error: toAppError(attendanceResult.error, 'Không tải được dữ liệu điểm danh.') };
  const attendance = attendanceResult.data || [];

  // 4. Calculate deduction
  const absentDays = attendance.filter(r => r.status === 'absent').length;
  const ruleTotal = rules.reduce((sum, r) => sum + r.amount, 0);
  const totalDeduction = absentDays * ruleTotal;
  const baseAmount = fee.base_amount_vnd || fee.amount_vnd;
  const finalAmount = Math.max(0, baseAmount - totalDeduction);

  // Build deduction note
  const ruleNames = rules.map(r => `${r.name} ${r.amount.toLocaleString('vi-VN')}đ`).join(' + ');
  const note = absentDays > 0
    ? `Trừ ${absentDays} ngày vắng x (${ruleNames}) = ${totalDeduction.toLocaleString('vi-VN')}đ`
    : '';

  // 5. Update
  const updateResult = await supabase
    .from('fee_records')
    .update({
      amount_vnd: finalAmount,
      attendance_deduction_vnd: totalDeduction,
      deduction_details: rules.map(r => ({
        ...r,
        absent_days: absentDays,
        subtotal: absentDays * r.amount,
      })),
      deduction_note: note || 'Đã đồng bộ chuyên cần',
    })
    .eq('id', feeId)
    .select('id, student_id, class_id, title, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, base_amount_vnd, attendance_deduction_vnd, deduction_details, deduction_note, created_at, updated_at, students(id, full_name, classes(id, name))')
    .single();

  if (updateResult.error) return { item: null, error: toAppError(updateResult.error, 'Lỗi khi cập nhật học phí sau khấu trừ.') };

  return { item: mapFeeRow(updateResult.data as unknown as FeeRow), error: null };
}

export async function createClassFees(
  config: { classId: number; month: number; schoolYear: string },
  feeTypeId: number,
  baseAmount: number,
  students: { studentId: string }[],
): Promise<{ items: FeeRecordP2[]; error: AppError | null }> {
  const fees: FeeRecordP2[] = [];

  for (const student of students) {
    const { item, error } = await createFeeRecord({
      student_id: student.studentId,
      class_id: config.classId,
      school_year: config.schoolYear,
      month: config.month,
      amount_vnd: baseAmount,
      paid_amount_vnd: 0,
      paid_date: null,
      due_date: null,
      payment_method: null,
      status: 'unpaid',
      base_amount_vnd: baseAmount,
      attendance_deduction_vnd: 0,
      deduction_details: [],
      deduction_note: '',
    });

    if (error) {
      return { items: fees, error };
    }

    if (item) fees.push(item);
  }

  return { items: fees, error: null };
}

export async function updateFeeRecordStatus(
  id: string,
  paidAmount: number,
  paidDate: string | null,
  paymentMethod: 'cash' | 'bank_transfer' | null,
): Promise<{ item: FeeRecordP2 | null; error: AppError | null }> {
  let fee = await syncFeeWithAttendance(id);
  if (fee.error) return { item: null, error: fee.error };
  if (!fee.item) return { item: null, error: { code: 'NOT_FOUND', message: 'Fee not found' } };

  const cappedPaid = Math.min(paidAmount, fee.item.amount_vnd);

  const validationError = validatePaidAmount(cappedPaid, fee.item.amount_vnd);
  if (validationError) return { item: null, error: validationError };

  let status: 'unpaid' | 'partial' | 'paid';
  if (cappedPaid <= 0) {
    status = 'unpaid';
  } else if (cappedPaid < fee.item.amount_vnd) {
    status = 'partial';
  } else {
    status = 'paid';
  }

  const { data, error } = await supabase
    .from('fee_records')
    .update({
      paid_amount_vnd: cappedPaid,
      paid_date: paidDate,
      payment_method: paymentMethod,
      status,
    })
    .eq('id', id)
    .eq('del_yn', false)
    .select('id, student_id, class_id, title, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, base_amount_vnd, attendance_deduction_vnd, deduction_details, deduction_note, created_at, updated_at, students(id, full_name, classes(id, name))')
    .single();

  if (error) return { item: null, error: toAppError(error, 'Không thể cập nhật trạng thái học phí.') };

  invalidateSwCache(['fees', 'dashboard']);
  invalidateCache('dashboard');
  invalidateCache('fees');

  return { item: mapFeeRow(data as unknown as FeeRow), error: null };
}
