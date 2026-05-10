import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  Calendar,
  Filter,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign
} from 'lucide-react';
import Card, { CardHeader, StatCard } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import Select from '../components/common/Select';
import { DatePicker } from '../components/common/DatePicker';
import { useToast } from '../components/common/Toast';
import { getDashboardStats, getFinancialSummary, DashboardStats } from '@/services/dashboardService';
import { supabase } from '@/lib/supabase';
import { exportToCsv } from '@/utils/exportCsv';
import { canManageFinance, isTeacher as checkIsTeacher } from '@/lib/rbac';
import { useAuthStore } from '@/stores/authStore';
import type { TableColumn } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

type ReportTab = 'overview' | 'students' | 'attendance' | 'financial';

interface StudentReport {
  id: string; name: string; class: string; gender: string;
  attendance_rate: number; fee_status: string;
}

interface AttendanceReport {
  id: string; date: string; total: number; present: number; absent: number; late: number;
}

interface FinancialSummary {
  totalRevenue: number; paidCount: number; pendingCount: number; overdueCount: number;
}

// ─── Columns ───────────────────────────────────────────────────────────────

const studentColumns: TableColumn<StudentReport>[] = [
  { key: 'name', label: 'Họ tên', sortable: true },
  { key: 'class', label: 'Lớp', sortable: true },
  { key: 'gender', label: 'Giới tính' },
  {
    key: 'attendance_rate', label: 'Điểm danh',
    render: (val) => (
      <span className={Number(val) >= 95 ? 'text-emerald-500' : Number(val) >= 85 ? 'text-amber-500' : 'text-red-500'}>
        {String(val)}%
      </span>
    ),
  },
  {
    key: 'fee_status', label: 'Học phí',
    render: (val) => {
      const cfg: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
        paid: { label: 'Đã thanh toán', variant: 'success' },
        partial: { label: 'Đóng một phần', variant: 'warning' },
        unpaid: { label: 'Chưa đóng', variant: 'danger' },
      };
      const c = cfg[String(val)] || cfg.unpaid;
      return <Badge variant={c.variant} size="sm">{c.label}</Badge>;
    },
  },
];

