import { supabase } from '@/lib/supabase';
import { withSupabaseTimeout } from '@/lib/timeout';
import { toAppError } from './supabaseErrors';
import type { AppError } from '@/types/domain';
import { calendarMonthKeyFromSchoolYear } from '@/utils/schoolYearCalendar';

export interface RevenueTrendPoint {
  month: string;
  revenue: number;
  debt: number;
}

/**
 * Fetches revenue and debt trend for the last 6 months.
 */
export async function getRevenueTrend(): Promise<{ data: RevenueTrendPoint[]; error: AppError | null }> {
  try {
    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const { data, error } = await withSupabaseTimeout(
      supabase
        .from('fee_records')
        .select('month, school_year, paid_amount_vnd, amount_vnd, status')
        .eq('del_yn', false),
      8000,
{ data: [], error: null } as any
    );

    if (error) throw error;

    const records = data || [];
    
    const trendMap = new Map<string, { revenue: number; debt: number }>();
    
    months.forEach(m => trendMap.set(m, { revenue: 0, debt: 0 }));

    records.forEach((r: any) => {
      const mKey = calendarMonthKeyFromSchoolYear(r.school_year, r.month);
      if (mKey && trendMap.has(mKey)) {
        const cur = trendMap.get(mKey)!;
        cur.revenue += (r.paid_amount_vnd || 0);
        cur.debt += Math.max(0, (r.amount_vnd || 0) - (r.paid_amount_vnd || 0));
      }
    });

    const trend = months.map(m => ({
      month: m,
      ...trendMap.get(m)!
    }));

    return { data: trend, error: null };
  } catch (err) {
    return { data: [], error: toAppError(err, 'Lỗi tải xu hướng tài chính.') };
  }
}

/**
 * Fetches student distribution by gender and grade.
 */
export async function getStudentDistribution(): Promise<{ 
  gender: { name: string; value: number }[];
  grade: { name: string; value: number }[];
  error: AppError | null;
}> {
  try {
    const { data, error } = await withSupabaseTimeout(
      supabase
        .from('students')
        .select('gender, classes(name)')
        .eq('del_yn', false),
      8000,
{ data: [], error: null } as any
    );

    if (error) throw error;

    const students = data || [];
    
    const genderCounts = { Male: 0, Female: 0, Other: 0 };
    const gradeCounts = new Map<string, number>();

    students.forEach((s: any) => {
      const g = s.gender || 'Other';
      (genderCounts as any)[g]++;
      
      const grade = s.classes?.name || 'Chưa xếp lớp';
      gradeCounts.set(grade, (gradeCounts.get(grade) || 0) + 1);
    });

    return {
      gender: [
        { name: 'Nam', value: genderCounts.Male },
        { name: 'Nữ', value: genderCounts.Female }
      ],
      grade: Array.from(gradeCounts.entries()).map(([name, value]) => ({ name, value })),
      error: null
    };
  } catch (err) {
    return { gender: [], grade: [], error: toAppError(err, 'Lỗi tải phân bổ học sinh.') };
  }
}

export interface AgingBucket {
  range: string;
  count: number;
  amount: number;
}

export interface OverdueStudent {
  studentId: string;
  studentName: string;
  className: string;
  teacherName?: string;
  amountOwed: number;
  daysOverdue: number;
}

/**
 * Fetches debt aging distribution.
 */
export async function getDebtAging(): Promise<{ data: AgingBucket[]; error: AppError | null }> {
  try {
    const { data, error } = await withSupabaseTimeout(
      supabase
        .from('fee_records')
        .select('amount_vnd, paid_amount_vnd, due_date')
        .eq('del_yn', false)
        .in('status', ['unpaid', 'partial']),
      8000,
{ data: [], error: null } as any
    );

    if (error) throw error;

    const records = data || [];
    const today = new Date();

    const buckets: AgingBucket[] = [
      { range: '0-30 ngày', count: 0, amount: 0 },
      { range: '31-60 ngày', count: 0, amount: 0 },
      { range: '61-90 ngày', count: 0, amount: 0 },
      { range: '91+ ngày', count: 0, amount: 0 },
    ];

    records.forEach((r: any) => {
      const debt = (r.amount_vnd || 0) - (r.paid_amount_vnd || 0);
      if (debt <= 0) return;

      if (r.due_date == null || r.due_date === '') return;

      const dueDate = new Date(r.due_date);
      if (Number.isNaN(dueDate.getTime())) return;

      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));

      if (diffDays <= 30) {
        buckets[0].count++;
        buckets[0].amount += debt;
      } else if (diffDays <= 60) {
        buckets[1].count++;
        buckets[1].amount += debt;
      } else if (diffDays <= 90) {
        buckets[2].count++;
        buckets[2].amount += debt;
      } else {
        buckets[3].count++;
        buckets[3].amount += debt;
      }
    });

    return { data: buckets, error: null };
  } catch (err) {
    return { data: [], error: toAppError(err, 'Lỗi tải phân tích tuổi nợ.') };
  }
}

