import { supabase } from '@/lib/supabase';
import { withSupabaseTimeout } from '@/lib/timeout';
import type { AppError, AppRole, CreateParentInput, ParentRecord, UpdateParentInput, UserProfile } from '@/types/domain';
import { toAppError } from './supabaseErrors';

export interface TeacherProfileInput {
  full_name: string;
  phone: string | null;
  avatar: string | null;
  email?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  qualification?: string | null;
  start_date?: string | null;
  status?: string | null;
  password?: string;
}

type UserRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  avatar: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  qualification: string | null;
  start_date: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizeRole(role?: string | null): AppRole {
  if (role === 'Admin' || role === 'Teacher' || role === 'Accountant' || role === 'Parent') {
    return role;
  }
  return 'Parent';
}

function mapUserRow(row: UserRow): UserProfile {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    role: normalizeRole(row.role),
    avatar: row.avatar,
    gender: row.gender as any,
    date_of_birth: row.date_of_birth,
    address: row.address,
    qualification: row.qualification,
    start_date: row.start_date,
    status: row.status as any,
    teacher_code: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function generateTeacherCode(): string {
  const value = Math.floor(Math.random() * 900000) + 100000;
  return `GV${value}`;
}

function generateTemporaryPassword(): string {
  const value = Math.random().toString(36).slice(2, 10);
  return `Kid@${value}9`;
}

function isTeacherCodeConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const maybe = error as { code?: unknown; message?: unknown; details?: unknown };
  const text = `${String(maybe.message || '')} ${String(maybe.details || '')}`.toLowerCase();
  return maybe.code === '23505' || (text.includes('teacher_code') && (text.includes('duplicate') || text.includes('unique')));
}

