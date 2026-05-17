export type AppRole = 'Admin' | 'Teacher' | 'Accountant' | 'Parent';

export interface AppError {
  code: string;
  message: string;
  field?: string;
}

export interface ListEnvelope<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type SortDirection = 'asc' | 'desc';

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  role: AppRole;
  avatar: string | null;
  teacher_code?: string | null;
  email?: string | null;
  gender?: 'Male' | 'Female' | 'Other' | null;
  date_of_birth?: string | null;
  address?: string | null;
  qualification?: string | null;
  start_date?: string | null;
  status?: 'Active' | 'Inactive' | 'Resigned' | null;
  created_at: string;
  updated_at: string;
}

export interface GradeRecord {
  id: number;
  name: string;
  sort_order: number;
}

export interface ClassRecord {
  id: number;
  name: string;
  teacher_id: string | null;
  teacher_name: string | null;
  room: string | null;
  max_students: number;
  student_count: number;
  class_type: 'Daycare' | 'Evening';
  description: string | null;
  teachers?: ClassTeacherRecord[];
  created_at: string;
  updated_at: string;
}

export interface DeductionRule {
  id: string;
  name: string;
  amount: number;
}

export interface ClassFinanceConfig {
  id: number;
  class_id?: number | null;
  class_name?: string;
  class_type: 'Daycare' | 'Evening';
  deduction_rules: DeductionRule[];
  del_yn: boolean;
  created_at: string;
  updated_at: string;
}

export type ClassTeacherRole = 'Lead' | 'Assistant' | 'Nanny';

export interface ClassTeacherRecord {
  id: string;
  class_id: number;
  teacher_id: string;
  teacher_name: string;
  role: ClassTeacherRole;
  created_at: string;
}

export interface ClassListQuery {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: 'name' | 'created_at' | 'max_students';
  sortDirection?: SortDirection;
  teacherId?: string;
}

export interface CreateClassInput {
  name: string;
  teacher_id: string | null;
  room: string | null;
  max_students: number;
  class_type: 'Daycare' | 'Evening';
  description: string | null;
}

export interface CreateFinanceConfigInput {
  class_id?: number;
  class_type: 'Daycare' | 'Evening';
  deduction_rules: DeductionRule[];
}

export type UpdateFinanceConfigInput = Partial<CreateFinanceConfigInput>;

export interface FinanceConfigListQuery {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: 'class_type' | 'created_at';
  sortDirection?: SortDirection;
}

export type UpdateClassInput = Partial<CreateClassInput>;

export interface StudentRecord {
  id: string;
  class_id: number;
  class_name: string;
  student_code: string;
  full_name: string;
  date_of_birth: string | null;
  gender: 'Male' | 'Female' | null;
  nationality: string | null;
  address: string | null;
  enrolled_date: string | null;
  parent_info: {
    full_name: string;
    phone: string;
    email?: string;
    relationship?: string;
  };
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentListQuery {
  page: number;
  pageSize: number;
  search?: string;
  classId?: number;
  sortBy?: 'full_name' | 'student_code' | 'created_at';
  sortDirection?: SortDirection;
  teacherId?: string;
}

export interface CreateStudentInput {
  class_id: number;
  student_code?: string;
  full_name: string;
  date_of_birth: string | null;
  gender: 'Male' | 'Female' | null;
  nationality: string | null;
  address: string | null;
  enrolled_date: string | null;
  parent_info: {
    full_name: string;
    phone: string;
    email?: string;
    relationship?: string;
  };
  avatar: string | null;
}

export type UpdateStudentInput = Partial<CreateStudentInput>;

export type AttendanceStatusValue = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name: string;
  class_id: number;
  class_name: string;
  attendance_date: string;
  status: AttendanceStatusValue;
  check_in_time: string | null;
  check_out_time: string | null;
  meal_included: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceListQuery {
  classId: number;
  attendanceDate: string;
  teacherId?: string;
}

export interface UpsertAttendanceInput {
  student_id: string;
  class_id: number;
  attendance_date: string;
  status: AttendanceStatusValue;
  check_in_time?: string | null;
  check_out_time?: string | null;
  meal_included?: boolean;
  created_by?: string | null;
}


export interface FeeTypeRecordP2 {
  id: number;
  name: string;
  amount_vnd: number;
  grade_id: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type FeeStatusValue = 'unpaid' | 'partial' | 'paid';

export interface FeeRecordP2 {
  id: string;
  student_id: string;
  student_name: string;
  class_id: number;
  class_name: string;
  title: string | null;
  school_year: string;
  month: number | null;
  amount_vnd: number;
  paid_amount_vnd: number;
  paid_date: string | null;
  due_date: string | null;
  payment_method: 'cash' | 'bank_transfer' | null;
  status: FeeStatusValue;
  base_amount_vnd: number;
  attendance_deduction_vnd: number;
  deduction_details: DeductionRule[];
  deduction_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeeListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: FeeStatusValue;
  studentId?: string;
  classId?: number;
  month?: number;
  schoolYear?: string;
}

export interface CreateFeeInput {
  student_id: string;
  class_id: number;
  title?: string;
  school_year: string;
  month: number;
  amount_vnd: number;
  paid_amount_vnd: number;
  paid_date: string | null;
  due_date: string | null;
  payment_method: 'cash' | 'bank_transfer' | null;
  status: FeeStatusValue;
  base_amount_vnd?: number;
  attendance_deduction_vnd?: number;
  deduction_details?: DeductionRule[];
  deduction_note?: string | null;
}

export interface SchoolSettings {
  id: number;
  school_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  school_year: string;
  academic_year_start: string | null;
  academic_year_end: string | null;
  logo_url: string | null;
  created_at?: string;
  updated_at?: string;
}
