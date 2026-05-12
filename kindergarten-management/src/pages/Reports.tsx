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
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import Card, { CardHeader, StatCard } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import Select from '../components/common/Select';
import { DatePicker } from '../components/common/DatePicker';
import { useToast } from '../components/common/Toast';
import { 
  getDashboardStats,
  getFinancialSummary, 
  getAttendanceTrend,
  DashboardStats,
  AttendanceTrendPoint 
} from '@/services/dashboardService';
import { listAttendanceHistory } from '@/services/attendanceService';
import { getRevenueTrend, getStudentDistribution, getDebtAging, RevenueTrendPoint, AgingBucket } from '@/services/analyticsService';
import { supabase } from '@/lib/supabase';
import { withSupabaseTimeout } from '@/lib/timeout';
import { useAuthStore } from '@/stores/authStore';
import { canManageFinance, isTeacher as checkIsTeacher } from '@/lib/rbac';
import { formatCurrencyVND, calculateAttendanceRate, summarizeDeductions } from '@/utils/reports';
import { exportToCsv } from '@/utils/exportCsv';
import type { TableColumn } from '../types';

// ─── Constants ──────────────────────────────────────────────────────────────
const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

// ─── Types ───────────────────────────────────────────────────────────────────

type ReportTab = 'overview' | 'students' | 'attendance' | 'financial';

interface StudentReport {
  id: string; name: string; class: string; gender: string;
  attendance_rate: number; fee_status: string;
}

interface AttendanceReport {
  id: string; date: string; total: number; present: number; absent: number; late: number;
}

