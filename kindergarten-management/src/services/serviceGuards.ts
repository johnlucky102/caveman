import { supabase } from '@/lib/supabase';
import { canManageFinance, canManageStudentOrClass, canAddOrDeleteStudent } from '@/lib/rbac';
import type { AppError, AppRole } from '@/types/domain';
import { normalizeRole } from './usersService';

export interface GuardResult {
  userId: string;
  role: AppRole;
  error: AppError | null;
}

/**
 * Fetches the current user and their role, ensuring they are authenticated.
 */
export async function getCurrentUser(): Promise<GuardResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { userId: '', role: 'Parent', error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập lại.' } };
  }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  const role = normalizeRole(profile?.role);

  return { userId: user.id, role, error: null };
}

/**
 * Ensures the user has one of the allowed roles.
 */
export async function ensureRole(allowedRoles: AppRole[]): Promise<GuardResult> {
  const result = await getCurrentUser();
  if (result.error) return result;

  if (!allowedRoles.includes(result.role)) {
    return { ...result, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền thực hiện hành động này.' } };
  }

  return result;
}

/**
 * Ensures a teacher can only manage their assigned classes.
 * Admins and Accountants bypass this check.
 */
export async function ensureClassOwnership(classId: number): Promise<{ error: AppError | null }> {
  const { userId, role, error } = await getCurrentUser();
  if (error) return { error };

  if (role === 'Admin' || role === 'Accountant') return { error: null };

  if (role === 'Teacher') {
    // Check direct ownership
    const { data: directClass } = await supabase
      .from('classes')
      .select('id')
      .eq('id', classId)
      .eq('teacher_id', userId)
      .eq('del_yn', false)
      .maybeSingle();

    if (directClass) return { error: null };

    // Check secondary ownership
    const { data: secondaryClass } = await supabase
      .from('class_teachers')
      .select('class_id')
      .eq('class_id', classId)
      .eq('teacher_id', userId)
      .maybeSingle();

    if (secondaryClass) return { error: null };

    return { error: { code: 'FORBIDDEN', message: 'Bạn không có quyền quản lý lớp học này.' } };
  }

  return { error: { code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập dữ liệu lớp học.' } };
}

/**
 * Ensures a teacher can only manage students in their assigned classes.
 */
export async function ensureStudentOwnership(studentId: string): Promise<{ error: AppError | null }> {
  const { role, error, userId } = await getCurrentUser();
  if (error) return { error };

  if (role === 'Admin' || role === 'Accountant') return { error: null };

  if (role === 'Teacher') {
    const { data: student } = await supabase
      .from('students')
      .select('class_id')
      .eq('id', studentId)
      .eq('del_yn', false)
      .single();

    if (!student) return { error: { code: 'NOT_FOUND', message: 'Không tìm thấy học sinh.' } };

    return ensureClassOwnership(student.class_id);
  }

  return { error: { code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập dữ liệu học sinh.' } };
}

/**
 * Ensures access to financial data.
 */
export async function ensureFinancialAccess(isMutation = false): Promise<{ error: AppError | null }> {
  const { role, error } = await getCurrentUser();
  if (error) return { error };

  if (!canManageFinance(role)) {
    return { error: { code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập/thay đổi dữ liệu tài chính.' } };
  }

  return { error: null };
}

/**
 * Ensures a fee record can be modified (not paid, or user is Admin).
 */
export async function ensureFeeModificationAccess(feeId: string, isFinancialMutation = false): Promise<{ error: AppError | null }> {
  const { role, error } = await getCurrentUser();
  if (error) return { error };

  if (isFinancialMutation && !canManageFinance(role)) {
    return { error: { code: 'FORBIDDEN', message: 'Bạn không có quyền thay đổi dữ liệu tài chính. Vui lòng liên hệ Kế toán.' } };
  }

  const { data: fee } = await supabase.from('fee_records').select('status').eq('id', feeId).single();
  if (fee?.status === 'paid' && role !== 'Admin') {
    return { error: { code: 'FORBIDDEN', message: 'Bản ghi học phí đã hoàn tất thanh toán (Paid). Không thể thay đổi.' } };
  }

  return { error: null };
}
