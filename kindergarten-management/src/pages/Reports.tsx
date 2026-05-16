import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3,
  Download,
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
  getFinancialOverview,
  getFeeSummaryByClass,
  DashboardStats,
  FeeSummaryByClass
} from '@/services/dashboardService';
import { getRevenueTrend, getStudentDistribution, getDebtAging, getOverdueStudents, RevenueTrendPoint, AgingBucket } from '@/services/analyticsService';
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

type ReportTab = 'overview' | 'students' | 'financial';

interface StudentReport {
  id: string; name: string; class: string; gender: string;
  attendance_rate: number; fee_status: string;
}

interface FinancialSummary {
  totalRevenue: number; paidCount: number; pendingCount: number; overdueCount: number;
}

interface DeductionLog {
  id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  title: string;
  attendance_deduction_vnd: number;
  deduction_note: string;
  created_at: string;
}

// ─── Columns ───────────────────────────────────────────────────────

const studentColumns: TableColumn<StudentReport>[] = [
  { key: 'name', label: 'Học sinh', sortable: true },
  { key: 'class', label: 'Lớp', sortable: true },
  { key: 'gender', label: 'Giới tính' },
  { key: 'attendance_rate', label: 'Điểm danh', render: (val) => `${val}%` },
  { key: 'fee_status', label: 'Trạng thái phí', render: (val) => String(val) },
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
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [deductionLogs, setDeductionLogs] = useState<any[]>([]);
  const [deductionPage, setDeductionPage] = useState(1);
  const [deductionItemsPerPage] = useState(10);
  const [classes, setClasses] = useState<{ value: string; label: string }[]>([]);

  // Financial filters
  const [filterMonth, setFilterMonth] = useState<number | null>(new Date().getMonth() + 1);
  const [financialOverview, setFinancialOverview] = useState<{
    teacherCount: number;
    activeClassCount: number;
    totalStudentCount: number;
  } | null>(null);
  
  // Analytics data
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([]);
  const [studentDistribution, setStudentDistribution] = useState<{
    gender: { name: string; value: number }[];
    grade: { name: string; value: number }[];
  }>({ gender: [], grade: [] });
  const [debtAging, setDebtAging] = useState<AgingBucket[]>([]);
  const [feeSummaryByClass, setFeeSummaryByClass] = useState<FeeSummaryByClass[]>([]);
  const [overdueStudents, setOverdueStudents] = useState<any[]>([]);
  const [overduePage, setOverduePage] = useState(1);
  const [overdueItemsPerPage] = useState(10);

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

  // Calculate current school year (VN school year starts in August)
  const currentSchoolYear = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  }, []);

  // Load overview stats
  useEffect(() => {
    if (activeTab === 'overview') {
      setLoading(true);
      Promise.all([
        getDashboardStats(),
        getStudentDistribution()
      ]).then(([resStats, resDist]) => {
        setLoading(false);
        if (resStats.stats) setStats(resStats.stats);
        if (resDist) setStudentDistribution({ gender: resDist.gender, grade: resDist.grade });
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

  // Paginated deduction logs
  const paginatedDeductionLogs = deductionLogs.slice(
    (deductionPage - 1) * deductionItemsPerPage,
    deductionPage * deductionItemsPerPage
  );
  const totalPages = Math.ceil(deductionLogs.length / deductionItemsPerPage);

  // Reset page when deductionLogs changes
  useEffect(() => {
    setDeductionPage(1);
  }, [deductionLogs]);

  // Paginated overdue students
  const paginatedOverdueStudents = overdueStudents.slice(
    (overduePage - 1) * overdueItemsPerPage,
    overduePage * overdueItemsPerPage
  );
  const totalOverduePages = Math.ceil(overdueStudents.length / overdueItemsPerPage);

  // Reset page when overdueStudents changes
  useEffect(() => {
    setOverduePage(1);
  }, [overdueStudents]);

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
{ data: [], error: null } as any
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
{ data: [], error: null } as any
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

  // Load financial details (deductions)
  const loadFinancialDetails = useCallback(async () => {
    setLoading(true);
    try {
      const summaryRes = await getFinancialSummary(filterMonth, currentSchoolYear);
      if (summaryRes.error || !summaryRes.data) {
        setFinancialSummary(null);
        setDeductionLogs([]);
        if (summaryRes.error?.code === 'FORBIDDEN') {
          toast.error('Truy cập bị chặn', summaryRes.error.message);
        }
        return;
      }

      setFinancialSummary(summaryRes.data);

      const overviewRes = await getFinancialOverview();
      if (overviewRes.data) {
        setFinancialOverview(overviewRes.data);
      }

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
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không tải được báo cáo tài chính');
    } finally {
      setLoading(false);
    }
  }, [toast, filterMonth, currentSchoolYear]);

  useEffect(() => {
    if (activeTab === 'financial') {
      void loadFinancialDetails();
      getRevenueTrend().then(res => {
        if (res.data) setRevenueTrend(res.data);
      });
      getDebtAging().then(res => {
        if (res.data) setDebtAging(res.data);
      });
      getFeeSummaryByClass(filterMonth, currentSchoolYear).then(res => {
        if (res.data) setFeeSummaryByClass(res.data);
      });
      getOverdueStudents(filterMonth, currentSchoolYear).then(res => {
        if (res.data) setOverdueStudents(res.data);
      });
    }
  }, [activeTab, loadFinancialDetails, filterMonth, currentSchoolYear]);

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
        attendance_deduction: log.attendance_deduction_vnd || 0,
        note: log.deduction_note || ''
      })),
      [
        { key: 'student_name', label: 'Học sinh' },
        { key: 'class_name', label: 'Lớp' },
        { key: 'title', label: 'Khoản thu' },
        { key: 'attendance_deduction', label: 'Khấu trừ điểm danh', render: (val) => String(val) },
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

  const exportFullReport = () => {
    // Combine overview stats into a CSV
    const overviewData = [
      { metric: 'Tổng số học sinh', value: stats?.totalStudents || 0 },
      { metric: 'Tổng công nợ', value: formatCurrencyVND(stats?.totalDebt || 0) },
      { metric: 'Doanh thu thực tế', value: formatCurrencyVND(financialSummary?.totalRevenue || 0) },
      { metric: 'Tỷ lệ hiện diện trung bình', value: `${stats?.attendanceToday.total ? calculateAttendanceRate(stats.attendanceToday.present, stats.attendanceToday.total) : 0}%` },
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
              columns={studentColumns}
              data={studentReports}
              rowKey="id" loading={loading} emptyMessage="Không có dữ liệu học sinh"
            />
          </Card>
        </div>
      )}

      {/* ─── Financial Tab ──────────────────────────────────────────── */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-wrap gap-3 items-center bg-muted/30 rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Bộ lọc:</span>
            </div>
            <Select
              value={filterMonth ? String(filterMonth) : ''}
              onChange={(val) => setFilterMonth(val ? parseInt(val) : null)}
              options={[
                { value: '', label: 'Tất cả tháng' },
                ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tháng ${i + 1}` })),
              ]}
              placeholder="Tháng"
              className="w-full sm:w-40"
            />
          </div>

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

          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Tổng giáo viên" value={loading ? '...' : `${financialOverview?.teacherCount || 0}`}
              icon={<Users className="w-5 h-5 text-blue-500" />} iconBg="bg-blue-500/10" />
            <StatCard label="Lớp hoạt động" value={loading ? '...' : `${financialOverview?.activeClassCount || 0}`}
              icon={<Calendar className="w-5 h-5 text-purple-500" />} iconBg="bg-purple-500/10" />
            <StatCard label="Tổng học sinh" value={loading ? '...' : `${financialOverview?.totalStudentCount || 0}`}
              icon={<Users className="w-5 h-5 text-orange-500" />} iconBg="bg-orange-500/10" />
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
                    {revenueTrend.length >= 2 ? (() => {
                      const current = revenueTrend[revenueTrend.length - 1].revenue;
                      const previous = revenueTrend[revenueTrend.length - 2].revenue;
                      const growth = previous > 0 ? ((current - previous) / previous * 100).toFixed(1) : '0';
                      const isGrowth = parseFloat(growth) >= 0;
                      return `Doanh thu tháng này: ${formatCurrencyVND(current)} (${isGrowth ? '+' : ''}${growth}% so tháng trước). Đang có ${overdueStudents.length} học sinh nợ quá hạn cần xử lý.`;
                    })() : 'Đang tải dữ liệu...'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Tháng cao điểm</p>
                    <p className="text-sm font-bold mt-1">
                      {revenueTrend.length > 0 ? (() => {
                        const maxRev = Math.max(...revenueTrend.map(t => t.revenue));
                        const peakMonth = revenueTrend.find(t => t.revenue === maxRev);
                        return peakMonth ? peakMonth.month : 'N/A';
                      })() : 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Dự báo thu tháng tới</p>
                    <p className="text-sm font-bold mt-1 text-emerald-500">
                      {revenueTrend.length >= 3 ? (() => {
                        const last3 = revenueTrend.slice(-3);
                        const avgGrowth = last3.reduce((sum, t, i) => {
                          if (i === 0) return 0;
                          const prev = last3[i - 1].revenue;
                          return sum + (prev > 0 ? (t.revenue - prev) / prev * 100 : 0);
                        }, 0) / 2;
                        return avgGrowth > 0 ? `+${avgGrowth.toFixed(0)}%` : `${avgGrowth.toFixed(0)}%`;
                      })() : 'N/A'}
                    </p>
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
                    exportToCsv(feeSummaryByClass.map(c => ({
                      className: c.className,
                      studentCount: c.studentCount,
                      paidAmount: c.paidAmount,
                      totalAmount: c.totalAmount,
                      progress: c.totalAmount > 0 ? Math.round((c.paidAmount / c.totalAmount) * 100) : 0
                    })), [
                      { key: 'className', label: 'Lớp' },
                      { key: 'studentCount', label: 'Sĩ số' },
                      { key: 'paidAmount', label: 'Đã thu', render: (val) => String(val) },
                      { key: 'totalAmount', label: 'Tổng', render: (val) => String(val) },
                      { key: 'progress', label: 'Tiến độ (%)', render: (val) => String(val) },
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
                      <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">GVCN</th>
                      <th className="px-4 py-3 text-center font-bold text-xs uppercase tracking-wider">Sĩ số</th>
                      <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider">Đã thu</th>
                      <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider">Tổng HP</th>
                      <th className="px-4 py-3 text-center font-bold text-xs uppercase tracking-wider">Tiến độ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {feeSummaryByClass.map((c) => {
                      const progress = c.totalAmount > 0 ? Math.round((c.paidAmount / c.totalAmount) * 100) : 0;
                      return (
                        <tr key={c.classId} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-foreground">{c.className}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{c.teacherName || '—'}</td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{c.studentCount}</td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-600">
                            {formatCurrencyVND(c.paidAmount)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {formatCurrencyVND(c.totalAmount)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                              </div>
                              <span className="text-xs font-medium text-muted-foreground w-10 text-right">{progress}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {feeSummaryByClass.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                          Chưa có dữ liệu thu phí.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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

            <Card
              header={<CardHeader title="Học sinh nợ quá hạn" subtitle={`Tổng ${overdueStudents.length} học sinh`} />}
              noPadding
            >
              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">Học sinh</th>
                      <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">Lớp</th>
                      <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">GVCN</th>
                      <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider">Nợ (đ)</th>
                      <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider">Quá hạn (ngày)</th>
                      <th className="px-4 py-3 text-center font-bold text-xs uppercase tracking-wider">Mức độ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedOverdueStudents.map((s, i) => {
                      const badgeVariant = s.daysOverdue > 60 ? 'danger' : s.daysOverdue > 30 ? 'warning' : 'secondary';
                      const badgeText = s.daysOverdue > 60 ? 'Cao' : s.daysOverdue > 30 ? 'Trung bình' : 'Thấp';
                      return (
                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-semibold text-foreground">{s.studentName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.className}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{s.teacherName || '—'}</td>
                          <td className="px-4 py-3 text-right font-medium text-red-500">{formatCurrencyVND(s.amountOwed)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{s.daysOverdue}</td>
                          <td className="px-4 py-3 text-center"><Badge variant={badgeVariant} size="sm">{badgeText}</Badge></td>
                        </tr>
                      );
                    })}
                    {overdueStudents.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                          Không có học sinh nợ quá hạn.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="lg:hidden p-4 space-y-3">
                {paginatedOverdueStudents.map((s, i) => {
                  const badgeVariant = s.daysOverdue > 60 ? 'danger' : s.daysOverdue > 30 ? 'warning' : 'secondary';
                  const badgeText = s.daysOverdue > 60 ? 'Cao' : s.daysOverdue > 30 ? 'Trung bình' : 'Thấp';
                  return (
                    <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-foreground">{s.studentName}</p>
                          <p className="text-xs text-muted-foreground">{s.className}</p>
                        </div>
                        <Badge variant={badgeVariant} size="sm">{badgeText}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Nợ</p>
                          <p className="font-medium text-red-500">{formatCurrencyVND(s.amountOwed)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Quá hạn</p>
                          <p className="font-medium text-foreground">{s.daysOverdue} ngày</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {overdueStudents.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    Không có học sinh nợ quá hạn.
                  </div>
                )}
              </div>

              {/* Pagination controls */}
              {overdueStudents.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">
                    Hiển thị {(overduePage - 1) * overdueItemsPerPage + 1} đến {Math.min(overduePage * overdueItemsPerPage, overdueStudents.length)} của {overdueStudents.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOverduePage(p => Math.max(1, p - 1))}
                      disabled={overduePage === 1}
                    >
                      Trước
                    </Button>
                    <span className="text-sm font-medium">
                      Trang {overduePage} / {totalOverduePages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOverduePage(p => Math.min(totalOverduePages, p + 1))}
                      disabled={overduePage === totalOverduePages}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
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

            <Card
              header={
                <CardHeader title="Sổ nhật ký khấu trừ chi tiết" subtitle="Dành cho kiểm toán nội bộ" />
              }
              noPadding
            >
              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-6 py-3 text-left font-bold text-xs uppercase tracking-wider">Học sinh</th>
                      <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">Khoản thu</th>
                      <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider">Khấu trừ điểm danh</th>
                      <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider">Khác</th>
                      <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedDeductionLogs.map((log, i) => (
                      <tr key={log.id || i} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-foreground">{log.students?.full_name || 'N/A'}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{log.students?.classes?.name || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">{log.title || 'Học phí'}</td>
                        <td className="px-4 py-4 text-right font-medium text-red-500">-{formatCurrencyVND(log.attendance_deduction_vnd || 0)}</td>
                        <td className="px-4 py-4 text-right font-medium text-red-500">-</td>
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

              {/* Mobile cards */}
              <div className="lg:hidden p-4 space-y-3">
                {paginatedDeductionLogs.map((log, i) => (
                  <div key={log.id || i} className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{log.students?.full_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground uppercase">{log.students?.classes?.name || 'N/A'}</p>
                      </div>
                      <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">
                        -{formatCurrencyVND(log.attendance_deduction_vnd || 0)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Khoản thu</p>
                        <p className="font-medium text-foreground">{log.title || 'Học phí'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Khác</p>
                        <p className="font-medium text-red-500">—</p>
                      </div>
                    </div>
                    {log.deduction_note && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">Ghi chú</p>
                        <p className="text-xs italic text-muted-foreground">{log.deduction_note}</p>
                      </div>
                    )}
                  </div>
                ))}
                {deductionLogs.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    Chưa có dữ liệu khấu trừ trong kỳ này.
                  </div>
                )}
              </div>

              {/* Pagination controls */}
              {deductionLogs.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">
                    Hiển thị {(deductionPage - 1) * deductionItemsPerPage + 1} đến {Math.min(deductionPage * deductionItemsPerPage, deductionLogs.length)} của {deductionLogs.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeductionPage(p => Math.max(1, p - 1))}
                      disabled={deductionPage === 1}
                    >
                      Trước
                    </Button>
                    <span className="text-sm font-medium">
                      Trang {deductionPage} / {totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeductionPage(p => Math.min(totalPages, p + 1))}
                      disabled={deductionPage === totalPages}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </Card>
        </div>
      </div>
      )}
    </div>
  );
}
