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
  class_code: string | null;
  teacher_id: string | null;
  room: string | null;
  max_students: number;
  description: string | null;
  created_at: string;
  updated_at: string;
  users: { id: string; full_name: string } | null;
};

function mapClassRow(row: ClassRow, studentCount: number): ClassRecord {
  return {
    id: row.id,
    name: row.name,
    class_code: row.class_code,
    teacher_id: row.teacher_id,
    teacher_name: row.users?.full_name || null,
    room: row.room,
    max_students: row.max_students,
    student_count: studentCount,
    description: row.description,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getStudentCounts(classIds: number[]): Promise<Map<number, number>> {
  if (classIds.length === 0) return new Map();

  const result = await withSupabaseTimeout(
    supabase.from('students').select('class_id').in('class_id', classIds),
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

function generateClassCode(): string {
  const value = Math.floor(Math.random() * 900000) + 100000;
  return `LH${value}`;
}

function isClassCodeConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const maybe = error as { code?: unknown; message?: unknown; details?: unknown };
  const text = `${String(maybe.message || '')} ${String(maybe.details || '')}`.toLowerCase();
  return maybe.code === '23505' || (text.includes('class_code') && (text.includes('duplicate') || text.includes('unique')));
}

export async function listClasses(query: ClassListQuery): Promise<{ data: ListEnvelope<ClassRecord>; error: AppError | null }> {
  const page = Math.max(1, query.page);
  const pageSize = Math.max(1, query.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let statement = supabase
    .from('classes')
    .select('id, name, class_code, teacher_id, room, max_students, description, created_at, updated_at, users(id, full_name)', { count: 'exact' });

  if (query.search?.trim()) {
    statement = statement.ilike('name', `%${query.search.trim()}%`);
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
      error: toAppError(result.error, 'Cannot load classes.'),
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
      .select('id, name, class_code, teacher_id, room, max_students, description, created_at, updated_at, users(id, full_name)')
      .eq('id', id)
      .maybeSingle(),
    8000,
    { data: null, error: { message: 'Timeout loading class', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Cannot load class.') };
  if (!result.data) return { item: null, error: null };

  const counts = await getStudentCounts([id]);
  return { item: mapClassRow(result.data as unknown as ClassRow, counts.get(id) || 0), error: null };
}

export async function createClass(payload: CreateClassInput): Promise<{ item: ClassRecord | null; error: AppError | null }> {
  const shouldGenerateCode = !payload.class_code?.trim();
  const maxAttempts = shouldGenerateCode ? 5 : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const insertPayload = {
      ...payload,
      class_code: shouldGenerateCode ? generateClassCode() : payload.class_code?.trim(),
    };

    const result = await withSupabaseTimeout(
      supabase
        .from('classes')
        .insert(insertPayload)
        .select('id, name, class_code, teacher_id, room, max_students, description, created_at, updated_at, users(id, full_name)')
        .single(),
      8000,
      { data: null, error: { message: 'Timeout creating class', details: '', hint: '', code: 'TIMEOUT' } } as any
    );

    if (!result.error && result.data) return { item: mapClassRow(result.data as unknown as ClassRow, 0), error: null };
    if (!shouldGenerateCode || !isClassCodeConflict(result.error) || attempt === maxAttempts) {
      return { item: null, error: toAppError(result.error, 'Cannot create class.') };
    }
  }

  return { item: null, error: { code: 'CONFLICT', message: 'Cannot generate unique class code.' } };
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

  const { class_code: _classCode, ...safePayload } = payload;
  const result = await withSupabaseTimeout(
    supabase
      .from('classes')
      .update(safePayload)
      .eq('id', id)
      .select('id, name, class_code, teacher_id, room, max_students, description, created_at, updated_at, users(id, full_name)')
      .single(),
    8000,
    { data: null, error: { message: 'Timeout updating class', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Cannot update class.') };
  return { item: mapClassRow(result.data as unknown as ClassRow, currentStudentCount), error: null };
}

export async function deleteClass(id: number): Promise<{ error: AppError | null }> {
  const counts = await getStudentCounts([id]);
  const studentCount = counts.get(id) || 0;
  if (studentCount > 0) {
    return { error: { code: 'VALIDATION', message: 'Không thể xóa lớp đang có học sinh.' } };
  }

  const result = await withSupabaseTimeout(
    supabase.from('classes').delete().eq('id', id),
    8000,
    { data: null, error: { message: 'Timeout deleting class', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { error: toAppError(result.error, 'Cannot delete class.') };
  return { error: null };
}