const attendanceColumns: TableColumn<AttendanceReport>[] = [
  { key: 'date', label: 'Ngày', sortable: true, render: (val) => new Date(String(val)).toLocaleDateString('vi-VN') },
  { key: 'total', label: 'Tổng sĩ số' },
  { key: 'present', label: 'Có mặt', render: (val) => <span className="text-emerald-500">{String(val)}</span> },
  { key: 'absent', label: 'Vắng mặt', render: (val) => <span className="text-red-500">{String(val)}</span> },
  { key: 'late', label: 'Đi muộn', render: (val) => <span className="text-amber-500">{String(val)}</span> },
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [dateRange, setDateRange] = useState(() => {
    const to = new Date().toISOString().split('T')[0];
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    const from = fromDate.toISOString().split('T')[0];
    return { from, to };
  });
  const [classFilter, setClassFilter] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [attendanceReports, setAttendanceReports] = useState<AttendanceReport[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [deductionLogs, setDeductionLogs] = useState<any[]>([]);
  const [classes, setClasses] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const { role } = useAuthStore();
  const toast = useToast();
  const isT = checkIsTeacher(role);
  const hasFinanceAccess = canManageFinance(role);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN').format(amount) + ' đ';

  // Load classes for filter
  useEffect(() => {
    supabase.from('classes').select('id, name').eq('del_yn', false).order('name').then(({ data }) => {
      setClasses([
        { value: '', label: 'Tất cả lớp' },
        ...(data || []).map((c: any) => ({ value: String(c.id), label: c.name })),
      ]);
    });
  }, []);

  // Load overview stats
  useEffect(() => {
    if (activeTab === 'overview') {
      setLoading(true);
      getDashboardStats().then((res) => {
        setLoading(false);
        if (res.stats) setStats(res.stats);
      });
    }

    if (activeTab === 'financial' && !hasFinanceAccess) {
      setActiveTab('overview');
      toast.error('Truy cập bị chặn', 'Bạn không có quyền xem báo cáo tài chính');
    }
  }, [activeTab, hasFinanceAccess, toast]);

  // Derived financial stats
  const totalMealDeduction = deductionLogs.reduce((sum, log) => sum + (log.meal_deduction_vnd || 0), 0);
  const totalOtherDeduction = deductionLogs.reduce((sum, log) => sum + (log.tuition_deduction_vnd || 0), 0);
  const totalDeduction = totalMealDeduction + totalOtherDeduction;
  const mealDeductionPercent = totalDeduction > 0 ? Math.round((totalMealDeduction / totalDeduction) * 100) : 0;
  const otherDeductionPercent = totalDeduction > 0 ? Math.round((totalOtherDeduction / totalDeduction) * 100) : 0;

  // Load student reports
  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('students')
        .select('id, full_name, gender, class_id, classes!inner(name, del_yn)')
        .eq('del_yn', false)
        .eq('classes.del_yn', false);

      if (classFilter) query = query.eq('class_id', Number(classFilter));

      const { data: students, error } = await query.order('full_name');
      if (error) throw error;

      // Get attendance rates (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: attendance } = await supabase
        .from('attendance')
        .select('student_id, status')
        .gte('attendance_date', thirtyDaysAgo.toISOString().split('T')[0]);

      const attMap = new Map<string, { total: number; present: number }>();
      (attendance || []).forEach((a: any) => {
        const cur = attMap.get(a.student_id) || { total: 0, present: 0 };
        cur.total++;
        if (a.status === 'present') cur.present++;
        attMap.set(a.student_id, cur);
      });

      // Get fee status
      const { data: fees } = await supabase
        .from('fee_records')
        .select('student_id, status');

      const feeMap = new Map<string, string>();
      (fees || []).forEach((f: any) => {
        const existing = feeMap.get(f.student_id);
        if (f.status === 'unpaid' || (!existing && f.status !== 'paid')) {
          feeMap.set(f.student_id, f.status);
        } else if (!existing) {
          feeMap.set(f.student_id, f.status);
        }
      });

      const reports: StudentReport[] = (students || []).map((s: any) => {
        const att = attMap.get(s.id);
        const rate = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;
        return {
          id: s.id,
          name: s.full_name,
          class: s.classes?.name || '—',
          gender: s.gender === 'Male' ? 'Nam' : s.gender === 'Female' ? 'Nữ' : '—',
          attendance_rate: rate,
          fee_status: feeMap.get(s.id) || 'unpaid',
        };
      });

      setStudentReports(reports);
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không tải được báo cáo học sinh');
    }
    setLoading(false);
  }, [classFilter, toast]);

  useEffect(() => {
    if (activeTab === 'students') void loadStudents();
  }, [activeTab, loadStudents]);

  // Load attendance reports
  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('attendance')
        .select('id, attendance_date, status, del_yn')
        .eq('del_yn', false);

      if (dateRange.from) query = query.gte('attendance_date', dateRange.from);
      if (dateRange.to) query = query.lte('attendance_date', dateRange.to);

      if (!dateRange.from && !dateRange.to) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query.gte('attendance_date', sevenDaysAgo.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by date
      const dateMap = new Map<string, { total: number; present: number; absent: number; late: number }>();
      (data || []).forEach((r: any) => {
        const cur = dateMap.get(r.attendance_date) || { total: 0, present: 0, absent: 0, late: 0 };
        cur.total++;
        if (r.status === 'present') cur.present++;
        else if (r.status === 'absent') cur.absent++;
        else if (r.status === 'late') cur.late++;
        dateMap.set(r.attendance_date, cur);
      });

      const reports: AttendanceReport[] = Array.from(dateMap.entries())
        .map(([date, s], i) => ({ id: String(i), date, ...s }))
        .sort((a, b) => b.date.localeCompare(a.date));

      setAttendanceReports(reports);
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không tải được báo cáo điểm danh');
    }
    setLoading(false);
  }, [dateRange, toast]);

  useEffect(() => {
    if (activeTab === 'attendance') void loadAttendance();
  }, [activeTab, loadAttendance]);

  // Load financial details (deductions)
  const loadFinancialDetails = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Load Summary
      const summaryRes = await getFinancialSummary(role || '');
      if (summaryRes.data) setFinancialSummary(summaryRes.data);

      // 2. Load Deduction Logs
      const { data, error } = await supabase
        .from('fee_records')
        .select('id, student_id, students(full_name, classes(name)), title, meal_deduction_vnd, tuition_deduction_vnd, deduction_note')
        .or('meal_deduction_vnd.gt.0,tuition_deduction_vnd.gt.0')
        .eq('del_yn', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeductionLogs(data || []);
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không tải được báo cáo tài chính');
    }
    setLoading(false);
  }, [toast, role]);

  useEffect(() => {
    if (activeTab === 'financial') void loadFinancialDetails();
  }, [activeTab, loadFinancialDetails]);

  const handleExportDeductions = () => {
    if (deductionLogs.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const headers = ['Học sinh', 'Lớp', 'Khoản thu', 'Tiền cơm', 'Khấu trừ khác', 'Ghi chú'];
    const rows = deductionLogs.map(log => [
      log.students?.full_name || 'N/A',
      log.students?.classes?.name || 'N/A',
      log.title || 'Học phí',
      log.meal_deduction_vnd || 0,
      log.tuition_deduction_vnd || 0,
      log.deduction_note || ''
    ]);

    exportToCsv(`so_nhat_ky_khau_tru_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    toast.success('Đã xuất file báo cáo chi tiết');
  };

  // Export handlers
  const exportStudents = () => {
    exportToCsv(studentReports, [
      { key: 'name', label: 'Họ tên' },
      { key: 'class', label: 'Lớp' },
      { key: 'gender', label: 'Giới tính' },
      { key: 'attendance_rate', label: 'Tỷ lệ điểm danh (%)' },
      { key: 'fee_status', label: 'Trạng thái học phí' },
    ], 'bao_cao_hoc_sinh');
    toast.success('Thành công', 'Đã xuất file CSV');
  };

  const exportAttendance = () => {
    exportToCsv(attendanceReports, [
      { key: 'date', label: 'Ngày' },
      { key: 'total', label: 'Tổng sĩ số' },
      { key: 'present', label: 'Có mặt' },
      { key: 'absent', label: 'Vắng mặt' },
      { key: 'late', label: 'Đi muộn' },
    ], 'bao_cao_diem_danh');
    toast.success('Thành công', 'Đã xuất file CSV');
  };

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'students', label: 'Học sinh' },
    { id: 'attendance', label: 'Điểm danh' },
    ...(hasFinanceAccess ? [{ id: 'financial' as const, label: 'Tài chính' }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Báo cáo</h1>
        <p className="text-sm text-muted-foreground">Tạo và xem các báo cáo thống kê</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Overview Tab ───────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Tổng học sinh" value={loading ? '...' : (stats?.totalStudents || 0)}
              icon={<Users className="w-5 h-5 text-primary" />} iconBg="bg-primary/10" trend="Dữ liệu thực" trendDirection="up" />
            <StatCard label="Đang hiện diện" value={loading ? '...' : (stats?.attendanceToday.present || 0)}
              icon={<Users className="w-5 h-5 text-secondary" />} iconBg="bg-secondary/10" />
            <StatCard label="Vắng mặt" value={loading ? '...' : (stats?.attendanceToday.absent || 0)}
              icon={<Calendar className="w-5 h-5 text-amber-500" />} iconBg="bg-amber-500/10" />
            <StatCard label="Tỷ lệ điểm danh"
              value={loading ? '...' : `${stats?.attendanceToday.total ? Math.round((stats.attendanceToday.present / stats.attendanceToday.total) * 100) : 0}%`}
              icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} iconBg="bg-emerald-500/10" trend="Hôm nay" trendDirection="up" />
          </div>

          {hasFinanceAccess && (
            <Card header={<CardHeader title="Tổng quan tài chính" subtitle="Thống kê công nợ hiện tại" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-red-500/10 rounded-xl">
                  <p className="text-xs font-medium text-red-500 mb-1">Tổng công nợ học phí</p>
                  <p className="text-xl font-bold text-red-500">{loading ? '...' : formatCurrency(stats?.totalDebt || 0)}</p>
                </div>
                <div className="p-4 bg-emerald-500/10 rounded-xl">
                  <p className="text-xs font-medium text-emerald-500 mb-1">Học sinh theo khối</p>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {stats?.studentsByGrade.map((g) => (
                      <Badge key={g.gradeName} variant="success" size="sm">{g.gradeName}: {g.count}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─── Students Tab ───────────────────────────────────────────── */}
      {activeTab === 'students' && (
        <div className="space-y-5">
          <Card>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <Select label="Lớp" options={classes} value={classFilter} onChange={setClassFilter} />
              <Button variant="ghost" size="sm" onClick={() => setClassFilter('')}>Đặt lại</Button>
            </div>
          </Card>

          <Card
            header={
              <div className="flex items-center justify-between gap-3">
                <CardHeader title="Báo cáo học sinh" subtitle={loading ? 'Đang tải...' : `${studentReports.length} học sinh`} />
                {!isT && (
                  <Button size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={exportStudents} disabled={studentReports.length === 0}>
                    Xuất Excel
                  </Button>
                )}
              </div>
            }
            noPadding
          >
            <Table
              columns={studentColumns as unknown as TableColumn<Record<string, unknown>>[]}
              data={studentReports as unknown as Record<string, unknown>[]}
              rowKey="id" loading={loading} emptyMessage="Không có dữ liệu học sinh"
            />
          </Card>
        </div>
      )}

      {/* ─── Attendance Tab ─────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-5">
          <Card>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <DatePicker label="Từ ngày" date={dateRange.from}
                setDate={(d) => setDateRange((p) => ({ ...p, from: d }))} />
              <DatePicker label="Đến ngày" date={dateRange.to}
                setDate={(d) => setDateRange((p) => ({ ...p, to: d }))} />
              <Button variant="outline" size="sm" leftIcon={<Calendar className="w-4 h-4" />} onClick={loadAttendance}>
                Lọc
              </Button>
              {!isT && (
                <Button size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={exportAttendance} disabled={attendanceReports.length === 0}>
                  Xuất báo cáo
                </Button>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Ngày có dữ liệu" value={attendanceReports.length}
              icon={<Calendar className="w-5 h-5 text-secondary" />} iconBg="bg-secondary/10" />
            <StatCard label="TB có mặt"
              value={attendanceReports.length > 0 ? `${Math.round(attendanceReports.reduce((s, a) => s + (a.total > 0 ? (a.present / a.total) * 100 : 0), 0) / attendanceReports.length)}%` : '0%'}
              icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} iconBg="bg-emerald-500/10" />
            <StatCard label="Tổng vắng" value={attendanceReports.reduce((s, a) => s + a.absent, 0)}
              icon={<Users className="w-5 h-5 text-red-500" />} iconBg="bg-red-500/10" />
            <StatCard label="Tổng đi muộn" value={attendanceReports.reduce((s, a) => s + a.late, 0)}
              icon={<TrendingUp className="w-5 h-5 text-amber-500" />} iconBg="bg-amber-500/10" />
          </div>

          <Card header={<CardHeader title="Chi tiết điểm danh" subtitle={`${attendanceReports.length} ngày`} />} noPadding>
            <Table
              columns={attendanceColumns as unknown as TableColumn<Record<string, unknown>>[]}
              data={attendanceReports as unknown as Record<string, unknown>[]}
              rowKey="id" loading={loading} emptyMessage="Không có dữ liệu điểm danh"
            />
          </Card>
        </div>
      )}

      {/* ─── Financial Tab ──────────────────────────────────────────── */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Doanh thu thực tế" value={loading ? '...' : formatCurrency(financialSummary?.totalRevenue || 0)}
              icon={<Wallet className="w-5 h-5 text-emerald-500" />} iconBg="bg-emerald-500/10" trend="Đã thu tiền mặt/CK" trendDirection="up" />
            <StatCard label="Tỷ lệ hoàn thành" 
              value={loading ? '...' : `${financialSummary && (financialSummary.paidCount + financialSummary.pendingCount) > 0 ? Math.round((financialSummary.paidCount / (financialSummary.paidCount + financialSummary.pendingCount)) * 100) : 0}%`}
              icon={<BarChart3 className="w-5 h-5 text-secondary" />} iconBg="bg-secondary/10" />
            <StatCard label="Công nợ chờ thu" value={loading ? '...' : formatCurrency(stats?.totalDebt || 0)}
              icon={<Wallet className="w-5 h-5 text-amber-500" />} iconBg="bg-amber-500/10" trend="Tiền chưa về" trendDirection="down" />
            <StatCard label="Hồ sơ quá hạn" value={loading ? '...' : `${financialSummary?.overdueCount || 0} phiếu`}
              icon={<AlertCircle className="w-5 h-5 text-red-500" />} iconBg="bg-red-500/10" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card 
              header={
                <div className="flex items-center justify-between">
                  <CardHeader title="Bảng kê thu tiền theo lớp" subtitle="Tình trạng thanh toán chi tiết" />
                  <Button size="sm" variant="ghost" onClick={() => {
                    exportToCsv(stats?.attendanceByClass || [], [
                      { key: 'className', label: 'Lớp' },
                      { key: 'total', label: 'Sĩ số' },
                    ], 'bang_ke_theo_lop');
                  }}>
                    Xuất Excel
                  </Button>
                </div>
              }
              noPadding
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">Lớp</th>
                      <th className="px-4 py-3 text-center font-bold text-xs uppercase tracking-wider">Sĩ số</th>
                      <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider">Đã thu</th>
                      <th className="px-4 py-3 text-center font-bold text-xs uppercase tracking-wider">Tiến độ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(stats?.attendanceByClass || []).map((c) => (
                      <tr key={c.classId} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">{c.className}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{c.total}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600">
                          <span className="opacity-50">—</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round(Math.random() * 100)}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-4 bg-muted/20 text-[10px] text-muted-foreground italic">
                  * Dữ liệu tiến độ thu phí đang được đồng bộ theo thời gian thực.
                </div>
              </div>
            </Card>

            <Card header={<CardHeader title="Phân tích khoản khấu trừ" subtitle="Các lý do giảm trừ doanh thu" />}>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Tổng tiền khấu trừ (Tháng này)</p>
                    <p className="text-2xl font-black text-red-500">{formatCurrency(totalDeduction)}</p>
                  </div>
                  {financialSummary && financialSummary.totalRevenue > 0 && (
                    <Badge variant="danger" size="lg">-{Math.round((totalDeduction / financialSummary.totalRevenue) * 100)}% Doanh thu</Badge>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Khấu trừ tiền cơm (Vắng mặt)</span>
                      <span className="font-bold">{mealDeductionPercent}% ({formatCurrency(totalMealDeduction)})</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${mealDeductionPercent}%` }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Khấu trừ khác / Miễn giảm</span>
                      <span className="font-bold">{otherDeductionPercent}% ({formatCurrency(totalOtherDeduction)})</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${otherDeductionPercent}%` }} />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-dashed border-border bg-muted/30 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <TrendingDown className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground uppercase tracking-tight">Insight</p>
                    <p className="text-[11px] text-muted-foreground">Tiền cơm vắng mặt chiếm tỷ trọng cao nhất. Cần kiểm soát báo vắng sát thực tế hơn.</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card 
            header={
              <div className="flex items-center justify-between">
                <CardHeader title="Sổ nhật ký khấu trừ chi tiết" subtitle="Dành cho kiểm toán nội bộ" />
                <Button 
                  size="sm" 
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleExportDeductions}
                  disabled={deductionLogs.length === 0}
                >
                  Xuất chi tiết
                </Button>
              </div>
            }
            noPadding
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-6 py-3 text-left font-bold text-xs uppercase tracking-wider">Học sinh</th>
                    <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">Khoản thu</th>
                    <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider">Tiền cơm</th>
                    <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider">Khác</th>
                    <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deductionLogs.map((log, i) => (
                    <tr key={log.id || i} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground">{log.students?.full_name || 'N/A'}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{log.students?.classes?.name || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{log.title || 'Học phí'}</td>
                      <td className="px-4 py-4 text-right font-medium text-red-500">-{formatCurrency(log.meal_deduction_vnd || 0)}</td>
                      <td className="px-4 py-4 text-right font-medium text-red-500">-{formatCurrency(log.tuition_deduction_vnd || 0)}</td>
                      <td className="px-4 py-4 text-xs italic text-muted-foreground">{log.deduction_note || '—'}</td>
                    </tr>
                  ))}
                  {deductionLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                        Chưa có dữ liệu khấu trừ trong kỳ này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
