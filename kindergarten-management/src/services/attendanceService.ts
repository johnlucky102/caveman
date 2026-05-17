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
import { invalidateSwCache } from '@/utils/swCacheInvalidate';
import { invalidateCache } from '@/hooks/useServiceCache';
import { ensureClassOwnership } from './serviceGuards';


type AttendanceRow = {
  id: string;
  student_id: string;
  class_id: number;
  attendance_date: string;
  status: AttendanceStatusValue;
  check_in_time: string | null;
  check_out_time: string | null;
  meal_included: boolean;
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
    meal_included: row.meal_included,
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
  meal_included: boolean;
}

export async function listAttendanceByClassAndDate(query: AttendanceListQuery): Promise<{ items: AttendanceStudentItem[]; error: AppError | null }> {
  // If teacherId is provided, verify they manage this class first
  if (query.teacherId) {
    // 1. Check direct ownership
    const { data: directClass } = await supabase
      .from('classes')
      .select('id')
      .eq('id', query.classId)
      .eq('teacher_id', query.teacherId)
      .eq('del_yn', false)
      .maybeSingle();

    if (!directClass) {
      // 2. Check secondary ownership (class_teachers table)
      const { data: secondaryClass } = await supabase
        .from('class_teachers')
        .select('class_id')
        .eq('class_id', query.classId)
        .eq('teacher_id', query.teacherId)
        .maybeSingle();

      if (!secondaryClass) {
        return { items: [], error: { code: 'FORBIDDEN', message: 'Bạn không có quyền xem dữ liệu lớp học này.' } };
      }
    }
  }

  // Run both queries in parallel — halves network round-trips vs sequential
  const [studentsResult, attendanceResult] = await Promise.all([
    withSupabaseTimeout(
      supabase
        .from('students')
        .select('id, full_name, class_id, classes(id, name)')
        .eq('class_id', query.classId)
        .eq('del_yn', false)
        .order('full_name', { ascending: true }),
      8000,
      { data: null, error: { message: 'Timeout tải học sinh', details: '', hint: '', code: 'TIMEOUT' } } as any
    ),
    withSupabaseTimeout(
      supabase
        .from('attendance')
        .select('id, student_id, class_id, attendance_date, status, check_in_time, check_out_time, meal_included, created_at, updated_at, students(id, full_name, classes(id, name))')
        .eq('class_id', query.classId)
        .eq('attendance_date', query.attendanceDate)
        .eq('del_yn', false),
      8000,
      { data: null, error: { message: 'Timeout tải điểm danh', details: '', hint: '', code: 'TIMEOUT' } } as any
    ),
  ]);

  if (studentsResult.error) return { items: [], error: toAppError(studentsResult.error, 'Không tải được danh sách học sinh để điểm danh.') };
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
      status: existing?.status || 'present',
      check_in_time: existing?.check_in_time || null,
      check_out_time: existing?.check_out_time || null,
      meal_included: existing?.meal_included ?? true,
    };
  });

  return { items, error: null };
}

