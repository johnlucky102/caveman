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
  '/finance-config': ['Admin', 'Accountant'],

  '/reports': ['Admin', 'Accountant'],
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

export function canAddOrDeleteStudent(role: AppRole | null): boolean {
  return role === 'Admin';
}

export function isTeacher(role: AppRole | null): boolean {
  return role === 'Teacher';
}

export function canCreateClass(role: AppRole | null): boolean {
  return role === 'Admin' || role === 'Accountant';
}

export function canManageFinance(role: AppRole | null): boolean {
  return role === 'Admin' || role === 'Accountant';
}