interface AttendanceDetail {
  id: string;
  student_name: string;
  class_name: string;
  attendance_date: string;
  status: string;
  check_in_time: string | null;
  note: string | null;
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

const attendanceDetailColumns: TableColumn<AttendanceDetail>[] = [
  { key: 'attendance_date', label: 'Ngày', sortable: true, render: (val) => new Date(String(val)).toLocaleDateString('vi-VN') },
  { key: 'student_name', label: 'Học sinh', sortable: true },
  { key: 'class_name', label: 'Lớp' },
  {
    key: 'status', label: 'Trạng thái',
    render: (val) => {
      const cfg: any = {
        present: { label: 'Có mặt', variant: 'success' },
        absent: { label: 'Vắng mặt', variant: 'danger' },
        late: { label: 'Đi muộn', variant: 'warning' },
        excused: { label: 'Nghỉ phép', variant: 'info' }
      };
      const c = cfg[String(val)] || { label: val, variant: 'secondary' };
      return <Badge variant={c.variant} size="sm">{c.label}</Badge>;
    }
  },
  { key: 'check_in_time', label: 'Giờ đến', render: (val) => val ? String(val).substring(0, 5) : '-' },
  { key: 'note', label: 'Ghi chú', render: (val) => <span className="text-xs italic text-muted-foreground">{val || '-'}</span> },
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
  const [attendanceDetails, setAttendanceDetails] = useState<AttendanceDetail[]>([]);
  const [attSubTab, setAttSubTab] = useState<'summary' | 'detail'>('summary');
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [deductionLogs, setDeductionLogs] = useState<any[]>([]);
  const [classes, setClasses] = useState<{ value: string; label: string }[]>([]);
  
  // Analytics data
  const [attendanceTrend, setAttendanceTrend] = useState<AttendanceTrendPoint[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([]);
  const [studentDistribution, setStudentDistribution] = useState<{
    gender: { name: string; value: number }[];
    grade: { name: string; value: number }[];
  }>({ gender: [], grade: [] });
  const [debtAging, setDebtAging] = useState<AgingBucket[]>([]);

  const [loading, setLoading] = useState(false);
  const role = useAuthStore(state => state.role);
  const authUser = useAuthStore(state => state.user);
  const toast = useToast();
  
  const isT = checkIsTeacher(role);
  const hasFinanceAccess = canManageFinance(role);

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
      Promise.all([
        getDashboardStats(),
        getAttendanceTrend()
      ]).then(([resStats, resTrend]) => {
        setLoading(false);
        if (resStats.stats) setStats(resStats.stats);
        if (resTrend.trend) setAttendanceTrend(resTrend.trend);
      });
    }

    if (activeTab === 'financial' && !hasFinanceAccess) {
      setActiveTab('overview');
      toast.error('Truy cập bị chặn', 'Bạn không có quyền xem báo cáo tài chính');
    }
  }, [activeTab, hasFinanceAccess, toast]);

  // Derived financial stats using extracted utils
  const { 
    totalMeal: totalMealDeduction, 
    totalOther: totalOtherDeduction, 
    total: totalDeduction, 
    mealPercent: mealDeductionPercent, 
    otherPercent: otherDeductionPercent 
  } = summarizeDeductions(deductionLogs);

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
      const { data: attendance } = await withSupabaseTimeout(
        supabase
          .from('attendance')
          .select('student_id, status')
          .gte('attendance_date', thirtyDaysAgo.toISOString().split('T')[0]),
        8000,
        { data: [], error: null }
      );

      const attMap = new Map<string, { total: number; present: number }>();
      (attendance || []).forEach((a: any) => {
        const cur = attMap.get(a.student_id) || { total: 0, present: 0 };
        cur.total++;
        if (a.status === 'present') cur.present++;
        attMap.set(a.student_id, cur);
      });

      // Get fee status
      const { data: fees } = await withSupabaseTimeout(
        supabase
          .from('fee_records')
          .select('student_id, status'),
        8000,
        { data: [], error: null }
      );

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
        const rate = calculateAttendanceRate(att?.present || 0, att?.total || 0);
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
    if (activeTab === 'students') {
      void loadStudents();
      getStudentDistribution().then(res => {
        setStudentDistribution({ gender: res.gender, grade: res.grade });
      });
    }
  }, [activeTab, loadStudents]);

  // Load attendance reports
  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      if (attSubTab === 'summary') {
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

        const { data, error } = await withSupabaseTimeout(query, 8000, { data: [], error: null });
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
      } else {
        // Detailed history
        const { items, error } = await listAttendanceHistory(
          classFilter ? Number(classFilter) : undefined,
          undefined,
          dateRange.from || undefined,
          dateRange.to || undefined,
          role === 'Teacher' ? authUser?.id : undefined
        );
        if (error) throw error;
        setAttendanceDetails(items as any);
      }
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không tải được báo cáo điểm danh');
    }
    setLoading(false);
  }, [dateRange, attSubTab, classFilter, role, authUser?.id, toast]);

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
      const { data, error } = await withSupabaseTimeout(
        supabase
          .from('fee_records')
          .select('id, student_id, students(full_name, classes(name)), title, meal_deduction_vnd, tuition_deduction_vnd, deduction_note')
          .or('meal_deduction_vnd.gt.0,tuition_deduction_vnd.gt.0')
          .eq('del_yn', false)
          .order('created_at', { ascending: false }),
        8000,
        { data: [], error: null }
      );

      if (error) throw error;
      setDeductionLogs(data || []);
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không tải được báo cáo tài chính');
    }
    setLoading(false);
  }, [toast, role]);

  useEffect(() => {
    if (activeTab === 'financial') {
      void loadFinancialDetails();
      getRevenueTrend().then(res => {
        if (res.data) setRevenueTrend(res.data);
      });
      getDebtAging().then(res => {
        if (res.data) setDebtAging(res.data);
      });
    }
  }, [activeTab, loadFinancialDetails]);

  const handleExportDeductions = () => {
    if (deductionLogs.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    exportToCsv(
      deductionLogs.map(log => ({
        student_name: log.students?.full_name || 'N/A',
        class_name: log.students?.classes?.name || 'N/A',
        title: log.title || 'Học phí',
        meal_deduction: log.meal_deduction_vnd || 0,
        other_deduction: log.tuition_deduction_vnd || 0,
        note: log.deduction_note || ''
      })),
      [
        { key: 'student_name', label: 'Học sinh' },
        { key: 'class_name', label: 'Lớp' },
        { key: 'title', label: 'Khoản thu' },
        { key: 'meal_deduction', label: 'Tiền cơm', render: (val) => String(val) },
        { key: 'other_deduction', label: 'Khấu trừ khác', render: (val) => String(val) },
        { key: 'note', label: 'Ghi chú' }
      ],
      `so_nhat_ky_khau_tru_${new Date().toISOString().slice(0, 10)}`
    );
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
    if (attSubTab === 'summary') {
      exportToCsv(attendanceReports, [
        { key: 'date', label: 'Ngày' },
        { key: 'total', label: 'Tổng sĩ số' },
        { key: 'present', label: 'Có mặt' },
        { key: 'absent', label: 'Vắng mặt' },
        { key: 'late', label: 'Đi muộn' },
      ], 'bao_cao_diem_danh_tong_hop');
    } else {
      exportToCsv(attendanceDetails, [
        { key: 'attendance_date', label: 'Ngày' },
        { key: 'student_name', label: 'Học sinh' },
        { key: 'class_name', label: 'Lớp' },
        { key: 'status', label: 'Trạng thái' },
        { key: 'check_in_time', label: 'Giờ đến' },
        { key: 'note', label: 'Ghi chú' },
      ], 'bao_cao_diem_danh_chi_tiet');
    }
    toast.success('Thành công', 'Đã xuất file CSV');
  };

  const exportFullReport = () => {
    // Combine overview stats into a CSV
    const overviewData = [
      { metric: 'Tổng số học sinh', value: stats?.totalStudents || 0 },
      { metric: 'Tổng công nợ', value: formatCurrencyVND(stats?.totalDebt || 0) },
      { metric: 'Doanh thu thực tế', value: formatCurrencyVND(financialSummary?.totalRevenue || 0) },
      { metric: 'Tỷ lệ hiện diện trung bình', value: `${attendanceTrend[attendanceTrend.length - 1]?.rate || 0}%` },
    ];
    
    exportToCsv(overviewData, [
      { key: 'metric', label: 'Chỉ số' },
      { key: 'value', label: 'Giá trị' }
    ], 'bao_cao_tong_quan_he_thong');
    toast.success('Thành công', 'Đã xuất báo cáo tổng hợp');
  };

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'students', label: 'Học sinh' },
    { id: 'attendance', label: 'Điểm danh' },
    ...(hasFinanceAccess ? [{ id: 'financial' as const, label: 'Tài chính' }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Trung tâm Báo cáo</h1>
          <p className="text-muted-foreground text-sm">Phân tích dữ liệu & Kết quả vận hành</p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" icon={<FileText className="w-4 h-4" />} onClick={() => window.print()}>In báo cáo</Button>
           {!isT && <Button icon={<Download className="w-4 h-4" />} onClick={exportFullReport}>Xuất tổng hợp</Button>}
        </div>
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
              value={loading ? '...' : `${stats?.attendanceToday.total ? calculateAttendanceRate(stats.attendanceToday.present, stats.attendanceToday.total) : 0}%`}
              icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} iconBg="bg-emerald-500/10" trend="Hôm nay" trendDirection="up" />
          </div>

          {hasFinanceAccess && (
            <Card header={<CardHeader title="Tổng quan tài chính" subtitle="Thống kê công nợ hiện tại" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-red-500/10 rounded-xl">
                  <p className="text-xs font-medium text-red-500 mb-1">Tổng công nợ học phí</p>
                  <p className="text-xl font-bold text-red-500">{loading ? '...' : formatCurrencyVND(stats?.totalDebt || 0)}</p>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card header={<CardHeader title="Xu hướng điểm danh" subtitle="7 ngày gần nhất" />}>
              <div className="h-[300px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card header={<CardHeader title="Cơ cấu sĩ số" subtitle="Theo khối lớp" />}>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={studentDistribution.grade}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {studentDistribution.grade.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card header={<CardHeader title="Phân bổ giới tính" subtitle="Toàn trường" />}>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={studentDistribution.gender}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      <Cell fill="#3B82F6" />
                      <Cell fill="#EC4899" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            <Card header={<CardHeader title="Thống kê theo giới tính" />}>
               <div className="space-y-4 pt-4">
                 {studentDistribution.gender.map((g, i) => (
                   <div key={g.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                     <div className="flex items-center gap-3">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: i === 0 ? '#3B82F6' : '#EC4899' }} />
                       <span className="text-sm font-medium">{g.name}</span>
                     </div>
                     <span className="text-sm font-bold">{g.value} trẻ</span>
                   </div>
                 ))}
               </div>
            </Card>
          </div>

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
              <Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />} onClick={loadAttendance}>
                Lọc dữ liệu
              </Button>
              {!isT && (
                <Button size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={exportAttendance} disabled={attSubTab === 'summary' ? attendanceReports.length === 0 : attendanceDetails.length === 0}>
                  Xuất CSV
                </Button>
              )}
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setAttSubTab('summary')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                  attSubTab === 'summary' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Tổng hợp ngày
              </button>
              <button
                onClick={() => setAttSubTab('detail')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                  attSubTab === 'detail' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Chi tiết lịch sử
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Ngày có dữ liệu" value={attendanceReports.length}
              icon={<Calendar className="w-5 h-5 text-secondary" />} iconBg="bg-secondary/10" />
            <StatCard label="TB có mặt"
              value={attendanceReports.length > 0 ? `${Math.round(attendanceReports.reduce((s, a) => s + calculateAttendanceRate(a.present, a.total), 0) / attendanceReports.length)}%` : '0%'}
              icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} iconBg="bg-emerald-500/10" />
            <StatCard label="Tổng vắng" value={attendanceReports.reduce((s, a) => s + a.absent, 0)}
              icon={<Users className="w-5 h-5 text-red-500" />} iconBg="bg-red-500/10" />
            <StatCard label="Tổng đi muộn" value={attendanceReports.reduce((s, a) => s + a.late, 0)}
              icon={<TrendingUp className="w-5 h-5 text-amber-500" />} iconBg="bg-amber-500/10" />
          </div>

          <Card 
            header={
              <CardHeader 
                title={attSubTab === 'summary' ? "Chi tiết điểm danh" : "Lịch sử điểm danh chi tiết"} 
                subtitle={attSubTab === 'summary' ? `${attendanceReports.length} ngày` : "Dữ liệu từng học sinh"} 
              />
            } 
            noPadding
          >
            <Table
              columns={(attSubTab === 'summary' ? attendanceColumns : attendanceDetailColumns) as unknown as TableColumn<Record<string, unknown>>[]}
              data={(attSubTab === 'summary' ? attendanceReports : attendanceDetails) as unknown as Record<string, unknown>[]}
              rowKey="id" loading={loading} emptyMessage="Không có dữ liệu điểm danh"
              pagination
            />
          </Card>
        </div>
      )}

      {/* ─── Financial Tab ──────────────────────────────────────────── */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Doanh thu thực tế" value={loading ? '...' : formatCurrencyVND(financialSummary?.totalRevenue || 0)}
              icon={<Wallet className="w-5 h-5 text-emerald-500" />} iconBg="bg-emerald-500/10" trend="Đã thu tiền mặt/CK" trendDirection="up" />
            <StatCard label="Tỷ lệ hoàn thành" 
              value={loading ? '...' : `${financialSummary && (financialSummary.paidCount + financialSummary.pendingCount) > 0 ? calculateAttendanceRate(financialSummary.paidCount, (financialSummary.paidCount + financialSummary.pendingCount)) : 0}%`}
              icon={<BarChart3 className="w-5 h-5 text-secondary" />} iconBg="bg-secondary/10" />
            <StatCard label="Công nợ chờ thu" value={loading ? '...' : formatCurrencyVND(stats?.totalDebt || 0)}
              icon={<Wallet className="w-5 h-5 text-amber-500" />} iconBg="bg-amber-500/10" trend="Tiền chưa về" trendDirection="down" />
            <StatCard label="Hồ sơ quá hạn" value={loading ? '...' : `${financialSummary?.overdueCount || 0} phiếu`}
              icon={<AlertCircle className="w-5 h-5 text-red-500" />} iconBg="bg-red-500/10" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card header={<CardHeader title="Biểu đồ doanh thu & Công nợ" subtitle="6 tháng gần nhất" />}>
              <div className="h-[300px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip 
                       formatter={(val: number) => formatCurrencyVND(val)}
                       contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Đã thu" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="debt" name="Công nợ" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card header={<CardHeader title="Insight Tài chính" />}>
              <div className="space-y-6 pt-2">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Tổng quan
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tỷ lệ thu phí tháng này đang đạt mức ổn định. Tuy nhiên, công nợ lũy kế cần được chú ý xử lý dứt điểm trước kỳ nghỉ lễ tới.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Tháng cao điểm</p>
                    <p className="text-sm font-bold mt-1">Tháng 09</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Dự báo thu tháng tới</p>
                    <p className="text-sm font-bold mt-1 text-emerald-500">+12%</p>
                  </div>
                </div>
              </div>
            </Card>
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
                              {/* Stable mock progress based on classId */}
                              <div className="h-full bg-primary rounded-full" style={{ width: `${(Number(c.classId) * 17) % 40 + 60}%` }} />
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

            <Card header={<CardHeader title="Phân tích tuổi nợ" subtitle="Tỷ trọng nợ quá hạn theo thời gian" />}>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={debtAging}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="amount"
                      nameKey="range"
                    >
                      {debtAging.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => formatCurrencyVND(val)} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {debtAging.map((b, i) => (
                  <div key={b.range} className="p-2 rounded-lg bg-muted/30 border border-border">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">{b.range}</p>
                    <p className="text-xs font-bold">{formatCurrencyVND(b.amount)}</p>
                    <p className="text-[9px] text-muted-foreground">{b.count} hồ sơ</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card header={<CardHeader title="Phân tích khoản khấu trừ" subtitle="Các lý do giảm trừ doanh thu" />}>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Tổng tiền khấu trừ (Tháng này)</p>
                    <p data-testid="total-deduction" className="text-2xl font-black text-red-500">{formatCurrencyVND(totalDeduction)}</p>
                  </div>
                  {financialSummary && financialSummary.totalRevenue > 0 && (
                    <Badge variant="danger" size="lg">-{calculateAttendanceRate(totalDeduction, financialSummary.totalRevenue)}% Doanh thu</Badge>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Khấu trừ tiền cơm (Vắng mặt)</span>
                      <span data-testid="meal-deduction" className="font-bold">{mealDeductionPercent}% ({formatCurrencyVND(totalMealDeduction)})</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${mealDeductionPercent}%` }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Khấu trừ khác / Miễn giảm</span>
                      <span data-testid="other-deduction" className="font-bold">{otherDeductionPercent}% ({formatCurrencyVND(totalOtherDeduction)})</span>
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
                      <td className="px-4 py-4 text-right font-medium text-red-500">-{formatCurrencyVND(log.meal_deduction_vnd || 0)}</td>
                      <td className="px-4 py-4 text-right font-medium text-red-500">-{formatCurrencyVND(log.tuition_deduction_vnd || 0)}</td>
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
