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
}

export async function getDashboardStats(teacherId?: string): Promise<{ stats: DashboardStats | null; error: AppError | null }> {
  // Use local date for dashboard stats
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  try {
    const [
      studentsCount,
      debtData,
      attendanceData,
      studentData,
      classesData
    ] = await Promise.all([
      // 1. Total Students
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('del_yn', false),
      
      // 2. Debt Data
      supabase.from('fee_records')
        .select('amount_vnd, paid_amount_vnd')
        .neq('status', 'paid')
        .eq('del_yn', false),
      
      // 3. Attendance Today
      supabase.from('attendance')
        .select('status, class_id')
        .eq('attendance_date', today)
        .eq('del_yn', false),
      
      // 4. Students by Class (Removed broken grades join)
      supabase.from('students')
        .select('id, class_id, classes(id, name)')
        .eq('del_yn', false),

      // 5. All classes
      supabase.from('classes').select('id, name, teacher_id').eq('del_yn', false)
    ]);

    if (studentsCount.error) throw studentsCount.error;
    if (debtData.error) throw debtData.error;
    if (attendanceData.error) throw attendanceData.error;
    if (studentData.error) throw studentData.error;
    if (classesData.error) throw classesData.error;
    
    // Filter classes if teacherId is provided
    const allInternalClasses = classesData.data || [];
    const filteredClasses = teacherId 
      ? allInternalClasses.filter(c => c.teacher_id === teacherId)
      : allInternalClasses;
    
    const filteredClassIds = filteredClasses.map(c => c.id);

    // Process Debt
    const totalDebt = (debtData.data || []).reduce((acc, row) => {
      return acc + (row.amount_vnd - (row.paid_amount_vnd || 0));
    }, 0);

    // Process Attendance Today
    const attendanceRecords = (attendanceData.data || []).filter(r => 
      filteredClassIds.length === 0 || filteredClassIds.includes(r.class_id)
    );
    const totalAttendance = attendanceRecords.length;
    const presentAttendance = attendanceRecords.filter(r => r.status === 'present').length;
    const absentAttendance = attendanceRecords.filter(r => r.status === 'absent').length;

    // Attendance by Class
    const classMap = new Map<number, string>();
    (classesData.data || []).forEach(c => classMap.set(c.id, c.name));

    const attendanceByClassMap = new Map<number, { present: number; absent: number; total: number }>();
    attendanceRecords.forEach(r => {
      const current = attendanceByClassMap.get(r.class_id) || { present: 0, absent: 0, total: 0 };
      current.total++;
      if (r.status === 'present') current.present++;
      else if (r.status === 'absent') current.absent++;
      attendanceByClassMap.set(r.class_id, current);
    });

    const attendanceByClass = Array.from(attendanceByClassMap.entries()).map(([id, stats]) => ({
      classId: id,
      className: classMap.get(id) || `Lớp ${id}`,
      ...stats
    })).sort((a, b) => b.total - a.total).slice(0, 5); // Top 5 classes for dashboard

    // Process Students by Class
    const classCounts = new Map<string, number>();
    (studentData.data || []).forEach((s: any) => {
      if (teacherId && s.class_id && !filteredClassIds.includes(s.class_id)) return;
      const cName = s.classes?.name || 'Khác';
      classCounts.set(cName, (classCounts.get(cName) || 0) + 1);
    });

    const studentsByGrade = Array.from(classCounts.entries()).map(([gradeName, count]) => ({
      gradeName,
      count
    })).sort((a, b) => b.count - a.count).slice(0, 5);

    const totalStudentsCount = teacherId 
      ? Array.from(classCounts.values()).reduce((a, b) => a + b, 0)
      : (studentsCount.count || 0);

    return {
      stats: {
        totalStudents: totalStudentsCount,
        totalDebt,
        attendanceToday: {
          present: presentAttendance,
          absent: absentAttendance,
          total: totalAttendance
        },
        attendanceByClass,
        studentsByGrade
      },
      error: null
    };
  } catch (err) {
    return { stats: null, error: toAppError(err, 'Lỗi tổng hợp dữ liệu dashboard.') };
  }
}

export interface DashboardNotification {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
}

export async function getDashboardNotifications(): Promise<{ items: DashboardNotification[]; error: AppError | null }> {
  const result = await withSupabaseTimeout(
    supabase
      .from('notifications')
      .select('id, title, body, kind, created_at')
      .eq('del_yn', false)
      .order('created_at', { ascending: false })
      .limit(5),
    5000,
    { data: null, error: { message: 'Timeout tải thông báo', details: '', hint: '', code: 'TIMEOUT' } } as any
  );

  if (result.error) return { items: [], error: toAppError(result.error, 'Không tải được thông báo.') };
  
  const items = (result.data || []).map((n: any) => ({
    id: n.id,
    title: n.title,
    content: n.body,
    type: n.kind,
    created_at: n.created_at
  }));

  return { items, error: null };
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

export async function getAttendanceTrend(): Promise<{ trend: AttendanceTrendPoint[]; error: AppError | null }> {
  try {
    const today = new Date();
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dates.push(dateStr);
    }

    const { data, error } = await supabase
      .from('attendance')
      .select('attendance_date, status')
      .gte('attendance_date', dates[0])
      .lte('attendance_date', dates[dates.length - 1])
      .eq('del_yn', false);

    if (error) throw error;

    // Group by date
    const dateMap = new Map<string, { present: number; total: number }>();
    (data || []).forEach((r: any) => {
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

export async function getFeeStatusSummary(): Promise<{ summary: FeeStatusSummary; error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('fee_records')
      .select('status')
      .eq('del_yn', false);

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
