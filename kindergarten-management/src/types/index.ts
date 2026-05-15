// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'teacher' | 'parent' | 'staff';

// ─── Student Types ─────────────────────────────────────────────────────────────

export interface Student {
  id: string;
  full_name: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  avatar_url?: string;
  class_id?: string;
  class?: Class;
  parent_id?: string;
  parent?: Parent;
  address?: string;
  health_notes?: string;
  allergies?: string;
  enrollment_date: string;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

export type StudentStatus = 'active' | 'inactive' | 'graduated' | 'transferred';

// ─── Class Types ───────────────────────────────────────────────────────────────

export interface Class {
  id: string;
  name: string;
  grade_level: string;
  teacher_id?: string;
  teacher?: Teacher;
  capacity: number;
  current_count: number;
  room?: string;
  schedule?: string;
  status: ClassStatus;
  created_at: string;
  updated_at: string;
}

export type ClassStatus = 'active' | 'inactive';

// ─── Teacher Types ─────────────────────────────────────────────────────────────

export interface Teacher {
  id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female';
  qualifications?: string;
  specialization?: string;
  hire_date: string;
  salary?: number;
  status: TeacherStatus;
  created_at: string;
  updated_at: string;
}

export type TeacherStatus = 'active' | 'inactive' | 'on_leave';

// ─── Parent Types ──────────────────────────────────────────────────────────────

export interface Parent {
  id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  phone_secondary?: string;
  avatar_url?: string;
  address?: string;
  occupation?: string;
  relationship: ParentRelationship;
  students?: Student[];
  created_at: string;
  updated_at: string;
}

export type ParentRelationship = 'father' | 'mother' | 'guardian' | 'other';

// ─── Attendance Types ──────────────────────────────────────────────────────────

export interface Attendance {
  id: string;
  student_id: string;
  student?: Student;
  class_id: string;
  class?: Class;
  date: string;
  status: AttendanceStatus;
  check_in_time?: string;
  check_out_time?: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

// ─── Fee Types ─────────────────────────────────────────────────────────────────

export interface Fee {
  id: string;
  student_id: string;
  student?: Student;
  fee_type: FeeType;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: FeeStatus;
  payment_method?: PaymentMethod;
  notes?: string;
  invoice_number?: string;
  created_at: string;
  updated_at: string;
}

export type FeeType = 'tuition' | 'meal' | 'activity' | 'uniform' | 'book' | 'other';
export type FeeStatus = 'pending' | 'paid' | 'overdue' | 'waived' | 'partial';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'online';

// ─── Notification Types ────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  target_role?: UserRole;
  target_user_id?: string;
  is_read: boolean;
  created_by?: string;
  created_at: string;
}

export type NotificationType = 'info' | 'warning' | 'success' | 'error' | 'announcement';

// ─── Report Types ──────────────────────────────────────────────────────────────

export interface Report {
  id: string;
  title: string;
  type: ReportType;
  generated_at: string;
  generated_by?: string;
  data?: Record<string, unknown>;
  file_url?: string;
}

export type ReportType = 'attendance' | 'fees' | 'students' | 'teachers' | 'overview';

// ─── UI / Common Types ─────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  meta?: PaginationMeta;
}

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: React.ReactNode;
  sortable?: boolean;
  width?: string;
  wrap?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface TableAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  variant?: 'default' | 'danger';
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface DropdownItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface StatItem {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export interface TabItem {
  label: string;
  value: string;
  count?: number;
  badge?: string | number;
  disabled?: boolean;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'date' | 'file' | 'checkbox' | 'radio';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: SelectOption[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    custom?: (value: unknown) => string | undefined;
  };
}

export interface FilterOption {
  label: string;
  value: string;
  type: 'text' | 'select' | 'date' | 'date-range' | 'number-range';
  options?: SelectOption[];
  placeholder?: string;
}

// ─── Toast Types ───────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

// ─── Sidebar Types ─────────────────────────────────────────────────────────────

export interface SidebarNavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}
