import { supabase } from '@/lib/supabase';
import { toAppError } from './supabaseErrors';
import type { AppError, SchoolSettings } from '@/types/domain';

export async function getSchoolSettings(): Promise<{ settings: SchoolSettings | null; error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('school_settings')
      .select('*')
      .order('school_year', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings yet, return a skeleton or null
        return { settings: null, error: null };
      }
      throw error;
    }

    return { settings: data, error: null };
  } catch (err) {
    return { settings: null, error: toAppError(err, 'Không tải được cấu hình nhà trường.') };
  }
}

export async function updateSchoolSettings(id: number, data: Partial<SchoolSettings>): Promise<{ error: AppError | null }> {
  try {
    const { error } = await supabase
      .from('school_settings')
      .update(data)
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: toAppError(err, 'Không cập nhật được cấu hình nhà trường.') };
  }
}

export async function createSchoolSettings(data: Omit<SchoolSettings, 'id'>): Promise<{ error: AppError | null }> {
  try {
    const { error } = await supabase
      .from('school_settings')
      .insert(data);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: toAppError(err, 'Không tạo được cấu hình nhà trường.') };
  }
}
