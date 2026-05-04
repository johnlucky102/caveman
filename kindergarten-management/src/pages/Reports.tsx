import { useState } from 'react';
import {
  BarChart3,
  Download,
  FileText,
  TrendingUp,
  Users,
  Wallet,
  Calendar,
  Filter,
  ChevronDown,
} from 'lucide-react';
import Card, { CardHeader, StatCard } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Table from '../components/common/Table';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import type { TableColumn } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

type ReportTab = 'overview' | 'students' | 'attendance' | 'financial';

interface StudentReport {
  id: string;
  name: string;
  class: string;
  gender: string;
  age: number;
  status: string;
  attendance_rate: number;
  fee_status: string;
}

interface AttendanceReport {
  id: string;
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const overviewStats = {
  totalStudents: 156,
  totalTeachers: 18,
  totalClasses: 12,
  totalRevenue: 485000000,
  attendanceRate: 94.2,
  newStudentsThisMonth: 8,
};

const studentReports: StudentReport[] = [
  { id: '1', name: 'Nguyễn Minh Khoa', class: 'Chồi A', gender: 'Nam', age: 5, status: 'active', attendance_rate: 96, fee_status: 'paid' },
  { id: '2', name: 'Trần Thị Bình', class: 'Chồi B', gender: 'Nữ', age: 5, status: 'active', attendance_rate: 92, fee_status: 'pending' },
  { id: '3', name: 'Lê Văn An', class: ' Lá B', gender: 'Nam', age: 6, status: 'active', attendance_rate: 88, fee_status: 'overdue' },
  { id: '4', name: 'Phạm Thị Mai', class: 'Chồi A', gender: 'Nữ', age: 5, status: 'active', attendance_rate: 100, fee_status: 'paid' },
  { id: '5', name: 'Hoàng Văn Phong', class: 'Stem A', gender: 'Nam', age: 6, status: 'active', attendance_rate: 94, fee_status: 'paid' },
];

const attendanceReports: AttendanceReport[] = [
  { id: '1', date: '2024-04-15', total: 156, present: 148, absent: 4, late: 2, excused: 2 },
  { id: '2', date: '2024-04-16', total: 156, present: 152, absent: 2, late: 1, excused: 1 },
  { id: '3', date: '2024-04-17', total: 156, present: 150, absent: 3, late: 2, excused: 1 },
  { id: '4', date: '2024-04-18', total: 156, present: 144, absent: 6, late: 3, excused: 3 },
  { id: '5', date: '2024-04-19', total: 156, present: 147, absent: 5, late: 2, excused: 2 },
];

const financialSummary: FinancialSummary = {
  totalRevenue: 485000000,
  totalExpenses: 212000000,
  netIncome: 273000000,
  paidCount: 142,
  pendingCount: 10,
  overdueCount: 4,
};

const recentReports = [
  { name: 'Báo cáo điểm danh tháng 4/2024', date: '19/04/2024', type: 'attendance' },
  { name: 'Báo cáo học phí quý I/2024', date: '01/04/2024', type: 'fees' },
  { name: 'Tổng quan học sinh năm học 2023-2024', date: '15/03/2024', type: 'overview' },
];

// ─── Columns ───────────────────────────────────────────────────────────────

const studentColumns: TableColumn<StudentReport>[] = [
  { key: 'name', label: 'Họ tên', sortable: true },
  { key: 'class', label: 'Lớp', sortable: true },
  { key: 'gender', label: 'Giới tính' },
  { key: 'age', label: 'Tuổi', sortable: true },
  {
    key: 'attendance_rate',
    label: 'Điểm danh',
    render: (val) => (
      <span className={Number(val) >= 95 ? 'text-emerald-600' : Number(val) >= 85 ? 'text-amber-600' : 'text-red-500'}>
        {String(val)}%
      </span>
    ),
  },
  {
    key: 'fee_status',
    label: 'Học phí',
    render: (val) => {
      const cfg: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
        paid: { label: 'Đã thanh toán', variant: 'success' },
        pending: { label: 'Chờ thanh toán', variant: 'warning' },
        overdue: { label: 'Quá hạn', variant: 'danger' },
      };
      const c = cfg[String(val)] || cfg.pending;
      return <Badge variant={c.variant} size="sm">{c.label}</Badge>;
    },
  },
];

