import { supabase } from '@/lib/supabase';
import { withSupabaseTimeout } from '@/lib/timeout';
import { toAppError } from './supabaseErrors';
import type { AppError } from '@/types/domain';

export interface DashboardStats {
  totalStudents: number;
  totalDebt: number;
  attendanceToday: {
    present: number;
    absent: number;
    total: number;
  };
  attendanceByClass: Array<{
    classId: number;
    className: string;
    present: number;
    absent: number;
    total: number;
  }>;
  studentsByGrade: Array<{
    gradeName: string;
    count: number;
  }>;
  attentionCount: number;
}

/**
 * Helper to get all class IDs assigned to a teacher
 * Checks both classes table (direct teacher_id) and class_teachers mapping table
 */
async function getAssignedClassIds(teacherId: string): Promise<number[]> {
  const [directClasses, mappedClasses] = await Promise.all([
    supabase.from('classes').select('id').eq('teacher_id', teacherId).eq('del_yn', false),
    supabase.from('class_teachers').select('class_id').eq('teacher_id', teacherId)
  ]);

  const directIds = (directClasses.data || []).map(c => Number(c.id));
  const mappedIds = (mappedClasses.data || []).map(c => Number(c.class_id));
  
  // Return unique IDs
  return Array.from(new Set([...directIds, ...mappedIds]));
}

export async function getDashboardStats(teacherId?: string): Promise<{ stats: DashboardStats | null; error: AppError | null }> {
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Resolve assigned classes first (Security First)
    let assignedClassIds: number[] = [];
    if (teacherId) {
      assignedClassIds = await getAssignedClassIds(teacherId);
      // If teacher has no classes, return empty stats immediately to avoid unnecessary broad queries
      if (assignedClassIds.length === 0) {
        return {
          stats: {
            totalStudents: 0,
            totalDebt: 0,
            attendanceToday: { present: 0, absent: 0, total: 0 },
            attendanceByClass: [],
            studentsByGrade: [],
            attentionCount: 0
          },
          error: null
        };
      }
    }

    // 2. Fetch scoped data (Server-side filtering via RLS + explicit filters)
    let studentsCountQuery = supabase.from('students').select('id', { count: 'exact', head: true }).eq('del_yn', false);
    let attendanceQuery = supabase.from('attendance').select('status, class_id, medicine_instructions').eq('attendance_date', today).eq('del_yn', false);
    let studentDataQuery = supabase.from('students').select('id, class_id, classes(id, name)').eq('del_yn', false);
    
    if (teacherId) {
      studentsCountQuery = studentsCountQuery.in('class_id', assignedClassIds);
      attendanceQuery = attendanceQuery.in('class_id', assignedClassIds);
      studentDataQuery = studentDataQuery.in('class_id', assignedClassIds);
    }

    const [
      studentsCountRes,
      attendanceRes,
      studentDataRes,
      classesRes
    ] = await Promise.all([
      studentsCountQuery,
      attendanceQuery,
      studentDataQuery,
      supabase.from('classes').select('id, name, teacher_id').eq('del_yn', false)
    ]);

    if (studentsCountRes.error) throw studentsCountRes.error;
    if (attendanceRes.error) throw attendanceRes.error;
    if (studentDataRes.error) throw studentDataRes.error;
    if (classesRes.error) throw classesRes.error;

    const attendanceRecords = attendanceRes.data || [];
    const students = studentDataRes.data || [];
    const allClasses = classesRes.data || [];

    // 3. Process Attendance Metrics
    const totalAttendance = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const absentCount = attendanceRecords.filter(r => r.status === 'absent' || r.status === 'excused').length;

    // 4. Class-level Breakdown
    const classMap = new Map<number, string>();
    allClasses.forEach(c => classMap.set(Number(c.id), c.name));

    const attendanceByClassMap = new Map<number, { present: number; absent: number; total: number }>();
    attendanceRecords.forEach(r => {
      const current = attendanceByClassMap.get(r.class_id) || { present: 0, absent: 0, total: 0 };
      current.total++;
      if (r.status === 'present' || r.status === 'late') current.present++;
      else if (r.status === 'absent' || r.status === 'excused') current.absent++;
      attendanceByClassMap.set(r.class_id, current);
    });

    const attendanceByClass = Array.from(attendanceByClassMap.entries()).map(([id, stats]) => ({
      classId: id,
      className: classMap.get(id) || `Lớp ${id}`,
      ...stats
    })).sort((a, b) => b.total - a.total).slice(0, 5);

    // 5. Distribution & Attention
    const classCounts = new Map<string, number>();
    students.forEach((s: any) => {
      const cName = s.classes?.name || 'Khác';
      classCounts.set(cName, (classCounts.get(cName) || 0) + 1);
    });

    const studentsByGrade = Array.from(classCounts.entries()).map(([gradeName, count]) => ({
      gradeName,
      count
    })).sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      stats: {
        totalStudents: teacherId ? students.length : (studentsCountRes.count || 0),
        totalDebt: 0, 
        attendanceToday: { present: presentCount, absent: absentCount, total: totalAttendance },
        attendanceByClass,
        studentsByGrade,
        attentionCount: attendanceRecords.filter(r => !!r.medicine_instructions).length
      },
      error: null
    };
  } catch (err) {
    console.error('[Dashboard Service Error]:', err);
    return { stats: null, error: toAppError(err, 'Lỗi tổng hợp dữ liệu dashboard.') };
  }
}