export async function upsertAttendanceBulk(rows: UpsertAttendanceInput[]): Promise<{ error: AppError | null }> {
  if (rows.length === 0) return { error: null };

  // 1. Verify ownership for all unique classes in the request
  const uniqueClassIds = Array.from(new Set(rows.map(r => r.class_id)));
  for (const classId of uniqueClassIds) {
    const ownership = await ensureClassOwnership(classId);
    if (ownership.error) return { error: ownership.error };
  }

  const payload = rows.map((row) => {
    const isOff = row.status === 'absent';
    
    return {
      student_id: row.student_id,
      class_id: row.class_id,
      attendance_date: row.attendance_date,
      status: row.status,
      check_in_time: row.check_in_time || null,
      check_out_time: row.check_out_time || null,
      meal_included: isOff ? false : (row.meal_included ?? true),
      created_by: row.created_by || null,
      updated_at: new Date().toISOString(),
    };
  });

  const result = await withSupabaseTimeout(
    supabase
    .from('attendance')
    .upsert(payload, { onConflict: 'student_id,attendance_date' }),
    8000,
    { data: null, error: { message: 'Timeout lưu điểm danh', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  const error = result.error;
  if (error) return { error: toAppError(error, 'Lưu điểm danh thất bại.') };

  // 3. Trigger background fee sync for the NEXT month (T+1)
  const affectedClasses = Array.from(new Set(rows.map(r => r.class_id)));
  const affectedMonths = Array.from(new Set(rows.map(r => r.attendance_date.slice(0, 7))));

  import('./feesService').then(({ bulkSyncFeesByFilter }) => {
    affectedMonths.forEach(ym => {
      const [y, m] = ym.split('-').map(Number);
      let targetM = m + 1;
      let targetY = y;
      if (targetM > 12) {
        targetM = 1;
        targetY++;
      }

      affectedClasses.forEach(cId => {
        bulkSyncFeesByFilter({
          class_id: cId,
          month: targetM,
          school_year: String(targetY)
        }).catch(e => console.error('[AutoSync] Failed to sync fees for class', cId, e));
      });
    });
  }).catch(e => console.error('[AutoSync] Failed to load feesService', e));

  return { error: null };
}

export async function listAttendanceHistory(
  classId?: number,
  studentId?: string,
  fromDate?: string,
  toDate?: string,
  teacherId?: string,
  page?: number,
  pageSize?: number,
  status?: string,
  search?: string,
): Promise<{ items: AttendanceRecord[]; total: number; error: AppError | null }> {
  // If teacherId is provided, verify they manage this class first
  if (teacherId && classId !== undefined) {
    const { data: directClass } = await supabase
      .from('classes')
      .select('id')
      .eq('id', classId)
      .eq('teacher_id', teacherId)
      .eq('del_yn', false)
      .maybeSingle();

    if (!directClass) {
      const { data: secondaryClass } = await supabase
        .from('class_teachers')
        .select('class_id')
        .eq('class_id', classId)
        .eq('teacher_id', teacherId)
        .maybeSingle();

      if (!secondaryClass) {
        return { items: [], total: 0, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền xem dữ liệu lớp học này.' } };
      }
    }
  }

  let query = supabase
    .from('attendance')
    .select('id, student_id, class_id, attendance_date, status, check_in_time, check_out_time, meal_included, created_at, updated_at, students!inner(id, full_name, classes!inner(id, name))')
    .eq('del_yn', false);

  if (classId !== undefined) {
    query = query.eq('class_id', classId);
  }

  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  if (fromDate) {
    query = query.gte('attendance_date', fromDate);
  }

  if (toDate) {
    query = query.lte('attendance_date', toDate);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.ilike('students.full_name', `%${search}%`);
  }

  // Get total count first
  let countQuery = supabase
    .from('attendance')
    .select('id', { count: 'exact', head: true })
    .eq('del_yn', false);

  if (classId !== undefined) {
    countQuery = countQuery.eq('class_id', classId);
  }

  if (studentId) {
    countQuery = countQuery.eq('student_id', studentId);
  }

  if (fromDate) {
    countQuery = countQuery.gte('attendance_date', fromDate);
  }

  if (toDate) {
    countQuery = countQuery.lte('attendance_date', toDate);
  }

  if (status) {
    countQuery = countQuery.eq('status', status);
  }

  if (search) {
    countQuery = countQuery.ilike('students.full_name', `%${search}%`);
  }

  const { count: totalCount } = await countQuery;

  // Apply pagination
  if (page && pageSize) {
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);
  } else {
    query = query.limit(500); // Default limit for backward compatibility
  }

  const result = await withSupabaseTimeout(
    query.order('attendance_date', { ascending: false }),
    10000,
    { data: null, error: { message: 'Timeout tải lịch sử điểm danh', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) {
    return { items: [], total: 0, error: toAppError(result.error, 'Không tải được lịch sử điểm danh.') };
  }

  return {
    items: ((result.data || []) as unknown as AttendanceRow[]).map(mapAttendance),
    total: totalCount || 0,
    error: null,
  };
}
