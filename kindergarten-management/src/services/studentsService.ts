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
    .select('id, class_id, student_code, full_name, date_of_birth, gender, ethnicity, nationality, address, enrolled_date, health_info, avatar, created_at, updated_at, classes(id, name)', { count: 'exact' });

  if (query.search?.trim()) {
    const term = query.search.trim();
    statement = statement.or(`full_name.ilike.%${term}%,student_code.ilike.%${term}%`);
  }
  if (query.classId) {
    statement = statement.eq('class_id', query.classId);
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
      error: toAppError(result.error, 'Cannot load students.'),
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
      .select('id, class_id, student_code, full_name, date_of_birth, gender, ethnicity, nationality, address, enrolled_date, health_info, avatar, created_at, updated_at, classes(id, name)')
      .eq('id', id)
      .maybeSingle(),
    8000,
    { data: null, error: { message: 'Timeout loading student profile', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Cannot load student profile.') };
  if (!result.data) return { item: null, error: null };
  return { item: mapStudentRow(result.data as unknown as StudentRow), error: null };
}

export async function createStudent(payload: CreateStudentInput): Promise<{ item: StudentRecord | null; error: AppError | null }> {
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

    if (!result.error && result.data) return { item: mapStudentRow(result.data as unknown as StudentRow), error: null };
    if (!shouldGenerateCode || !isStudentCodeConflict(result.error) || attempt === maxAttempts) {
      return { item: null, error: toAppError(result.error, 'Cannot create student.') };
    }
  }

  return { item: null, error: { code: 'CONFLICT', message: 'Cannot generate unique student code.' } };
}

export async function updateStudent(id: string, payload: UpdateStudentInput): Promise<{ item: StudentRecord | null; error: AppError | null }> {
  const { student_code: _studentCode, ...safePayload } = payload;
  const result = await withSupabaseTimeout(
    supabase
      .from('students')
      .update(safePayload)
      .eq('id', id)
      .select('id, class_id, student_code, full_name, date_of_birth, gender, ethnicity, nationality, address, enrolled_date, health_info, avatar, created_at, updated_at, classes(id, name)')
      .single(),
    8000,
    { data: null, error: { message: 'Timeout updating student', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Cannot update student.') };
  return { item: mapStudentRow(result.data as unknown as StudentRow), error: null };
}

export async function deleteStudent(id: string): Promise<{ error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase.from('students').delete().eq('id', id),
    8000,
    { data: null, error: { message: 'Timeout deleting student', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { error: toAppError(result.error, 'Cannot delete student.') };
  return { error: null };
}