const attendanceColumns: TableColumn<AttendanceReport>[] = [
  { key: 'date', label: 'Ngày', sortable: true, render: (val) => new Date(String(val)).toLocaleDateString('vi-VN') },
  { key: 'total', label: 'Tổng sĩ số' },
  { key: 'present', label: 'Có mặt', render: (val) => <span className="text-emerald-600">{String(val)}</span> },
  { key: 'absent', label: 'Vắng mặt', render: (val) => <span className="text-red-500">{String(val)}</span> },
  { key: 'late', label: 'Đi muộn', render: (val) => <span className="text-amber-600">{String(val)}</span> },
  { key: 'excused', label: 'Có phép', render: (val) => <span className="text-blue-600">{String(val)}</span> },
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount).replace('₫', '').trim() + ' đ';

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'students', label: 'Học sinh' },
    { id: 'attendance', label: 'Điểm danh' },
    { id: 'financial', label: 'Tài chính' },
  ];

  const classOptions = [
    { value: '', label: 'Tất cả lớp' },
    { value: 'choi-a', label: 'Chồi A' },
    { value: 'choi-b', label: 'Chồi B' },
    { value: 'la-a', label: 'Lá A' },
    { value: 'la-b', label: 'Lá B' },
    { value: 'stem-a', label: 'Stem A' },
  ];

  const statusOptions = [
    { value: '', label: 'Tất cả' },
    { value: 'active', label: 'Đang học' },
    { value: 'inactive', label: 'Nghỉ' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#1E293B]">Báo cáo</h1>
        <p className="text-sm text-[#64748B]">Tạo và xem các báo cáo thống kê</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#E2E8F0] overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Tổng học sinh"
              value={overviewStats.totalStudents}
              icon={<Users className="w-5 h-5 text-primary" />}
              iconBg="bg-primary/10"
              trend="+8 tháng này"
              trendDirection="up"
            />
            <StatCard
              label="Tổng giáo viên"
              value={overviewStats.totalTeachers}
              icon={<Users className="w-5 h-5 text-secondary" />}
              iconBg="bg-secondary/10"
            />
            <StatCard
              label="Tổng lớp"
              value={overviewStats.totalClasses}
              icon={<Calendar className="w-5 h-5 text-amber-500" />}
              iconBg="bg-amber-50"
            />
            <StatCard
              label="Tỷ lệ điểm danh"
              value={`${overviewStats.attendanceRate}%`}
              icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
              iconBg="bg-emerald-50"
              trend="+2.1%"
              trendDirection="up"
            />
          </div>

          {/* Revenue */}
          <Card
            header={
              <CardHeader
                title="Tổng quan tài chính năm học 2023-2024"
                subtitle="Thống kê thu chi"
              />
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 rounded-xl">
                <p className="text-xs font-medium text-emerald-600 mb-1">Tổng thu</p>
                <p className="text-xl font-bold text-emerald-700">{formatCurrency(overviewStats.totalRevenue)}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl">
                <p className="text-xs font-medium text-red-600 mb-1">Tổng chi</p>
                <p className="text-xl font-bold text-red-700">{formatCurrency(overviewStats.totalRevenue * 0.44)}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-xs font-medium text-blue-600 mb-1">Thu ròng</p>
                <p className="text-xl font-bold text-blue-700">{formatCurrency(overviewStats.totalRevenue * 0.56)}</p>
              </div>
            </div>
          </Card>

          {/* Recent Reports */}
          <Card
            header={
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#1E293B]">Báo cáo gần đây</h3>
                <Button size="xs" variant="ghost" leftIcon={<Download className="w-3 h-3" />}>
                  Xem tất cả
                </Button>
              </div>
            }
            noPadding
          >
            <div className="divide-y divide-[#F1F5F9]">
              {recentReports.map((r) => (
                <div
                  key={r.name}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center">
                      <FileText className="w-4 h-4 text-[#64748B]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">{r.name}</p>
                      <p className="text-xs text-[#64748B]">{r.date}</p>
                    </div>
                  </div>
                  <Button size="xs" variant="ghost" leftIcon={<Download className="w-3 h-3" />}>
                    Tải
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="space-y-5">
          {/* Filters */}
          <Card>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select
                label="Lớp"
                options={classOptions}
                value={classFilter}
                onChange={setClassFilter}
              />
              <Select
                label="Trạng thái"
                options={statusOptions}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <div className="flex items-end gap-2">
                <Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />}>
                  Lọc
                </Button>
                <Button variant="ghost" size="sm">
                  Đặt lại
                </Button>
              </div>
            </div>
          </Card>

          {/* Report Table */}
          <Card
            header={
              <div className="flex items-center justify-between gap-3">
                <CardHeader title="Báo cáo học sinh" subtitle={`${studentReports.length} học sinh`} />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" leftIcon={<FileText className="w-4 h-4" />}>
                    Xem báo cáo
                  </Button>
                  <Button size="sm" leftIcon={<Download className="w-4 h-4" />}>
                    Xuất Excel
                  </Button>
                </div>
              </div>
            }
            noPadding
          >
            <Table columns={studentColumns as unknown as import('../types').TableColumn<Record<string, unknown>>[]} data={studentReports as unknown as Record<string, unknown>[]} rowKey="id" />
          </Card>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-5">
          {/* Date Range Filter */}
          <Card>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <Input
                label="Từ ngày"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
              />
              <Input
                label="Đến ngày"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
              />
              <Button variant="outline" size="sm" leftIcon={<Calendar className="w-4 h-4" />}>
                Chọn khoảng
              </Button>
              <Button size="sm" leftIcon={<Download className="w-4 h-4" />}>
                Xuất báo cáo
              </Button>
            </div>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Tổng sĩ số"
              value={attendanceReports[0]?.total || 0}
              icon={<Users className="w-5 h-5 text-secondary" />}
              iconBg="bg-secondary/10"
            />
            <StatCard
              label="Trung bình có mặt"
              value={`${Math.round((attendanceReports.reduce((s, a) => s + a.present, 0) / attendanceReports.length / (attendanceReports[0]?.total || 1)) * 100)}%`}
              icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
              iconBg="bg-emerald-50"
              trend="+1.2%"
              trendDirection="up"
            />
            <StatCard
              label="Tổng vắng mặt"
              value={attendanceReports.reduce((s, a) => s + a.absent, 0)}
              icon={<Users className="w-5 h-5 text-red-400" />}
              iconBg="bg-red-50"
              trend="3 ngày gần nhất"
              trendDirection="neutral"
            />
            <StatCard
              label="Tổng đi muộn"
              value={attendanceReports.reduce((s, a) => s + a.late, 0)}
              icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
              iconBg="bg-amber-50"
            />
          </div>

          {/* Attendance Table */}
          <Card
            header={
              <CardHeader title="Chi tiết điểm danh" subtitle="5 ngày gần nhất" />
            }
            noPadding
          >
            <Table columns={attendanceColumns as unknown as import('../types').TableColumn<Record<string, unknown>>[]} data={attendanceReports as unknown as Record<string, unknown>[]} rowKey="id" />
          </Card>
        </div>
      )}

      {activeTab === 'financial' && (
        <div className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Tổng thu"
              value={formatCurrency(financialSummary.totalRevenue)}
              icon={<Wallet className="w-5 h-5 text-emerald-500" />}
              iconBg="bg-emerald-50"
              trend="+12%"
              trendDirection="up"
            />
            <StatCard
              label="Tổng chi"
              value={formatCurrency(financialSummary.totalExpenses)}
              icon={<Wallet className="w-5 h-5 text-red-400" />}
              iconBg="bg-red-50"
              trend="+5%"
              trendDirection="neutral"
            />
            <StatCard
              label="Thu ròng"
              value={formatCurrency(financialSummary.netIncome)}
              icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
              iconBg="bg-blue-50"
              trend="+18%"
              trendDirection="up"
            />
            <StatCard
              label="Đã thanh toán"
              value={`${financialSummary.paidCount}/156`}
              icon={<BarChart3 className="w-5 h-5 text-secondary" />}
              iconBg="bg-secondary/10"
              trend="91%"
              trendDirection="up"
            />
          </div>

          {/* Fee Status Breakdown */}
          <Card header={<CardHeader title="Tình trạng học phí" subtitle="Tháng 4/2024" />}>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-[#64748B]">Đã thanh toán ({financialSummary.paidCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm text-[#64748B]">Chờ thanh toán ({financialSummary.pendingCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-[#64748B]">Quá hạn ({financialSummary.overdueCount})</span>
              </div>
            </div>
          </Card>

          {/* Export */}
          <Card
            header={
              <div className="flex items-center justify-between gap-3">
                <CardHeader title="Xuất báo cáo tài chính" />
                <Button size="sm" leftIcon={<Download className="w-4 h-4" />}>
                  Tải toàn bộ
                </Button>
              </div>
            }
          >
            <div className="space-y-3">
              {[
                { label: 'Báo cáo thu chi tháng', file: 'financial_monthly_04_2024.xlsx' },
                { label: 'Báo cáo học phí theo lớp', file: 'financial_by_class_2024.xlsx' },
                { label: 'Danh sách công nợ', file: 'accounts_receivable_2024.xlsx' },
              ].map((item) => (
                <div
                  key={item.file}
                  className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#94A3B8]" />
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">{item.label}</p>
                      <p className="text-xs text-[#94A3B8]">{item.file}</p>
                    </div>
                  </div>
                  <Button size="xs" variant="ghost" leftIcon={<Download className="w-3 h-3" />}>
                    Tải
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
