import { supabase } from '@/lib/supabase';
import type { AppError, AppRole, UserProfile } from '@/types/domain';
import { toAppError } from './supabaseErrors';

export function normalizeRole(role?: string | null): AppRole {
  if (role === 'Admin' || role === 'Teacher' || role === 'Accountant' || role === 'Parent') {
    return role;
  }
  return 'Parent';
}

export async function fetchMyProfile(userId: string): Promise<{ profile: UserProfile | null; error: AppError | null }> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, phone, role, avatar, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) return { profile: null, error: toAppError(error, 'Không lấy được hồ sơ người dùng.') };
  if (!data) return { profile: null, error: null };

  return {
    profile: {
      id: data.id,
      full_name: data.full_name,
      phone: data.phone,
      role: normalizeRole(data.role),
      avatar: data.avatar,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
    error: null,
  };
}

export async function listTeachers(): Promise<{ items: UserProfile[]; error: AppError | null }> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, phone, role, avatar, created_at, updated_at')
    .eq('role', 'Teacher')
    .order('full_name', { ascending: true });

  if (error) return { items: [], error: toAppError(error, 'Không lấy được danh sách giáo viên.') };

  const items = (data || []).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    phone: row.phone,
    role: normalizeRole(row.role),
    avatar: row.avatar,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  return { items, error: null };
}
