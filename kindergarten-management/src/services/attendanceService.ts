import { supabase } from '@/lib/supabase';
import { withSupabaseTimeout } from '@/lib/timeout';
import type {
  AppError,
  AttendanceListQuery,
  AttendanceRecord,
  AttendanceStatusValue,
  UpsertAttendanceInput,
} from '@/types/domain';
import { toAppError } from './supabaseErrors';

type AttendanceRow = {
  id: string;
  student_id: string;
  class_id: number;
  attendance_date: string;
  status: AttendanceStatusValue;
  check_in_time: string | null;
  check_out_time: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  students: {
    id: string;
    full_name: string;
    classes: { id: number; name: string } | null;
  } | null;
};

function mapAttendance(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    student_id: row.student_id,
    student_name: row.students?.full_name || 'N/A',
    class_id: row.class_id,
    class_name: row.students?.classes?.name || 'N/A',
    attendance_date: row.attendance_date,
    status: row.status,
    check_in_time: row.check_in_time,
    check_out_time: row.check_out_time,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export interface AttendanceStudentItem {
  student_id: string;
  student_name: string;
  class_id: number;
  class_name: string;
  attendance_id: string | null;
  status: AttendanceStatusValue;
  check_in_time: string | null;
  check_out_time: string | null;
  note: string | null;
}

export async function listAttendanceByClassAndDate(query: AttendanceListQuery): Promise<{ items: AttendanceStudentItem[]; error: AppError | null }> {
  const studentsPromise = supabase
    .from('students')
    .select('id, full_name, class_id, classes(id, name)')
    .eq('class_id', query.classId)
    .eq('del_yn', false)
    .order('full_name', { ascending: true });

  const studentsResult = await withSupabaseTimeout(
    studentsPromise,
    8000,
    { data: null, error: { message: 'Timeout tải học sinh', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (studentsResult.error) return { items: [], error: toAppError(studentsResult.error, 'Không tải được danh sách học sinh để điểm danh.') };

  const attendancePromise = supabase
    .from('attendance')
    .select('id, student_id, class_id, attendance_date, status, check_in_time, check_out_time, note, created_at, updated_at, students(id, full_name, classes(id, name))')
    .eq('class_id', query.classId)
    .eq('attendance_date', query.attendanceDate)
    .eq('del_yn', false);

  const attendanceResult = await withSupabaseTimeout(
    attendancePromise,
    8000,
    { data: null, error: { message: 'Timeout tải điểm danh', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (attendanceResult.error) return { items: [], error: toAppError(attendanceResult.error, 'Không tải được dữ liệu điểm danh.') };

  const map = new Map<string, AttendanceRow>();
  ((attendanceResult.data || []) as unknown as AttendanceRow[]).forEach((row) => {
    map.set(row.student_id, row);
  });

  const items = (studentsResult.data || []).map((student) => {
    const existing = map.get(student.id);
    const classObj = Array.isArray(student.classes) ? student.classes[0] : student.classes;
    return {
      student_id: student.id,
      student_name: student.full_name,
      class_id: student.class_id,
      class_name: classObj?.name || 'N/A',
      attendance_id: existing?.id || null,
      status: existing?.status || 'absent',
      check_in_time: existing?.check_in_time || null,
      check_out_time: existing?.check_out_time || null,
      note: existing?.note || null,
    };
  });

  return { items, error: null };
}

export async function upsertAttendanceBulk(rows: UpsertAttendanceInput[]): Promise<{ error: AppError | null }> {
  if (rows.length === 0) return { error: null };

  const payload = rows.map((row) => ({
    student_id: row.student_id,
    class_id: row.class_id,
    attendance_date: row.attendance_date,
    status: row.status,
    check_in_time: row.check_in_time || null,
    check_out_time: row.check_out_time || null,
    note: row.note || null,
    created_by: row.created_by || null,
  }));

  const result = await withSupabaseTimeout(
    supabase
    .from('attendance')
    .upsert(payload, { onConflict: 'student_id,attendance_date' }),
    8000,
    { data: null, error: { message: 'Timeout lưu điểm danh', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  const error = result.error;
  if (error) return { error: toAppError(error, 'Lưu điểm danh thất bại.') };
  return { error: null };
}

export async function listAttendanceHistory(
  classId?: number,
  studentId?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ items: AttendanceRecord[]; error: AppError | null }> {
  let statement = supabase
    .from('attendance')
    .select('id, student_id, class_id, attendance_date, status, check_in_time, check_out_time, note, created_at, updated_at, students(id, full_name, classes(id, name))')
    .eq('del_yn', false)
    .order('attendance_date', { ascending: false });

  if (classId) statement = statement.eq('class_id', classId);
  if (studentId) statement = statement.eq('student_id', studentId);
  if (dateFrom) statement = statement.gte('attendance_date', dateFrom);
  if (dateTo) statement = statement.lte('attendance_date', dateTo);

  const queryPromise = statement.limit(500);
  const result = await withSupabaseTimeout(
    queryPromise,
    8000,
    { data: null, error: { message: 'Timeout tải lịch sử điểm danh', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { items: [], error: toAppError(result.error, 'Không tải được lịch sử điểm danh.') };

  return { items: ((result.data || []) as unknown as AttendanceRow[]).map(mapAttendance), error: null };
}