export async function fetchMyProfile(userId: string): Promise<{ profile: UserProfile | null; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase
      .from('users')
      .select('id, full_name, email, phone, role, avatar, gender, date_of_birth, address, qualification, start_date, status, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle(),
    8000,
    { data: null, error: { message: 'Timeout loading user profile', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { profile: null, error: toAppError(result.error, 'Không thể tải thông tin cá nhân.') };
  if (!result.data) return { profile: null, error: null };
  return { profile: mapUserRow(result.data as UserRow), error: null };
}

export async function listTeachers(): Promise<{ items: UserProfile[]; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase
      .from('users')
      .select('id, full_name, email, phone, role, avatar, gender, date_of_birth, address, qualification, start_date, status, created_at, updated_at')
      .eq('role', 'Teacher')
      .eq('del_yn', false)
      .order('full_name', { ascending: true }),
    8000,
    { data: null, error: { message: 'Timeout loading teachers', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { items: [], error: toAppError(result.error, 'Không thể tải danh sách giáo viên.') };
  return { items: ((result.data || []) as UserRow[]).map(mapUserRow), error: null };
}

export async function getTeacherById(id: string): Promise<{ item: UserProfile | null; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase
      .from('users')
      .select('id, full_name, email, phone, role, avatar, gender, date_of_birth, address, qualification, start_date, status, created_at, updated_at')
      .eq('id', id)
      .eq('role', 'Teacher')
      .eq('del_yn', false)
      .maybeSingle(),
    8000,
    { data: null, error: { message: 'Timeout loading teacher', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Không thể tải thông tin giáo viên.') };
  if (!result.data) return { item: null, error: null };
  return { item: mapUserRow(result.data as UserRow), error: null };
}

export async function createTeacherProfile(payload: TeacherProfileInput): Promise<{ item: UserProfile | null; error: AppError | null }> {
  if (!payload.email?.trim()) {
    return { item: null, error: { code: 'VALIDATION', message: 'Email giáo viên là bắt buộc.', field: 'email' } };
  }

  // Call Edge Function to create user securely
  const { data, error: funcError } = await supabase.functions.invoke('create-user', {
    body: {
      email: payload.email.trim(),
      password: payload.password || generateTemporaryPassword(),
      full_name: payload.full_name,
      phone: payload.phone,
      role: 'Teacher',
    }
  });

  if (funcError || !data?.user) {
    const errorMsg = funcError?.message || data?.error || 'Không thể tạo tài khoản giáo viên.';
    return { item: null, error: { code: 'FUNCTION_ERROR', message: errorMsg } };
  }

  // The Edge Function already inserted the profile. Fetch it to return.
  return getTeacherById(data.user.id);

  return { item: null, error: { code: 'CONFLICT', message: 'Không thể tạo mã giáo viên duy nhất.' } };
}

export async function updateTeacherProfile(id: string, payload: TeacherProfileInput): Promise<{ item: UserProfile | null; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase
      .from('users')
      .update({
        full_name: payload.full_name,
        phone: payload.phone,
        avatar: payload.avatar,
        role: 'Teacher',
      })
      .eq('id', id)
      .eq('role', 'Teacher')
      .select('id, full_name, email, phone, role, avatar, gender, date_of_birth, address, qualification, start_date, status, created_at, updated_at')
      .single(),
    8000,
    { data: null, error: { message: 'Timeout updating teacher', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Không thể cập nhật giáo viên.') };
  return { item: mapUserRow(result.data as UserRow), error: null };
}

export async function deleteTeacherProfile(id: string): Promise<{ error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase.from('users').update({ del_yn: true }).eq('id', id).eq('role', 'Teacher'),
    8000,
    { data: null, error: { message: 'Timeout deleting teacher', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { error: toAppError(result.error, 'Không thể xóa giáo viên.') };
  return { error: null };
}

export async function deleteTeacherProfiles(ids: string[]): Promise<{ error: AppError | null }> {
  if (!ids.length) return { error: null };
  const result = await withSupabaseTimeout(
    supabase.from('users').update({ del_yn: true }).in('id', ids).eq('role', 'Teacher'),
    8000,
    { data: null, error: { message: 'Timeout deleting teachers', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { error: toAppError(result.error, 'Không thể xóa danh sách giáo viên.') };
  return { error: null };
}

export async function listParents(): Promise<{ items: ParentRecord[]; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase
      .from('parents')
      .select('*, student_parent(student_id, students(full_name, class_id, classes(name)))')
      .eq('del_yn', false)
      .order('full_name', { ascending: true }),
    8000,
    { data: null, error: { message: 'Timeout loading parents', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { items: [], error: toAppError(result.error, 'Không thể tải danh sách phụ huynh.') };
  
  // Transform to flatten students
  const items = (result.data || []).map((p: any) => ({
    ...p,
    students: p.student_parent?.map((sp: any) => ({
      id: sp.student_id,
      full_name: sp.students?.full_name,
      class_name: sp.students?.classes?.name
    })) || []
  }));

  return { items, error: null };
}

export async function getParentById(id: string): Promise<{ item: ParentRecord | null; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase
      .from('parents')
      .select('*, student_parent(student_id, students(full_name, class_id, classes(name)))')
      .eq('id', id)
      .eq('del_yn', false)
      .maybeSingle(),
    8000,
    { data: null, error: { message: 'Timeout tải thông tin phụ huynh', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Không thể tải thông tin phụ huynh.') };
  if (!result.data) return { item: null, error: null };

  const item = {
    ...result.data,
    students: result.data.student_parent?.map((sp: any) => ({
      id: sp.student_id,
      full_name: sp.students?.full_name,
      class_name: sp.students?.classes?.name
    })) || []
  };

  return { item, error: null };
}

export async function createParent(payload: CreateParentInput): Promise<{ item: ParentRecord | null; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase.from('parents').insert(payload).select().single(),
    8000,
    { data: null, error: { message: 'Timeout tạo phụ huynh', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Không thể tạo hồ sơ phụ huynh.') };
  return { item: result.data as ParentRecord, error: null };
}

export async function updateParent(id: string, payload: UpdateParentInput): Promise<{ item: ParentRecord | null; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase.from('parents').update(payload).eq('id', id).select().single(),
    8000,
    { data: null, error: { message: 'Timeout cập nhật phụ huynh', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Không thể cập nhật hồ sơ phụ huynh.') };
  return { item: result.data as ParentRecord, error: null };
}

export async function deleteParent(id: string): Promise<{ error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase.from('parents').update({ del_yn: true }).eq('id', id),
    8000,
    { data: null, error: { message: 'Timeout xóa phụ huynh', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { error: toAppError(result.error, 'Không thể xóa phụ huynh.') };
  return { error: null };
}

export async function linkParentToStudent(parentId: string, studentId: string, relationship: string, isPrimary = false): Promise<{ error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase.from('student_parent').upsert({
      parent_id: parentId,
      student_id: studentId,
      relation_type: relationship,
      is_primary: isPrimary
    }, { onConflict: 'student_id,parent_id' }),
    8000,
    { data: null, error: { message: 'Timeout liên kết phụ huynh - học sinh', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { error: toAppError(result.error, 'Không thể liên kết phụ huynh và học sinh.') };
  return { error: null };
}

export async function unlinkParentFromStudent(parentId: string, studentId: string): Promise<{ error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase.from('student_parent').delete().match({ parent_id: parentId, student_id: studentId }),
    8000,
    { data: null, error: { message: 'Timeout gỡ liên kết phụ huynh - học sinh', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { error: toAppError(result.error, 'Không thể gỡ liên kết phụ huynh và học sinh.') };
  return { error: null };
}
