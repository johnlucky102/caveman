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

  // Auto sync attendance deduction after update
  const syncResult = await syncFeeWithAttendance(id);
  if (syncResult.error) {
    console.warn('[feesService] Tu dong dong bo chuyen can that bai (update):', syncResult.error.message);
  }

  invalidateSwCache(['fees', 'dashboard']);
  invalidateCache('dashboard');
  invalidateCache('fees');

  return { item: mapFeeRow((syncResult.item || data) as unknown as FeeRow), error: null };
}

async function runInChunks<T>(
  tasks: (() => Promise<T>)[],
  chunkSize = 10,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += chunkSize) {
    const chunk = tasks.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(t => t()));
    results.push(...chunkResults);
  }
  return results;
}

export async function bulkSyncFeesByFilter(params: {
  class_id?: number;
  month?: number;
  school_year?: string;
  fee_ids?: string[];
}): Promise<{ synced: number; failed: number; error: AppError | null }> {
  const accessError = await ensureFinancialAccess(true);
  if (accessError.error) return { synced: 0, failed: 0, error: accessError.error };

  // Step 1: Fetch all fee records in one query
  const feeSelect = 'id, student_id, class_id, school_year, month, amount_vnd, base_amount_vnd, status';
  let feeQuery = supabase
    .from('fee_records')
    .select(feeSelect)
    .eq('del_yn', false);

  if (params.fee_ids && params.fee_ids.length > 0) {
    feeQuery = feeQuery.in('id', params.fee_ids);
  } else {
    if (params.class_id !== undefined) feeQuery = feeQuery.eq('class_id', params.class_id);
    if (params.month !== undefined) feeQuery = feeQuery.eq('month', params.month);
    if (params.school_year) feeQuery = feeQuery.eq('school_year', params.school_year);
  }

  const { data: fees, error: feesError } = await feeQuery;
  if (feesError || !fees || fees.length === 0) {
    if (feesError) return { synced: 0, failed: 0, error: toAppError(feesError, 'Không tìm thấy bản ghi học phí.') };
    return { synced: 0, failed: 0, error: null };
  }

  // Step 2: Fetch all class finance configs in one query
  const uniqueClassIds = [...new Set(fees.map(f => f.class_id))];
  const { data: configs, error: configsError } = await supabase
    .from('class_finance_configs')
    .select('class_id, deduction_rules')
    .in('class_id', uniqueClassIds)
    .eq('del_yn', false);

  if (configsError) {
    return { synced: 0, failed: 0, error: toAppError(configsError, 'Không tải được cấu hình tài chính.') };
  }
  const configMap = new Map<number, DeductionRule[]>(
    (configs || []).map(c => [c.class_id as number, (c.deduction_rules || []) as DeductionRule[]])
  );

  // Step 3: Fetch all attendance in one query (cover full date span)
  const uniqueStudentIds = [...new Set(fees.map(f => f.student_id))];
  const allDates = fees
    .filter(f => f.month && f.school_year)
    .map(f => {
      const calYear = calendarYearFromSchoolMonth(f.school_year!, f.month!);
      // Calculate previous month for deduction
      const pm = f.month! === 1 ? 12 : f.month! - 1;
      const py = f.month! === 1 ? calYear - 1 : calYear;

      const start = `${py}-${String(pm).padStart(2, '0')}-01`;
      const endObj = new Date(py, pm, 0);
      const end = `${endObj.getFullYear()}-${String(endObj.getMonth() + 1).padStart(2, '0')}-${String(endObj.getDate()).padStart(2, '0')}`;
      return { start, end };
    });
  const overallStart = allDates.reduce((min, d) => d.start < min ? d.start : min, allDates[0]?.start ?? '');
  const overallEnd = allDates.reduce((max, d) => d.end > max ? d.end : max, allDates[0]?.end ?? '');

  const { data: allAttendance, error: attError } = await supabase
    .from('attendance')
    .select('student_id, class_id, attendance_date, status')
    .in('student_id', uniqueStudentIds)
    .in('class_id', uniqueClassIds)
    .gte('attendance_date', overallStart)
    .lte('attendance_date', overallEnd)
    .eq('del_yn', false);

  if (attError) {
    return { synced: 0, failed: 0, error: toAppError(attError, 'Không tải được dữ liệu điểm danh.') };
  }

  // Build attendance lookup: key = `${student_id}:${class_id}:${yyyy-mm}`
  const attMap = new Map<string, number>();
  for (const rec of (allAttendance || [])) {
    if (rec.status !== 'absent') continue;
    const ym = rec.attendance_date.slice(0, 7); // "yyyy-mm"
    const key = `${rec.student_id}:${rec.class_id}:${ym}`;
    attMap.set(key, (attMap.get(key) ?? 0) + 1);
  }

  // Step 4: Calculate deductions locally + prepare batch update tasks
  let synced = 0;
  let failed = 0;

  const updateTasks = fees.map(fee => async () => {
    const rules = configMap.get(fee.class_id as number) ?? [];
    const baseAmount = fee.base_amount_vnd || fee.amount_vnd;

    let absentDays = 0;
    if (fee.month && fee.school_year) {
      const calYear = calendarYearFromSchoolMonth(fee.school_year, fee.month);
      const pm = fee.month === 1 ? 12 : fee.month - 1;
      const py = fee.month === 1 ? calYear - 1 : calYear;
      const ym = `${py}-${String(pm).padStart(2, '0')}`;
      absentDays = attMap.get(`${fee.student_id}:${fee.class_id}:${ym}`) ?? 0;
    }

    const ruleTotal = rules.reduce((sum, r) => sum + r.amount, 0);
    const totalDeduction = absentDays * ruleTotal;
    const finalAmount = Math.max(0, baseAmount - totalDeduction);
    const ruleNames = rules.map(r => `${r.name} ${r.amount.toLocaleString('vi-VN')}đ`).join(' + ');
    const note = absentDays > 0
      ? `Khấu trừ ${absentDays} ngày vắng tháng trước x (${ruleNames}) = ${totalDeduction.toLocaleString('vi-VN')}đ`
      : 'Đã đồng bộ chuyên cần (không có ngày vắng tháng trước)';

    const { error: updateErr } = await supabase
      .from('fee_records')
      .update({
        amount_vnd: finalAmount,
        attendance_deduction_vnd: totalDeduction,
        deduction_details: rules.map(r => ({
          ...r,
          absent_days: absentDays,
          subtotal: absentDays * r.amount,
        })),
        deduction_note: note,
      })
      .eq('id', fee.id);

    return updateErr ? 'failed' : 'synced';
  });

  // Step 5: Run updates in parallel chunks of 10
  const results = await runInChunks(updateTasks, 10);
  for (const r of results) {
    if (r === 'synced') synced++;
    else {
      failed++;
      console.warn('[feesService] Bulk sync update failed for a fee record');
    }
  }

  invalidateSwCache(['fees', 'dashboard']);
  invalidateCache('dashboard');
  invalidateCache('fees');

  return { synced, failed, error: null };
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

  // 2. Load class info to get class_type
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('class_type')
    .eq('id', fee.class_id)
    .single();

  if (classError || !classData) {
    return { item: null, error: toAppError(classError || { message: 'Class not found' }, 'Không tìm thấy thông tin lớp học.') };
  }

  // 3. Load finance config for that class_type
  const configResult = await supabase
    .from('class_finance_configs')
    .select('class_type, deduction_rules')
    .eq('class_type', classData.class_type)
    .eq('del_yn', false)
    .maybeSingle();

  if (configResult.error || !configResult.data) {
    return { item: null, error: toAppError(configResult.error || { message: 'Config not found', code: 'NOT_FOUND' }, `Chưa có cấu hình tài chính cho loại lớp: ${classData.class_type}`) };
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
  const pm = month === 1 ? 12 : month - 1;
  const py = month === 1 ? calendarYear - 1 : calendarYear;

  const startDate = `${py}-${String(pm).padStart(2, '0')}-01`;
  const endDateObj = new Date(py, pm, 0);
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
    ? `Khấu trừ ${absentDays} ngày vắng tháng trước x (${ruleNames}) = ${totalDeduction.toLocaleString('vi-VN')}đ`
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
    // Check if fee already exists for this student, month, school_year
    const { data: existingFee } = await supabase
      .from('fee_records')
      .select('id')
      .eq('student_id', student.studentId)
      .eq('month', config.month)
      .eq('school_year', config.schoolYear)
      .maybeSingle();

    if (existingFee) {
      // Skip creating duplicate fee
      continue;
    }

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
