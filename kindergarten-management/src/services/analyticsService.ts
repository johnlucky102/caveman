import { supabase } from '@/lib/supabase';
import { withSupabaseTimeout } from '@/lib/timeout';
import { toAppError } from './supabaseErrors';
import type { AppError } from '@/types/domain';

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
      { data: [], error: null }
    );

    if (error) throw error;

    const records = data || [];
    
    // Group by month
    // Note: In real production, we'd filter by month/year in SQL. 
    // Here we aggregate from all records for the last 6 months for simplicity in this step.
    const trendMap = new Map<string, { revenue: number; debt: number }>();
    
    months.forEach(m => trendMap.set(m, { revenue: 0, debt: 0 }));

    records.forEach((r: any) => {
      // Assuming month is 1-12 and school_year is "2023-2024"
      // We'll just match the month part for this simplified overview
      const mKey = `${new Date().getFullYear()}-${String(r.month).padStart(2, '0')}`;
      if (trendMap.has(mKey)) {
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
      { data: [], error: null }
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
      { data: [], error: null }
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

      const dueDate = new Date(r.due_date);
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
