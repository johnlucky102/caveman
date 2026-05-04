import type { AppRole } from '@/types/domain';

export const ROLE_LABELS: Record<AppRole, string> = {
  Admin: 'Quản trị',
  Teacher: 'Giáo viên',
  Accountant: 'Kế toán',
  Parent: 'Phụ huynh',
};

export const ROLE_ROUTE_ACCESS: Record<string, AppRole[]> = {
  '/': ['Admin', 'Teacher', 'Accountant', 'Parent'],
  '/students': ['Admin', 'Teacher', 'Accountant'],
  '/classes': ['Admin', 'Teacher', 'Accountant'],
  '/teachers': ['Admin'],
  '/parents': ['Admin', 'Teacher'],
  '/attendance': ['Admin', 'Teacher'],
  '/fees': ['Admin', 'Accountant'],
  '/notifications': ['Admin', 'Teacher', 'Accountant', 'Parent'],
  '/reports': ['Admin', 'Teacher', 'Accountant'],
  '/settings': ['Admin'],
};

export function canAccessRoute(role: AppRole | null, path: string): boolean {
  if (!role) return false;
  const allowed = ROLE_ROUTE_ACCESS[path];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function canManageStudentOrClass(role: AppRole | null): boolean {
  return role === 'Admin' || role === 'Teacher';
}
