import { supabase } from '@/lib/supabase';
import { withSupabaseTimeout } from '@/lib/timeout';
import type {
  AppError,
  CreateStudentInput,
  ListEnvelope,
  StudentListQuery,
  StudentRecord,
  UpdateStudentInput,
} from '@/types/domain';
import { toAppError } from './supabaseErrors';
import { invalidateSwCache } from '@/utils/swCacheInvalidate';
import { ensureRole, ensureStudentOwnership } from './serviceGuards';


type StudentRow = {
  id: string;
  class_id: number;
  student_code: string;
  full_name: string;
  date_of_birth: string | null;
  gender: 'Male' | 'Female' | null;
  ethnicity: string | null;
  nationality: string | null;
  address: string | null;
  enrolled_date: string | null;
  health_info: Record<string, unknown> | null;
  avatar: string | null;
  created_at: string;
  updated_at: string;
  classes: {
    id: number;
    name: string;
  } | null;
  student_parent?: {
    is_primary: boolean;
    relation_type: string;
    parents: {
      id: string;
      full_name: string;
      phone: string;
    };
  }[];
};

function mapStudentRow(row: StudentRow): StudentRecord {
  return {
    id: row.id,
    class_id: row.class_id,
    class_name: row.classes?.name || 'N/A',
    student_code: row.student_code,
    full_name: row.full_name,
    date_of_birth: row.date_of_birth,
    gender: row.gender,
    ethnicity: row.ethnicity,
    nationality: row.nationality,
    address: row.address,
    enrolled_date: row.enrolled_date,
    health_info: row.health_info || {},
    avatar: row.avatar,
    parents: row.student_parent?.map((sp: any) => ({
      id: sp.parents?.id,
      full_name: sp.parents?.full_name,
      phone: sp.parents?.phone,
      relationship: sp.relation_type,
      is_primary: sp.is_primary,
    })),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function generateStudentCode(): string {
  const value = Math.floor(Math.random() * 900000) + 100000;
  return `HS${value}`;
}

function isStudentCodeConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const maybe = error as { code?: unknown; message?: unknown; details?: unknown };
  const text = `${String(maybe.message || '')} ${String(maybe.details || '')}`.toLowerCase();
  return maybe.code === '23505' || (text.includes('student_code') && (text.includes('duplicate') || text.includes('unique')));
}

export async function listStudents(query: StudentListQuery): Promise<{ data: ListEnvelope<StudentRecord>; error: AppError | null }> {
  const page = Math.max(1, query.page);
  const pageSize = Math.max(1, query.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let statement = supabase
    .from('students')
    .select('id, class_id, student_code, full_name, date_of_birth, gender, ethnicity, nationality, address, enrolled_date, health_info, avatar, created_at, updated_at, classes(id, name), student_parent(is_primary, relation_type, parents(id, full_name, phone))', { count: 'exact' })
    .eq('del_yn', false);

  if (query.search?.trim()) {
    const term = query.search.trim();
    statement = statement.or(`full_name.ilike.%${term}%,student_code.ilike.%${term}%`);
  }
  if (query.classId) {
    statement = statement.eq('class_id', query.classId);
  }

  if (query.teacherId) {
    const [directClasses, mappedClasses] = await Promise.all([
      supabase.from('classes').select('id').eq('teacher_id', query.teacherId).eq('del_yn', false),
      supabase.from('class_teachers').select('class_id').eq('teacher_id', query.teacherId)
    ]);
    const classIds = Array.from(new Set([
      ...(directClasses.data || []).map(c => c.id),
      ...(mappedClasses.data || []).map(c => c.class_id)
    ]));

    if (classIds.length === 0) {
      return { data: { items: [], total: 0, page, pageSize }, error: null };
    }
    
    // If classId is specified, check if it's in the allowed list
    if (query.classId && !classIds.includes(query.classId)) {
      return { data: { items: [], total: 0, page, pageSize }, error: null };
    }

    statement = statement.in('class_id', classIds);
  }

  const sortBy = query.sortBy || 'created_at';
  const ascending = (query.sortDirection || 'desc') === 'asc';
  statement = statement.order(sortBy, { ascending });

  const result = await withSupabaseTimeout(
    statement.range(from, to),
    8000,
    { data: null, count: null, error: { message: 'Timeout loading students', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) {
    return {
      data: { items: [], total: 0, page, pageSize },
      error: toAppError(result.error, 'Không thể tải danh sách học sinh.'),
    };
  }

  return {
    data: {
      items: ((result.data || []) as unknown as StudentRow[]).map(mapStudentRow),
      total: result.count || 0,
      page,
      pageSize,
    },
    error: null,
  };
}

export async function getStudentById(id: string): Promise<{ item: StudentRecord | null; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase
      .from('students')
      .select('id, class_id, student_code, full_name, date_of_birth, gender, ethnicity, nationality, address, enrolled_date, health_info, avatar, created_at, updated_at, classes(id, name), student_parent(is_primary, relation_type, parents(id, full_name, phone))')
      .eq('id', id)
      .eq('del_yn', false)
      .maybeSingle(),
    8000,
    { data: null, error: { message: 'Timeout loading student profile', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Không thể tải hồ sơ học sinh.') };
  if (!result.data) return { item: null, error: null };
  return { item: mapStudentRow(result.data as unknown as StudentRow), error: null };
}

export async function createStudent(payload: CreateStudentInput): Promise<{ item: StudentRecord | null; error: AppError | null }> {
  const accessError = await ensureRole(['Admin']);
  if (accessError.error) return { item: null, error: accessError.error };

  const shouldGenerateCode = !payload.student_code?.trim();
  const maxAttempts = shouldGenerateCode ? 5 : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const insertPayload = {
      ...payload,
      student_code: shouldGenerateCode ? generateStudentCode() : payload.student_code?.trim(),
    };

    const result = await withSupabaseTimeout(
      supabase
        .from('students')
        .insert(insertPayload)
        .select('id, class_id, student_code, full_name, date_of_birth, gender, ethnicity, nationality, address, enrolled_date, health_info, avatar, created_at, updated_at, classes(id, name)')
        .single(),
      8000,
      { data: null, error: { message: 'Timeout creating student', details: '', hint: '', code: 'TIMEOUT' } } as any
    );

    if (!result.error && result.data) {
      invalidateSwCache(['students']);
      return { item: mapStudentRow(result.data as unknown as StudentRow), error: null };
    }
    if (!shouldGenerateCode || !isStudentCodeConflict(result.error) || attempt === maxAttempts) {
      return { item: null, error: toAppError(result.error, 'Không thể tạo hồ sơ học sinh.') };
    }
  }

  return { item: null, error: { code: 'CONFLICT', message: 'Không thể tạo mã học sinh duy nhất.' } };
}

export async function updateStudent(id: string, payload: UpdateStudentInput, userId?: string): Promise<{ item: StudentRecord | null; error: AppError | null }> {
  const ownership = await ensureStudentOwnership(id);
  if (ownership.error) return { item: null, error: ownership.error };

  const { student_code: _studentCode, ...safePayload } = payload;
  const result = await withSupabaseTimeout(
    supabase
      .from('students')
      .update({
        ...safePayload,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, class_id, student_code, full_name, date_of_birth, gender, ethnicity, nationality, address, enrolled_date, health_info, avatar, created_at, updated_at, classes(id, name)')
      .single(),
    8000,
    { data: null, error: { message: 'Timeout updating student', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Không thể cập nhật hồ sơ học sinh.') };
  invalidateSwCache(['students']);
  return { item: mapStudentRow(result.data as unknown as StudentRow), error: null };
}

export async function deleteStudent(id: string): Promise<{ error: AppError | null }> {
  const accessError = await ensureRole(['Admin']);
  if (accessError.error) return { error: accessError.error };

  // Soft delete related records first
  await supabase.from('attendance').update({ del_yn: true }).eq('student_id', id);
  await supabase.from('fee_records').update({ del_yn: true }).eq('student_id', id);
  await supabase.from('notifications').update({ del_yn: true }).eq('student_id', id);

  const result = await withSupabaseTimeout(
    supabase.from('students').update({ del_yn: true }).eq('id', id),
    8000,
    { data: null, error: { message: 'Timeout deleting student', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { error: toAppError(result.error, 'Không thể xóa học sinh.') };
  invalidateSwCache(['students', 'attendance', 'fee_records']);
  return { error: null };
}

export async function deleteStudents(ids: string[]): Promise<{ error: AppError | null }> {
  const accessError = await ensureRole(['Admin']);
  if (accessError.error) return { error: accessError.error };

  if (!ids.length) return { error: null };
  await supabase.from('attendance').update({ del_yn: true }).in('student_id', ids);
  await supabase.from('fee_records').update({ del_yn: true }).in('student_id', ids);
  await supabase.from('notifications').update({ del_yn: true }).in('student_id', ids);

  const result = await withSupabaseTimeout(
    supabase.from('students').update({ del_yn: true }).in('id', ids),
    8000,
    { data: null, error: { message: 'Timeout deleting students', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { error: toAppError(result.error, 'Không thể xóa danh sách học sinh.') };
  return { error: null };
}
