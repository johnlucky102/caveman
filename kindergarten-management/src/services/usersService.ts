import { supabase } from '@/lib/supabase';
import { withSupabaseTimeout } from '@/lib/timeout';
import type { AppError, AppRole, UserProfile } from '@/types/domain';
import { toAppError } from './supabaseErrors';

export interface TeacherProfileInput {
  full_name: string;
  phone: string | null;
  avatar: string | null;
  email?: string | null;
  teacher_code?: string | null;
}

type UserRow = {
  id: string;
  full_name: string;
  phone: string | null;
  role: string | null;
  avatar: string | null;
  teacher_code?: string | null;
  email?: string | null;
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
    phone: row.phone,
    role: normalizeRole(row.role),
    avatar: row.avatar,
    teacher_code: row.teacher_code || null,
    email: row.email || null,
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
      .select('id, full_name, phone, role, avatar, teacher_code, email, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle(),
    8000,
    { data: null, error: { message: 'Timeout loading user profile', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { profile: null, error: toAppError(result.error, 'Cannot load user profile.') };
  if (!result.data) return { profile: null, error: null };
  return { profile: mapUserRow(result.data as UserRow), error: null };
}

export async function listTeachers(): Promise<{ items: UserProfile[]; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase
      .from('users')
      .select('id, full_name, phone, role, avatar, teacher_code, email, created_at, updated_at')
      .eq('role', 'Teacher')
      .order('full_name', { ascending: true }),
    8000,
    { data: null, error: { message: 'Timeout loading teachers', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { items: [], error: toAppError(result.error, 'Cannot load teachers.') };
  return { items: ((result.data || []) as UserRow[]).map(mapUserRow), error: null };
}

export async function getTeacherById(id: string): Promise<{ item: UserProfile | null; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase
      .from('users')
      .select('id, full_name, phone, role, avatar, teacher_code, email, created_at, updated_at')
      .eq('id', id)
      .eq('role', 'Teacher')
      .maybeSingle(),
    8000,
    { data: null, error: { message: 'Timeout loading teacher', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Cannot load teacher.') };
  if (!result.data) return { item: null, error: null };
  return { item: mapUserRow(result.data as UserRow), error: null };
}

export async function createTeacherProfile(payload: TeacherProfileInput): Promise<{ item: UserProfile | null; error: AppError | null }> {
  if (!payload.email?.trim()) {
    return { item: null, error: { code: 'VALIDATION', message: 'Email giao vien la bat buoc.', field: 'email' } };
  }

  const shouldGenerateCode = !payload.teacher_code?.trim();
  const maxAttempts = shouldGenerateCode ? 5 : 1;
  const currentSessionResult = await supabase.auth.getSession();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const teacherCode = shouldGenerateCode ? generateTeacherCode() : payload.teacher_code?.trim();
    const signUpResult = await supabase.auth.signUp({
      email: payload.email.trim(),
      password: generateTemporaryPassword(),
      options: {
        data: {
          full_name: payload.full_name,
          phone: payload.phone,
          role: 'Teacher',
        },
      },
    });

    if (signUpResult.error || !signUpResult.data.user) {
      return { item: null, error: toAppError(signUpResult.error, 'Cannot create teacher account.') };
    }

    if (currentSessionResult.data.session) {
      await supabase.auth.setSession({
        access_token: currentSessionResult.data.session.access_token,
        refresh_token: currentSessionResult.data.session.refresh_token,
      });
    }

    const updateResult = await withSupabaseTimeout(
      supabase
        .from('users')
        .update({
          full_name: payload.full_name,
          phone: payload.phone,
          avatar: payload.avatar,
          email: payload.email.trim(),
          teacher_code: teacherCode,
          role: 'Teacher',
        })
        .eq('id', signUpResult.data.user.id)
        .select('id, full_name, phone, role, avatar, teacher_code, email, created_at, updated_at')
        .single(),
      8000,
      { data: null, error: { message: 'Timeout creating teacher profile', details: '', hint: '', code: 'TIMEOUT' } } as any
    );

    if (!updateResult.error && updateResult.data) return { item: mapUserRow(updateResult.data as UserRow), error: null };
    if (!shouldGenerateCode || !isTeacherCodeConflict(updateResult.error) || attempt === maxAttempts) {
      return { item: null, error: toAppError(updateResult.error, 'Cannot create teacher profile.') };
    }
  }

  return { item: null, error: { code: 'CONFLICT', message: 'Cannot generate unique teacher code.' } };
}

export async function updateTeacherProfile(id: string, payload: TeacherProfileInput): Promise<{ item: UserProfile | null; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase
      .from('users')
      .update({
        full_name: payload.full_name,
        phone: payload.phone,
        avatar: payload.avatar,
        email: payload.email?.trim() || null,
        role: 'Teacher',
      })
      .eq('id', id)
      .eq('role', 'Teacher')
      .select('id, full_name, phone, role, avatar, teacher_code, email, created_at, updated_at')
      .single(),
    8000,
    { data: null, error: { message: 'Timeout updating teacher', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { item: null, error: toAppError(result.error, 'Cannot update teacher.') };
  return { item: mapUserRow(result.data as UserRow), error: null };
}

export async function deleteTeacherProfile(id: string): Promise<{ error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase.from('users').delete().eq('id', id).eq('role', 'Teacher'),
    8000,
    { data: null, error: { message: 'Timeout deleting teacher', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { error: toAppError(result.error, 'Cannot delete teacher.') };
  return { error: null };
}
