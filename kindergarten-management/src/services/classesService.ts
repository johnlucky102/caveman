import { supabase } from '@/lib/supabase';
import { withSupabaseTimeout } from '@/lib/timeout';
import type {
  AppError,
  ClassListQuery,
  ClassRecord,
  CreateClassInput,
  ListEnvelope,
  UpdateClassInput,
} from '@/types/domain';
import { toAppError } from './supabaseErrors';

type ClassRow = {
  id: number;
  name: string;
  teacher_id: string | null;
  room: string | null;
  max_students: number;
  created_at: string;
  updated_at: string;
  description: string | null;
  class_type: 'Daycare' | 'Evening';
  meal_rate: number;
  cancel_rate: number;
  hospital_deduction_type: 'Fixed' | 'Daily';
  hospital_deduction_value: number;
  users: { id: string; full_name: string } | null;
  class_teachers: {
    id: string;
    teacher_id: string;
    role: string;
    users: { full_name: string } | null;
  }[];
};

function mapClassRow(row: ClassRow, studentCount: number): ClassRecord {
  return {
    id: row.id,
    name: row.name,
    teacher_id: row.teacher_id,
    teacher_name: row.users?.full_name || null,
    room: row.room,
    max_students: row.max_students,
    student_count: studentCount,
    description: row.description,
    class_type: row.class_type,
    meal_rate: row.meal_rate,
    cancel_rate: row.cancel_rate,
    hospital_deduction_type: row.hospital_deduction_type,
    hospital_deduction_value: row.hospital_deduction_value,
    teachers: (row.class_teachers || []).map(ct => ({
      id: ct.id,
      class_id: row.id,
      teacher_id: ct.teacher_id,
      teacher_name: ct.users?.full_name || 'N/A',
      role: ct.role as any,
      created_at: '',
    })),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getStudentCounts(classIds: number[]): Promise<Map<number, number>> {
  if (classIds.length === 0) return new Map();

  const result = await withSupabaseTimeout(
    supabase.from('students').select('class_id').in('class_id', classIds).eq('del_yn', false),
    5000,
    { data: null, error: { message: 'Timeout counting students', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error || !result.data) return new Map();

  const map = new Map<number, number>();
  for (const row of result.data) {
    const key = Number(row.class_id);
    map.set(key, (map.get(key) || 0) + 1);
  }

  return map;
}



export async function listClasses(query: ClassListQuery): Promise<{ data: ListEnvelope<ClassRecord>; error: AppError | null }> {
  const page = Math.max(1, query.page);
  const pageSize = Math.max(1, query.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let statement = supabase
    .from('classes')
    .select('id, name, teacher_id, room, max_students, description, created_at, updated_at, class_type, meal_rate, cancel_rate, hospital_deduction_type, hospital_deduction_value, users(id, full_name), class_teachers(id, teacher_id, role, users(full_name))', { count: 'exact' })
    .eq('del_yn', false);

  if (query.search?.trim()) {
    statement = statement.ilike('name', `%${query.search.trim()}%`);
  }

  if (query.teacherId) {
    // Note: In a real app with RLS, this might be redundant but good for explicit scoping
    // We check if teacher is the main teacher or assigned in class_teachers
    // Since we can't easily do a complex OR join on nested relations in a single simple query here without a join,
    // we use a subquery approach or filter by IDs found first.
    // For simplicity and consistency with other services, we'll fetch IDs first.
    const [directClasses, mappedClasses] = await Promise.all([
      supabase.from('classes').select('id').eq('teacher_id', query.teacherId).eq('del_yn', false),
      supabase.from('class_teachers').select('class_id').eq('teacher_id', query.teacherId)
    ]);
    const classIds = Array.from(new Set([
      ...(directClasses.data || []).map(c => c.id),
      ...(mappedClasses.data || []).map(c => c.class_id)
    ]));
    
    if (classIds.length === 0) {
      // Return early with empty results
      return {
        data: { items: [], total: 0, page, pageSize },
        error: null
      };
    }
    statement = statement.in('id', classIds);
  }

  const sortBy = query.sortBy || 'name';
  const sortDirection = (query.sortDirection || 'asc') === 'asc';
  statement = statement.order(sortBy, { ascending: sortDirection });

  const result = await withSupabaseTimeout(
    statement.range(from, to),
    8000,
    { data: null, count: null, error: { message: 'Timeout loading classes', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) {
    return {
      data: { items: [], total: 0, page, pageSize },
      error: toAppError(result.error, 'Không thể tải danh sách lớp học.'),
    };
  }

  const rows = (result.data || []) as unknown as ClassRow[];
  const countMap = await getStudentCounts(rows.map((row) => row.id));
  const items = rows.map((row) => mapClassRow(row, countMap.get(row.id) || 0));

  return {
    data: {
      items,
      total: result.count || 0,
      page,
      pageSize,
    },
    error: null,
  };
}

export async function getClassById(id: number): Promise<{ item: ClassRecord | null; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase
      .from('classes')
      .select('id, name, teacher_id, room, max_students, description, created_at, updated_at, class_type, meal_rate, cancel_rate, hospital_deduction_type, hospital_deduction_value, users(id, full_name), class_teachers(id, teacher_id, role, users(full_name))')
      .eq('id', id)
      .eq('del_yn', false)
      .maybeSingle(),
    8000,
    { data: null, error: { message: 'Timeout loading class', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Không thể tải thông tin lớp học.') };
  if (!result.data) return { item: null, error: null };

  const counts = await getStudentCounts([id]);
  return { item: mapClassRow(result.data as unknown as ClassRow, counts.get(id) || 0), error: null };
}

export async function createClass(payload: CreateClassInput): Promise<{ item: ClassRecord | null; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase
      .from('classes')
      .insert(payload)
      .select('id, name, teacher_id, room, max_students, description, created_at, updated_at, class_type, meal_rate, cancel_rate, hospital_deduction_type, hospital_deduction_value, users(id, full_name)')
      .single(),
    8000,
    { data: null, error: { message: 'Timeout creating class', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (!result.error && result.data) return { item: mapClassRow(result.data as unknown as ClassRow, 0), error: null };
  return { item: null, error: toAppError(result.error, 'Không thể tạo lớp học.') };
}

export async function updateClass(id: number, payload: UpdateClassInput): Promise<{ item: ClassRecord | null; error: AppError | null }> {
  const currentCounts = await getStudentCounts([id]);
  const currentStudentCount = currentCounts.get(id) || 0;
  if (payload.max_students != null && payload.max_students < currentStudentCount) {
    return {
      item: null,
      error: {
        code: 'VALIDATION',
        message: `Sĩ số tối đa không được nhỏ hơn số học sinh hiện tại (${currentStudentCount})`,
        field: 'max_students',
      },
    };
  }

  const result = await withSupabaseTimeout(
    supabase
      .from('classes')
      .update(payload)
      .eq('id', id)
      .select('id, name, teacher_id, room, max_students, description, created_at, updated_at, class_type, meal_rate, cancel_rate, hospital_deduction_type, hospital_deduction_value, users(id, full_name)')
      .single(),
    8000,
    { data: null, error: { message: 'Timeout updating class', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Không thể cập nhật lớp học.') };
  return { item: mapClassRow(result.data as unknown as ClassRow, currentStudentCount), error: null };
}

export async function deleteClass(id: number): Promise<{ error: AppError | null }> {
  const counts = await getStudentCounts([id]);
  const studentCount = counts.get(id) || 0;
  if (studentCount > 0) {
    return { error: { code: 'VALIDATION', message: 'Không thể xóa lớp đang có học sinh.' } };
  }

  const result = await withSupabaseTimeout(
    supabase.from('classes').update({ del_yn: true }).eq('id', id),
    8000,
    { data: null, error: { message: 'Timeout deleting class', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { error: toAppError(result.error, 'Không thể xóa lớp học.') };
  return { error: null };
}

export async function deleteClasses(ids: number[]): Promise<{ error: AppError | null }> {
  if (!ids.length) return { error: null };
  const counts = await getStudentCounts(ids);
  const hasStudents = Array.from(counts.values()).some((count) => count > 0);
  if (hasStudents) {
    return { error: { code: 'VALIDATION', message: 'Không thể xóa lớp đang có học sinh. Vui lòng bỏ chọn các lớp có học sinh.' } };
  }

  const result = await withSupabaseTimeout(
    supabase.from('classes').update({ del_yn: true }).in('id', ids),
    8000,
    { data: null, error: { message: 'Timeout deleting classes', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { error: toAppError(result.error, 'Không thể xóa danh sách lớp học.') };
  return { error: null };
}

export async function assignTeacherToClass(classId: number, teacherId: string, role: string): Promise<{ error: AppError | null }> {
  const { error } = await supabase
    .from('class_teachers')
    .upsert({ class_id: classId, teacher_id: teacherId, role }, { onConflict: 'class_id,teacher_id' });
  
  if (error) return { error: toAppError(error, 'Không thể phân công giáo viên.') };
  return { error: null };
}

export async function removeTeacherFromClass(classTeacherId: string): Promise<{ error: AppError | null }> {
  const { error } = await supabase
    .from('class_teachers')
    .delete()
    .eq('id', classTeacherId);
  
  if (error) return { error: toAppError(error, 'Không thể gỡ bỏ giáo viên khỏi lớp.') };
  return { error: null };
}
