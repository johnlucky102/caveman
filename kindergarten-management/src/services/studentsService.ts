import { supabase } from '@/lib/supabase';
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
    grades: { id: number; name: string } | null;
  } | null;
};

function mapStudentRow(row: StudentRow): StudentRecord {
  return {
    id: row.id,
    class_id: row.class_id,
    class_name: row.classes?.name || 'N/A',
    grade_name: row.classes?.grades?.name || 'N/A',
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

export async function listStudents(query: StudentListQuery): Promise<{ data: ListEnvelope<StudentRecord>; error: AppError | null }> {
  const page = Math.max(1, query.page);
  const pageSize = Math.max(1, query.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let statement = supabase
    .from('students')
    .select('id, class_id, student_code, full_name, date_of_birth, gender, ethnicity, nationality, address, enrolled_date, health_info, avatar, created_at, updated_at, classes(id, name, grades(id, name))', { count: 'exact' });

  if (query.search?.trim()) {
    const term = query.search.trim();
    statement = statement.or(`full_name.ilike.%${term}%,student_code.ilike.%${term}%`);
  }
  if (query.classId) {
    statement = statement.eq('class_id', query.classId);
  }
  if (query.gradeId) {
    const { data: classesByGrade, error: gradeFilterError } = await supabase
      .from('classes')
      .select('id')
      .eq('grade_id', query.gradeId);
    if (gradeFilterError) {
      return {
        data: { items: [], total: 0, page, pageSize },
        error: toAppError(gradeFilterError, 'Không lọc được theo khối.'),
      };
    }
    const classIds = (classesByGrade || []).map((item) => item.id);
    if (classIds.length === 0) {
      return {
        data: { items: [], total: 0, page, pageSize },
        error: null,
      };
    }
    statement = statement.in('class_id', classIds);
  }

  const sortBy = query.sortBy || 'created_at';
  const ascending = (query.sortDirection || 'desc') === 'asc';
  statement = statement.order(sortBy, { ascending });

  const { data, count, error } = await statement.range(from, to);
  if (error) {
    return {
      data: { items: [], total: 0, page, pageSize },
      error: toAppError(error, 'Không lấy được danh sách học sinh.'),
    };
  }

  return {
    data: {
      items: ((data || []) as unknown as StudentRow[]).map(mapStudentRow),
      total: count || 0,
      page,
      pageSize,
    },
    error: null,
  };
}

export async function getStudentById(id: string): Promise<{ item: StudentRecord | null; error: AppError | null }> {
  const { data, error } = await supabase
    .from('students')
    .select('id, class_id, student_code, full_name, date_of_birth, gender, ethnicity, nationality, address, enrolled_date, health_info, avatar, created_at, updated_at, classes(id, name, grades(id, name))')
    .eq('id', id)
    .maybeSingle();

  if (error) return { item: null, error: toAppError(error, 'Không lấy được thông tin học sinh.') };
  if (!data) return { item: null, error: null };
  return { item: mapStudentRow(data as unknown as StudentRow), error: null };
}

export async function createStudent(payload: CreateStudentInput): Promise<{ item: StudentRecord | null; error: AppError | null }> {
  const insertPayload = {
    ...payload,
    student_code: payload.student_code?.trim() || generateStudentCode(),
  };

  const { data, error } = await supabase
    .from('students')
    .insert(insertPayload)
    .select('id, class_id, student_code, full_name, date_of_birth, gender, ethnicity, nationality, address, enrolled_date, health_info, avatar, created_at, updated_at, classes(id, name, grades(id, name))')
    .single();

  if (error) return { item: null, error: toAppError(error, 'Tạo học sinh thất bại.') };
  return { item: mapStudentRow(data as unknown as StudentRow), error: null };
}

export async function updateStudent(id: string, payload: UpdateStudentInput): Promise<{ item: StudentRecord | null; error: AppError | null }> {
  const { data, error } = await supabase
    .from('students')
    .update(payload)
    .eq('id', id)
    .select('id, class_id, student_code, full_name, date_of_birth, gender, ethnicity, nationality, address, enrolled_date, health_info, avatar, created_at, updated_at, classes(id, name, grades(id, name))')
    .single();

  if (error) return { item: null, error: toAppError(error, 'Cập nhật học sinh thất bại.') };
  return { item: mapStudentRow(data as unknown as StudentRow), error: null };
}
