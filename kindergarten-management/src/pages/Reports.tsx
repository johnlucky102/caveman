import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wallet,
  AlertCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import Card, { CardHeader, StatCard } from '../components/common/Card';
import Select from '../components/common/Select';
import {
  getFinancialSummary,
  getFinancialOverview,
} from '@/services/dashboardService';
import { supabase } from '@/lib/supabase';
import { withSupabaseTimeout } from '@/lib/timeout';
import { useAuthStore } from '@/stores/authStore';
import { canManageFinance } from '@/lib/rbac';
import { formatCurrencyVND, summarizeDeductions } from '@/utils/reports';
import { getCurrentSchoolYear } from '@/utils/schoolYearCalendar';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FinancialSummary {
  totalRevenue: number;
  totalExpected: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  inTermDebt: number;
  overdueDebt: number;
}

interface DeductionLog {
  id: string;
  student_id: string;
  students?: {
    full_name?: string;
    classes?: { name?: string };
  };
  title: string;
  attendance_deduction_vnd: number;
  deduction_note: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function Reports() {
  // Global time filter: month
  const [filterPeriod, setFilterPeriod] = useState<string>(String(new Date().getMonth() + 1));
  
  // Data states
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [deductionLogs, setDeductionLogs] = useState<DeductionLog[]>([]);
  const [financialOverview, setFinancialOverview] = useState<{
    teacherCount: number;
    activeClassCount: number;
    totalStudentCount: number;
  } | null>(null);
  

  const [loading, setLoading] = useState(false);
  const role = useAuthStore(state => state.role);
  const hasFinanceAccess = canManageFinance(role);

  const currentSchoolYear = useMemo(() => getCurrentSchoolYear(), []);

  // Convert filterPeriod to month number (null = all months)
  const filterMonth = useMemo(() => {
    if (filterPeriod === 'all') return null;
    const val = parseInt(filterPeriod);
    return isNaN(val) ? null : val;
  }, [filterPeriod]);

  // Load all financial data when filter changes
  useEffect(() => {
    if (!hasFinanceAccess) return;
    
    setLoading(true);
    Promise.all([
      getFinancialSummary(filterMonth, currentSchoolYear),
      getFinancialOverview(),
    ]).then(([summaryRes, overviewRes]) => {
      setLoading(false);
      if (summaryRes.data) setFinancialSummary(summaryRes.data);
      if (overviewRes.data) setFinancialOverview(overviewRes.data);
    });
  }, [filterPeriod, currentSchoolYear, hasFinanceAccess]);

  // Derived financial stats from deduction logs
  const {
    totalMeal: totalMealDeduction,
    totalOther: totalOtherDeduction,
    total: totalDeduction,
    mealPercent: mealDeductionPercent,
    otherPercent: otherDeductionPercent
  } = summarizeDeductions(deductionLogs);


  // Load deduction logs
  const loadDeductionLogs = useCallback(async () => {
    try {
      const { data, error } = await withSupabaseTimeout(
        supabase
          .from('fee_records')
          .select('id, student_id, students(full_name, classes(name)), title, attendance_deduction_vnd, deduction_note')
          .gt('attendance_deduction_vnd', 0)
          .eq('del_yn', false)
          .order('created_at', { ascending: false }),
        8000,
        { data: [], error: null } as any
      );
      if (error) throw error;
      setDeductionLogs(data || []);
    } catch {
      // Silent fail
    }
  }, []);

  // Load deduction logs once on mount
  useEffect(() => {
    loadDeductionLogs();
  }, [loadDeductionLogs]);

  // Filter period options
  const periodOptions = [
    { value: 'all', label: 'Tất cả tháng' },
    { value: '1', label: 'Tháng 1' },
    { value: '2', label: 'Tháng 2' },
    { value: '3', label: 'Tháng 3' },
    { value: '4', label: 'Tháng 4' },
    { value: '5', label: 'Tháng 5' },
    { value: '6', label: 'Tháng 6' },
    { value: '7', label: 'Tháng 7' },
    { value: '8', label: 'Tháng 8' },
    { value: '9', label: 'Tháng 9' },
    { value: '10', label: 'Tháng 10' },
    { value: '11', label: 'Tháng 11' },
    { value: '12', label: 'Tháng 12' },
  ];

  // Derived numbers
  const revenueGap = (financialSummary?.totalExpected || 0) - (financialSummary?.totalRevenue || 0);
  const completionRate = financialSummary && financialSummary.totalExpected > 0
    ? Math.round((financialSummary.totalRevenue / financialSummary.totalExpected) * 100)
    : 0;
  const paidCount = financialSummary?.paidCount || 0;
  const overdueCount = financialSummary?.overdueCount || 0;
  const pendingCount = Math.max(0, (financialSummary?.pendingCount || 0) - overdueCount);

  const summaryRows = [
    {
      group: 'Doanh thu',
      rows: [
        { label: 'Doanh thu dự kiến', value: formatCurrencyVND(financialSummary?.totalExpected || 0), note: null, color: 'text-foreground' },
        { label: 'Doanh thu thực tế', value: formatCurrencyVND(financialSummary?.totalRevenue || 0), note: `${completionRate}% hoàn thành`, color: 'text-emerald-500' },
        { label: 'Chênh lệch (thiếu)', value: formatCurrencyVND(revenueGap), note: revenueGap > 0 ? 'Cần thu thêm' : 'Hoàn thành', color: revenueGap > 0 ? 'text-red-500' : 'text-emerald-500' },
      ]
    },
    {
      group: 'Học sinh',
      rows: [
        { label: 'Đã đóng học phí', value: `${paidCount} HS`, note: null, color: 'text-emerald-500' },
        { label: 'Chưa đóng (trong hạn)', value: `${pendingCount} HS`, note: null, color: 'text-amber-500' },
        { label: 'Nợ quá hạn', value: `${overdueCount} HS`, note: overdueCount > 0 ? 'Cần xử lý' : null, color: overdueCount > 0 ? 'text-red-500' : 'text-foreground' },
      ]
    },
    {
      group: 'Khấu trừ',
      rows: [
        { label: 'Tổng khấu trừ', value: formatCurrencyVND(totalDeduction), note: financialSummary && financialSummary.totalRevenue > 0 ? `-${Math.round((totalDeduction / financialSummary.totalRevenue) * 100)}% DT` : null, color: 'text-red-500' },
        { label: '└ Tiền cơm vắng mặt', value: formatCurrencyVND(totalMealDeduction), note: `${mealDeductionPercent}%`, color: 'text-amber-500' },
        { label: '└ Khấu trừ khác', value: formatCurrencyVND(totalOtherDeduction), note: `${otherDeductionPercent}%`, color: 'text-blue-400' },
      ]
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Global Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Trung tâm Báo cáo</h1>
          <p className="text-muted-foreground text-sm">Phân tích dữ liệu & Kết quả vận hành</p>
        </div>
        <Select
          value={filterPeriod}
          onChange={setFilterPeriod}
          options={periodOptions}
          className="w-44"
        />
      </div>

      {/* Access Denied Message */}
      {!hasFinanceAccess && (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">Truy cập bị hạn chế</h3>
          <p className="text-muted-foreground">Bạn không có quyền xem báo cáo tài chính. Vui lòng liên hệ quản trị viên.</p>
        </Card>
      )}

      {hasFinanceAccess && (
        <>
          {/* ─── KPI Cards Row ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Expected Revenue */}
            <StatCard
              label="Tổng doanh thu dự kiến"
              value={loading ? '...' : formatCurrencyVND(financialSummary?.totalExpected || 0)}
              icon={<Wallet className="w-5 h-5 text-slate-400" />}
              iconBg="bg-slate-100 dark:bg-slate-800"
            />
            {/* Card 2: Actual Revenue */}
            <StatCard
              label="Doanh thu thực tế"
              value={loading ? '...' : formatCurrencyVND(financialSummary?.totalRevenue || 0)}
              icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
              iconBg="bg-emerald-500/10"
              trend={financialSummary && financialSummary.totalExpected > 0
                ? `${Math.round((financialSummary.totalRevenue / financialSummary.totalExpected) * 100)}% so với dự kiến`
                : undefined}
              trendDirection={financialSummary && financialSummary.totalRevenue >= financialSummary.totalExpected ? 'up' : 'down'}
            />
            {/* Card 3: In-term Debt */}
            <StatCard
              label="Công nợ trong hạn"
              value={loading ? '...' : formatCurrencyVND(financialSummary?.inTermDebt || 0)}
              icon={<Clock className="w-5 h-5 text-amber-500" />}
              iconBg="bg-amber-500/10"
            />
            {/* Card 4: Overdue Debt */}
            <StatCard
              label="Nợ quá hạn"
              value={loading ? '...' : formatCurrencyVND(financialSummary?.overdueDebt || 0)}
              icon={<AlertCircle className="w-5 h-5 text-red-500" />}
              iconBg="bg-red-500/10"
            />
          </div>

          {/* ─── Summary Table ────────────────────────────────────────── */}
          <Card header={<CardHeader title="Tổng hợp tài chính kỳ này" subtitle={`Năm học ${currentSchoolYear} · Tháng ${filterPeriod}`} />}>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Đang tải...</div>
            ) : (
              <div className="divide-y divide-border">
                {summaryRows.map((group) => (
                  <div key={group.group}>
                    <div className="px-4 py-2 bg-muted/40">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{group.group}</p>
                    </div>
                    {group.rows.map((row) => (
                      <div key={row.label} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                        <span className="text-sm text-foreground">{row.label}</span>
                        <div className="flex items-center gap-3">
                          {row.note && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{row.note}</span>
                          )}
                          <span className={`text-sm font-bold tabular-nums ${row.color}`}>{row.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