// ─── Attendance Trend (7 days) ────────────────────────────────────────────────

export interface AttendanceTrendPoint {
  day: string;
  date: string;
  rate: number;
  present: number;
  total: number;
}

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export async function getAttendanceTrend(teacherId?: string): Promise<{ trend: AttendanceTrendPoint[]; error: AppError | null }> {
  try {
    const today = new Date();
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dates.push(dateStr);
    }

    // Filter by assigned classes if teacher (Security: Filter at DB level)
    let attendanceQuery = supabase
      .from('attendance')
      .select('attendance_date, status, class_id')
      .gte('attendance_date', dates[0])
      .lte('attendance_date', dates[dates.length - 1])
      .eq('del_yn', false);

    if (teacherId) {
      const assignedIds = await getAssignedClassIds(teacherId);
      if (assignedIds.length === 0) return { trend: [], error: null };
      attendanceQuery = attendanceQuery.in('class_id', assignedIds);
    }

    const { data, error } = await attendanceQuery;

    if (error) throw error;

    const filteredData = data || [];

    // Group by date
    const dateMap = new Map<string, { present: number; total: number }>();
    filteredData.forEach((r: any) => {
      const key = r.attendance_date;
      const cur = dateMap.get(key) || { present: 0, total: 0 };
      cur.total++;
      if (r.status === 'present') cur.present++;
      dateMap.set(key, cur);
    });

    const trend: AttendanceTrendPoint[] = dates.map((dateStr) => {
      const d = new Date(dateStr + 'T00:00:00');
      const dayLabel = DAY_LABELS[d.getDay()];
      const stats = dateMap.get(dateStr) || { present: 0, total: 0 };
      const rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
      return { day: dayLabel, date: dateStr, rate, present: stats.present, total: stats.total };
    });

    return { trend, error: null };
  } catch (err) {
    return { trend: [], error: toAppError(err, 'Lỗi tải xu hướng điểm danh.') };
  }
}

// ─── Fee Status Summary ───────────────────────────────────────────────────────

export interface FeeStatusSummary {
  paid: number;
  unpaid: number;
  partial: number;
}

