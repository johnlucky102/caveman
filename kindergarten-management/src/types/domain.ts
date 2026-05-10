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
  description: string | null;
  teachers?: ClassTeacherRecord[];
  created_at: string;
  updated_at: string;
  class_type: 'Daycare' | 'Evening';
  meal_rate: number;
  cancel_rate: number;
  hospital_deduction_type: 'Fixed' | 'Daily';
  hospital_deduction_value: number;
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
}

export interface CreateClassInput {
  name: string;
  teacher_id: string | null;
  room: string | null;
  max_students: number;
  description: string | null;
  class_type?: 'Daycare' | 'Evening';
  meal_rate?: number;
  cancel_rate?: number;
  hospital_deduction_type?: 'Fixed' | 'Daily';
  hospital_deduction_value?: number;
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
  ethnicity: string | null;
  nationality: string | null;
  address: string | null;
  enrolled_date: string | null;
  health_info: Record<string, unknown>;
  avatar: string | null;
  parents?: { id: string; full_name: string; phone: string; relationship: string; is_primary: boolean }[];
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
}

export interface CreateStudentInput {
  class_id: number;
  student_code?: string;
  full_name: string;
  date_of_birth: string | null;
  gender: 'Male' | 'Female' | null;
  ethnicity: string | null;
  nationality: string | null;
  address: string | null;
  enrolled_date: string | null;
  health_info: Record<string, unknown>;
  avatar: string | null;
}

export type UpdateStudentInput = Partial<CreateStudentInput>;

export type AttendanceStatusValue = 'present' | 'absent' | 'late' | 'excused' | 'center_cancelled';

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
  note: string | null;
  meal_included: boolean;
  medicine_instructions: string | null;
  sleep_quality: 'Good' | 'Fair' | 'Poor' | null;
  is_hospitalized: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceListQuery {
  classId: number;
  attendanceDate: string;
}

export interface UpsertAttendanceInput {
  student_id: string;
  class_id: number;
  attendance_date: string;
  status: AttendanceStatusValue;
  check_in_time?: string | null;
  check_out_time?: string | null;
  note?: string | null;
  meal_included?: boolean;
  medicine_instructions?: string | null;
  sleep_quality?: 'Good' | 'Fair' | 'Poor' | null;
  is_hospitalized?: boolean;
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
  meal_deduction_vnd: number;
  tuition_deduction_vnd: number;
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
  meal_deduction_vnd?: number;
  tuition_deduction_vnd?: number;
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

export interface ParentRecord {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  relationship: 'Father' | 'Mother' | 'Guardian';
  occupation: string | null;
  address: string | null;
  gender?: 'Male' | 'Female' | 'Other' | null;
  date_of_birth?: string | null;
  students?: { id: string; full_name: string; class_name: string }[];
  created_at: string;
  updated_at: string;
}

export interface CreateParentInput {
  full_name: string;
  phone: string;
  email: string | null;
  relationship: 'Father' | 'Mother' | 'Guardian';
  occupation?: string | null;
  address?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
}

export type UpdateParentInput = Partial<CreateParentInput>;
