import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Download, FileText, TrendingUp, Users, Wallet, Calendar, Filter,
} from 'lucide-react';
import Card, { CardHeader, StatCard } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import { useToast } from '../components/common/Toast';
import { getDashboardStats, DashboardStats } from '@/services/dashboardService';
import { supabase } from '@/lib/supabase';
import { exportToCsv } from '@/utils/exportCsv';
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
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [classFilter, setClassFilter] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [attendanceReports, setAttendanceReports] = useState<AttendanceReport[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [classes, setClasses] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN').format(amount) + ' đ';

  // Load classes for filter
  useEffect(() => {
    supabase.from('classes').select('id, name').order('name').then(({ data }) => {
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
  }, [activeTab]);

  // Load student reports
  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('students')
        .select('id, full_name, gender, class_id, classes(name)');

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
      let query = supabase.from('attendance').select('attendance_date, status');

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

  // Load financial summary
  useEffect(() => {
    if (activeTab === 'financial') {
      setLoading(true);
      supabase.from('fee_records').select('status, paid_amount_vnd, due_date').then(({ data, error }) => {
        setLoading(false);
        if (error) { toast.error('Lỗi', error.message); return; }
        const records = data || [];
        const today = new Date().toISOString().split('T')[0];
        const totalRevenue = records.reduce((s, r: any) => s + (r.paid_amount_vnd || 0), 0);
        const paidCount = records.filter((r: any) => r.status === 'paid').length;
        const pendingCount = records.filter((r: any) => r.status === 'unpaid' || r.status === 'partial').length;
        const overdueCount = records.filter((r: any) => r.status !== 'paid' && r.due_date && r.due_date < today).length;
        setFinancialSummary({ totalRevenue, paidCount, pendingCount, overdueCount });
      });
    }
  }, [activeTab, toast]);

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
    { id: 'financial', label: 'Tài chính' },
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
                <Button size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={exportStudents} disabled={studentReports.length === 0}>
                  Xuất Excel
                </Button>
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
              <Input label="Từ ngày" type="date" value={dateRange.from}
                onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))} />
              <Input label="Đến ngày" type="date" value={dateRange.to}
                onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))} />
              <Button variant="outline" size="sm" leftIcon={<Calendar className="w-4 h-4" />} onClick={loadAttendance}>
                Lọc
              </Button>
              <Button size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={exportAttendance} disabled={attendanceReports.length === 0}>
                Xuất báo cáo
              </Button>
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
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Tổng đã thu" value={loading ? '...' : formatCurrency(financialSummary?.totalRevenue || 0)}
              icon={<Wallet className="w-5 h-5 text-emerald-500" />} iconBg="bg-emerald-500/10" />
            <StatCard label="Đã thanh toán" value={loading ? '...' : `${financialSummary?.paidCount || 0} phiếu`}
              icon={<BarChart3 className="w-5 h-5 text-secondary" />} iconBg="bg-secondary/10" />
            <StatCard label="Chờ thanh toán" value={loading ? '...' : `${financialSummary?.pendingCount || 0} phiếu`}
              icon={<Wallet className="w-5 h-5 text-amber-500" />} iconBg="bg-amber-500/10" />
            <StatCard label="Quá hạn" value={loading ? '...' : `${financialSummary?.overdueCount || 0} phiếu`}
              icon={<Wallet className="w-5 h-5 text-red-500" />} iconBg="bg-red-500/10" />
          </div>

          <Card header={<CardHeader title="Tình trạng học phí" subtitle="Dữ liệu thực từ hệ thống" />}>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-muted-foreground">Đã thanh toán ({financialSummary?.paidCount || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm text-muted-foreground">Chờ thanh toán ({financialSummary?.pendingCount || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-muted-foreground">Quá hạn ({financialSummary?.overdueCount || 0})</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