export async function getFeeStatusSummary(teacherId?: string): Promise<{ summary: FeeStatusSummary; error: AppError | null }> {
  try {
    let query = supabase
      .from('fee_records')
      .select('status, student_id, students!inner(class_id)')
      .eq('del_yn', false);
    
    if (teacherId) {
      const assignedIds = await getAssignedClassIds(teacherId);
      query = query.in('students.class_id', assignedIds);
    }

    const { data, error } = await query;

    if (error) throw error;

    const summary: FeeStatusSummary = { paid: 0, unpaid: 0, partial: 0 };
    (data || []).forEach((r: any) => {
      if (r.status === 'paid') summary.paid++;
      else if (r.status === 'partial') summary.partial++;
      else summary.unpaid++;
    });

    return { summary, error: null };
  } catch (err) {
    return { summary: { paid: 0, unpaid: 0, partial: 0 }, error: toAppError(err, 'Lỗi tải tình trạng học phí.') };
  }
}

// ─── Financial Summary ────────────────────────────────────────────────────────
export interface FinancialSummaryData {
  totalRevenue: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
}

export async function getFinancialSummary(userRole?: string): Promise<{ data: FinancialSummaryData | null; error: AppError | null }> {
  try {
    // App-level Guard: Only Admin and Accountant can access aggregate financial stats
    if (userRole && !['Admin', 'Accountant'].includes(userRole)) {
       return { data: null, error: toAppError(new Error('Unauthorized'), 'Truy cập bị từ chối: Chỉ quản trị viên và kế toán mới có quyền xem báo cáo này.') };
    }

    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('fee_records')
      .select('status, paid_amount_vnd, due_date')
      .eq('del_yn', false);

    if (error) throw error;

    const records = data || [];
    const totalRevenue = records.reduce((s, r: any) => s + (r.paid_amount_vnd || 0), 0);
    const paidCount = records.filter((r: any) => r.status === 'paid').length;
    const pendingCount = records.filter((r: any) => r.status === 'unpaid' || r.status === 'partial').length;
    const overdueCount = records.filter((r: any) => r.status !== 'paid' && r.due_date && r.due_date < today).length;

    return {
      data: { totalRevenue, paidCount, pendingCount, overdueCount },
      error: null
    };
  } catch (err) {
    return { data: null, error: toAppError(err, 'Lỗi tải báo cáo tài chính.') };
  }
}

// ─── Teacher Widgets (Birthdays & Medication) ───────────────────────────────

export interface TeacherWidgetsData {
  birthdays: any[];
  medications: Array<{
    studentId: string;
    studentName: string;
    notes: string;
  }>;
}

export async function getTeacherWidgets(teacherId: string): Promise<{ data: TeacherWidgetsData | null; error: AppError | null }> {
  try {
    // 1. Get assigned classes
    const assignedIds = await getAssignedClassIds(teacherId);
    if (!assignedIds.length) return { data: { birthdays: [], medications: [] }, error: null };

    // 2. Get birthdays in current month
    const currentMonth = new Date().getMonth() + 1;
    const { data: students } = await supabase
      .from('students')
      .select('id, full_name, date_of_birth, avatar, class_id')
      .in('class_id', assignedIds)
      .eq('del_yn', false);

    const monthlyBirthdays = (students || []).filter(s => {
      if (!s.date_of_birth) return false;
      const m = new Date(s.date_of_birth).getMonth() + 1;
      return m === currentMonth;
    }).map(s => ({
      id: s.id,
      full_name: s.full_name,
      date_of_birth: s.date_of_birth,
      avatar: s.avatar,
      class_id: s.class_id
    }));

    // 3. Get medication notes for today
    const today = new Date().toISOString().split('T')[0];
    const { data: attendance } = await supabase
      .from('attendance')
      .select('student_id, medicine_instructions, students(full_name)')
      .in('class_id', assignedIds)
      .eq('attendance_date', today)
      .not('medicine_instructions', 'is', null)
      .neq('medicine_instructions', '')
      .eq('del_yn', false);

    const medications = (attendance || []).map(a => ({
      studentId: a.student_id,
      studentName: (a.students as any)?.full_name || 'Học sinh',
      notes: a.medicine_instructions
    }));

    return {
      data: { birthdays: monthlyBirthdays, medications },
      error: null
    };
  } catch (err) {
    return { data: null, error: toAppError(err, 'Lỗi tải thông tin widget giáo viên.') };
  }
}