/**
 * Fetches list of overdue students.
 */
export async function getOverdueStudents(month?: number | null, schoolYear?: string | null): Promise<{ data: OverdueStudent[]; error: AppError | null }> {
  try {
    let query = supabase
      .from('fee_records')
      .select('id, student_id, amount_vnd, paid_amount_vnd, due_date, students!inner(full_name, classes!inner(name, teacher_id, users!inner(full_name)))')
      .eq('del_yn', false)
      .in('status', ['unpaid', 'partial'])
      .not('due_date', 'is', null);

    if (month !== null && month !== undefined) {
      query = query.eq('month', month);
    }
    if (schoolYear) {
      query = query.eq('school_year', schoolYear);
    }

    const { data, error } = await withSupabaseTimeout(query, 8000, { data: [], error: null } as any);

    if (error) throw error;

    const records = data || [];
    const today = new Date();

    const overdueStudents: OverdueStudent[] = records
      .map((r: any) => {
        const amountOwed = (r.amount_vnd || 0) - (r.paid_amount_vnd || 0);
        if (amountOwed <= 0) return null;

        const dueDate = new Date(r.due_date);
        if (Number.isNaN(dueDate.getTime())) return null;

        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));

        return {
          studentId: r.student_id,
          studentName: r.students?.full_name || 'N/A',
          className: r.students?.classes?.name || 'N/A',
          teacherName: r.students?.classes?.users?.full_name || '',
          amountOwed,
          daysOverdue,
        };
      })
      .filter((s): s is OverdueStudent => s !== null)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    return { data: overdueStudents, error: null };
  } catch (err) {
    return { data: [], error: toAppError(err, 'Lỗi tải danh sách học sinh nợ quá hạn.') };
  }
}

export interface RenewalStudent {
  studentId: string;
  studentName: string;
  className: string;
  dueDate: string;
  amountPaid: number;
  amountTotal: number;
  daysRemaining: number;
}

/**
 * Fetches list of students with fees due in the next 30 days for renewal reminder.
 */
export async function getRenewalForecast(): Promise<{ data: RenewalStudent[]; error: AppError | null }> {
  try {
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    const todayStr = today.toISOString().split('T')[0];
    const futureStr = thirtyDaysLater.toISOString().split('T')[0];

    const { data, error } = await withSupabaseTimeout(
      supabase
        .from('fee_records')
        .select('student_id, due_date, paid_amount_vnd, amount_vnd, students!inner(full_name, classes!inner(name))')
        .eq('del_yn', false)
        .gte('due_date', todayStr)
        .lte('due_date', futureStr)
        .order('due_date', { ascending: true }),
      8000,
      { data: [], error: null } as any
    );

    if (error) throw error;

    const records = data || [];

    const renewalStudents: RenewalStudent[] = records
      .map((r: any) => {
        const dueDate = new Date(r.due_date);
        if (Number.isNaN(dueDate.getTime())) return null;

        const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

        return {
          studentId: r.student_id,
          studentName: r.students?.full_name || 'N/A',
          className: r.students?.classes?.name || 'N/A',
          dueDate: r.due_date,
          amountPaid: r.paid_amount_vnd || 0,
          amountTotal: r.amount_vnd || 0,
          daysRemaining,
        };
      })
      .filter((s): s is RenewalStudent => s !== null);

    return { data: renewalStudents, error: null };
  } catch (err) {
    return { data: [], error: toAppError(err, 'Lỗi tải dự báo gia hạn.') };
  }
}
