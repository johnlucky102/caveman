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
import { invalidateSwCache } from '@/utils/swCacheInvalidate';
import { ensureFinancialAccess, ensureFeeModificationAccess } from './serviceGuards';

// Removed local ensureFinancialAccess in favor of centralized serviceGuards.ts




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
  meal_deduction_vnd: number | null;
  tuition_deduction_vnd: number | null;
  deduction_note: string | null;
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
    base_amount_vnd: row.base_amount_vnd || row.amount_vnd,
    meal_deduction_vnd: row.meal_deduction_vnd || 0,
    tuition_deduction_vnd: row.tuition_deduction_vnd || 0,
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

  // 1. Build Query with Join
  let dataQuery = supabase
    .from('fee_records')
    .select(
      'id, student_id, class_id, title, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, base_amount_vnd, meal_deduction_vnd, tuition_deduction_vnd, deduction_note, created_at, updated_at, students!inner(id, full_name, classes(id, name))',
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

  // 2. Fetch Data
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
      .select('id, student_id, class_id, title, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, base_amount_vnd, meal_deduction_vnd, tuition_deduction_vnd, deduction_note, created_at, updated_at, students(id, full_name, classes(id, name))')
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

  const validationError = validatePaidAmount(input.paid_amount_vnd, input.amount_vnd);
  if (validationError) return { item: null, error: validationError };

  const result = await withSupabaseTimeout(
    supabase
      .from('fee_records')
      .insert(input)
      .select('id, student_id, class_id, title, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, base_amount_vnd, meal_deduction_vnd, tuition_deduction_vnd, deduction_note, created_at, updated_at, students(id, full_name, classes(id, name))')
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
  invalidateSwCache(['fee_records']);
  return { item: mapFeeRow(result.data as unknown as FeeRow), error: null };
}

export async function updateFeeRecordStatus(
  id: string,
  paidAmount: number,
  paidDate: string | null,
  paymentMethod: 'cash' | 'bank_transfer' | null
): Promise<{ error: AppError | null }> {
  const accessError = await ensureFeeModificationAccess(id, true);
  if (accessError.error) return { error: accessError.error };

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
  invalidateSwCache(['fee_records']);
  return { error: null };
}

export async function updateFeeRecord(id: string, payload: Partial<CreateFeeInput>): Promise<{ item: FeeRecordP2 | null; error: AppError | null }> {
  const isMoneyUpdate = 'amount_vnd' in payload || 'paid_amount_vnd' in payload || 'base_amount_vnd' in payload;
  const accessError = await ensureFeeModificationAccess(id, isMoneyUpdate);
  if (accessError.error) return { item: null, error: accessError.error };

  const result = await withSupabaseTimeout(
    supabase
      .from('fee_records')
      .update(payload)
      .eq('id', id)
      .select('id, student_id, class_id, title, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, base_amount_vnd, meal_deduction_vnd, tuition_deduction_vnd, deduction_note, created_at, updated_at, students(id, full_name, classes(id, name))')
      .single(),
    8000,
    { data: null, error: { message: 'Timeout cập nhật học phí', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Không thể cập nhật bản ghi học phí.') };
  invalidateSwCache(['fee_records']);
  return { item: mapFeeRow(result.data as unknown as FeeRow), error: null };
}

export async function deleteFeeRecord(id: string): Promise<{ error: AppError | null }> {
  const accessError = await ensureFeeModificationAccess(id);
  if (accessError.error) return { error: accessError.error };

  const result = await withSupabaseTimeout(
    supabase.from('fee_records').update({ del_yn: true }).eq('id', id),
    8000,
    { data: null, error: { message: 'Timeout xóa học phí', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { error: toAppError(result.error, 'Không thể xóa bản ghi học phí.') };
  invalidateSwCache(['fee_records']);
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

export async function createClassFees(
  classId: number,
  month: number,
  schoolYear: string,
  title: string,
  baseAmount: number
): Promise<{ error: AppError | null }> {
  const accessError = await ensureFinancialAccess(true);
  if (accessError.error) return { error: accessError.error };

  // 1. Get all students in class
  const studentsResult = await supabase
    .from('students')
    .select('id')
    .eq('class_id', classId)
    .eq('del_yn', false);
  
  if (studentsResult.error) return { error: toAppError(studentsResult.error, 'Không tải được học sinh của lớp.') };
  const students = studentsResult.data || [];
  if (students.length === 0) return { error: { code: 'NOT_FOUND', message: 'Lớp học hiện chưa có học sinh nào.' } };

  // 2. Create records
  const payload = students.map(s => ({
    student_id: s.id,
    class_id: classId,
    month,
    school_year: schoolYear,
    title,
    base_amount_vnd: baseAmount,
    amount_vnd: baseAmount,
    status: 'unpaid'
  }));

  const { error } = await supabase.from('fee_records').insert(payload);
  if (error) {
    if (error.code === '23505') return { error: { code: 'CONFLICT', message: 'Một số học sinh trong lớp đã có học phí cho tháng này.' } };
    return { error: toAppError(error, 'Lỗi khi tạo học phí hàng loạt.') };
  }

  invalidateSwCache(['fee_records']);
  return { error: null };
}

export async function syncFeeWithAttendance(feeId: string): Promise<{ item: FeeRecordP2 | null; error: AppError | null }> {
  const accessError = await ensureFeeModificationAccess(feeId);
  if (accessError.error) return { item: null, error: accessError.error };

  // 1. Load fee with class config
  const feeResult = await supabase
    .from('fee_records')
    .select('*, students(id, full_name), classes(*)')
    .eq('id', feeId)
    .single();
  
  if (feeResult.error) return { item: null, error: toAppError(feeResult.error, 'Không tải được bản ghi học phí.') };
  const fee = feeResult.data;
  const classConfig = fee.classes;
  if (!classConfig) return { item: null, error: { code: 'NOT_FOUND', message: 'Không tìm thấy cấu hình lớp học.' } };

  // 2. Load attendance for that month
  // 2. Load attendance for that month
  const [startYearStr, endYearStr] = fee.school_year.split('-');
  const startYear = Number(startYearStr);
  const endYear = Number(endYearStr);
  
  // Months 1-8 are usually in the endYear (Spring semester), 9-12 in startYear (Fall)
  const actualYear = (fee.month >= 1 && fee.month <= 8) ? endYear : startYear;
  
  const startDate = `${actualYear}-${String(fee.month).padStart(2, '0')}-01`;
  const endDate = new Date(actualYear, fee.month, 0).toISOString().split('T')[0];

  const attendanceResult = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', fee.student_id)
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate)
    .eq('del_yn', false);
  
  if (attendanceResult.error) return { item: null, error: toAppError(attendanceResult.error, 'Không tải được dữ liệu điểm danh.') };
  const attendance = attendanceResult.data || [];

  // 3. Calculation Logic
  let mealDeduction = 0;
  let tuitionDeduction = 0;
  const notes: string[] = [];

  const mealRate = classConfig.meal_rate || 20000;
  const cancelRate = classConfig.cancel_rate || 50000;
  const hospitalType = classConfig.hospital_deduction_type; // 'Fixed' | 'Daily'
  const hospitalVal = classConfig.hospital_deduction_value || 0;

  attendance.forEach(record => {
    // A. Meal deduction (Daycare only)
    if (classConfig.class_type === 'Daycare') {
      if (record.status === 'absent' || record.status === 'excused' || record.status === 'center_cancelled') {
        mealDeduction += mealRate;
      }
    }

    // B. Hospital deduction (Daycare only)
    if (classConfig.class_type === 'Daycare' && record.is_hospitalized) {
      if (hospitalType === 'Fixed') {
        tuitionDeduction += hospitalVal;
      } else {
        // Daily rate based on 22 working days
        const dailyTuition = ((fee.base_amount_vnd || fee.amount_vnd) || 0) / 22;
        tuitionDeduction += Math.round((dailyTuition * hospitalVal) / 100);
      }
    }

    // C. Center Cancelled (Evening class only)
    if (classConfig.class_type === 'Evening' && record.status === 'center_cancelled') {
      tuitionDeduction += cancelRate;
    }
  });

  if (mealDeduction > 0) notes.push(`Trừ ${attendance.filter(r => (r.status === 'absent' || r.status === 'excused' || r.status === 'center_cancelled') && classConfig.class_type === 'Daycare').length} ngày cơm`);
  if (tuitionDeduction > 0) notes.push(`Khấu trừ học phí (Nằm viện/TT nghỉ)`);

  const baseAmount = fee.base_amount_vnd || fee.amount_vnd;
  const finalAmount = Math.max(0, baseAmount - mealDeduction - tuitionDeduction);

  // 4. Update
  const updateResult = await supabase
    .from('fee_records')
    .update({
      amount_vnd: finalAmount,
      meal_deduction_vnd: mealDeduction,
      tuition_deduction_vnd: tuitionDeduction,
      deduction_note: notes.join('; ') || 'Đã đồng bộ chuyên cần',
    })
    .eq('id', feeId)
    .select('id, student_id, class_id, title, school_year, month, amount_vnd, paid_amount_vnd, paid_date, due_date, payment_method, status, base_amount_vnd, meal_deduction_vnd, tuition_deduction_vnd, deduction_note, created_at, updated_at, students(id, full_name, classes(id, name))')
    .single();

  if (updateResult.error) return { item: null, error: toAppError(updateResult.error, 'Lỗi khi cập nhật học phí sau khấu trừ.') };
  invalidateSwCache(['fee_records']);
  return { item: mapFeeRow(updateResult.data as any), error: null };
}
