import { supabase } from '@/lib/supabase';
import type {
  AppError,
  ClassListQuery,
  ClassRecord,
  CreateClassInput,
  GradeRecord,
  ListEnvelope,
  UpdateClassInput,
} from '@/types/domain';
import { toAppError } from './supabaseErrors';

type ClassRow = {
  id: number;
  name: string;
  grade_id: number;
  teacher_id: string | null;
  room: string | null;
  max_students: number;
  description: string | null;
  created_at: string;
  updated_at: string;
  grades: { id: number; name: string } | null;
  users: { id: string; full_name: string } | null;
};

function mapClassRow(row: ClassRow, studentCount: number): ClassRecord {
  return {
    id: row.id,
    name: row.name,
    grade_id: row.grade_id,
    grade_name: row.grades?.name || 'N/A',
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

  const { data, error } = await supabase
    .from('students')
    .select('class_id')
    .in('class_id', classIds);

  if (error || !data) return new Map();

  const map = new Map<number, number>();
  for (const row of data) {
    const key = Number(row.class_id);
    map.set(key, (map.get(key) || 0) + 1);
  }

  return map;
}

export async function listGrades(): Promise<{ items: GradeRecord[]; error: AppError | null }> {
  const { data, error } = await supabase
    .from('grades')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: true });

  if (error) return { items: [], error: toAppError(error, 'Không lấy được danh sách khối.') };

  return {
    items: (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      sort_order: row.sort_order,
    })),
    error: null,
  };
}

export async function listClasses(query: ClassListQuery): Promise<{ data: ListEnvelope<ClassRecord>; error: AppError | null }> {
  const page = Math.max(1, query.page);
  const pageSize = Math.max(1, query.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let statement = supabase
    .from('classes')
    .select('id, name, grade_id, teacher_id, room, max_students, description, created_at, updated_at, grades(id, name), users(id, full_name)', { count: 'exact' });

  if (query.search?.trim()) {
    statement = statement.ilike('name', `%${query.search.trim()}%`);
  }
  if (query.gradeId) {
    statement = statement.eq('grade_id', query.gradeId);
  }

  const sortBy = query.sortBy || 'name';
  const sortDirection = (query.sortDirection || 'asc') === 'asc';
  statement = statement.order(sortBy, { ascending: sortDirection });

  const { data, count, error } = await statement.range(from, to);
  if (error) {
    return {
      data: { items: [], total: 0, page, pageSize },
      error: toAppError(error, 'Không lấy được danh sách lớp học.'),
    };
  }

  const rows = (data || []) as unknown as ClassRow[];
  const classIds = rows.map((row) => row.id);
  const countMap = await getStudentCounts(classIds);
  const items = rows.map((row) => mapClassRow(row, countMap.get(row.id) || 0));

  return {
    data: {
      items,
      total: count || 0,
      page,
      pageSize,
    },
    error: null,
  };
}

export async function getClassById(id: number): Promise<{ item: ClassRecord | null; error: AppError | null }> {
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, grade_id, teacher_id, room, max_students, description, created_at, updated_at, grades(id, name), users(id, full_name)')
    .eq('id', id)
    .maybeSingle();

  if (error) return { item: null, error: toAppError(error, 'Không lấy được thông tin lớp học.') };
  if (!data) return { item: null, error: null };

  const counts = await getStudentCounts([id]);
  return { item: mapClassRow(data as unknown as ClassRow, counts.get(id) || 0), error: null };
}

export async function createClass(payload: CreateClassInput): Promise<{ item: ClassRecord | null; error: AppError | null }> {
  const { data, error } = await supabase
    .from('classes')
    .insert(payload)
    .select('id, name, grade_id, teacher_id, room, max_students, description, created_at, updated_at, grades(id, name), users(id, full_name)')
    .single();

  if (error) return { item: null, error: toAppError(error, 'Tạo lớp học thất bại.') };
  return { item: mapClassRow(data as unknown as ClassRow, 0), error: null };
}

export async function updateClass(id: number, payload: UpdateClassInput): Promise<{ item: ClassRecord | null; error: AppError | null }> {
  const { data, error } = await supabase
    .from('classes')
    .update(payload)
    .eq('id', id)
    .select('id, name, grade_id, teacher_id, room, max_students, description, created_at, updated_at, grades(id, name), users(id, full_name)')
    .single();

  if (error) return { item: null, error: toAppError(error, 'Cập nhật lớp học thất bại.') };
  const counts = await getStudentCounts([id]);
  return { item: mapClassRow(data as unknown as ClassRow, counts.get(id) || 0), error: null };
}
