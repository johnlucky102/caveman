import { UserProfile, AppRole } from '@/types/domain';

/**
 * Checks if a user has a specific role or is an Admin.
 */
export function hasRequiredRole(user: UserProfile | null, allowedRoles: AppRole[]): boolean {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  return allowedRoles.includes(user.role);
}

/**
 * Returns true if the user can modify financial data.
 */
export function canManageFinances(user: UserProfile | null): boolean {
  return hasRequiredRole(user, ['Accountant']);
}

/**
 * Returns true if the user can only perform operational tasks like attendance.
 */
export function isTeacher(user: UserProfile | null): boolean {
  return user?.role === 'Teacher';
}
