/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle,
  XCircle,
  Wallet,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '../stores/authStore';
import { useAppStore } from '../stores/appStore';
import { StatCard } from '../components/common/Card';
import { getDashboardStats, getDashboardNotifications, getAttendanceTrend, getFeeStatusSummary, DashboardStats, DashboardNotification, AttendanceTrendPoint, FeeStatusSummary } from '@/services/dashboardService';
import { getSchoolSettings } from '@/services/settingsService';

// ─── Recharts wrappers (React 18 + recharts 2.x compat) ──────────────────────
const RXAxis = XAxis as any;
const RYAxis = YAxis as any;
const RTooltip = Tooltip as any;
const RBar = Bar as any;
const RLine = Line as any;
const RPie = Pie as any;
const RCell = Cell as any;
const RResponsiveContainer = ResponsiveContainer as any;
const RBarChart = BarChart as any;
const RLineChart = LineChart as any;
const RPieChart = PieChart as any;
const RCartesianGrid = CartesianGrid as any;

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  border: '#E2E8F0',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
};

// ─── Mock data ────────────────────────────────────────────────────────────────
// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-sm shadow-lg bg-white border border-[#E2E8F0]">
      {label && <p className="font-semibold mb-1 text-[#1E293B]">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
}

// ─── Format Vietnamese date ───────────────────────────────────────────────────
function formatVietnameseDate(date: Date): string {
  const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${days[date.getDay()]}, ${d}/${m}/${date.getFullYear()}`;
}

// ─── Dashboard page ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuthStore();
  const { setPageTitle } = useAppStore();
  const navigate = useNavigate();
  const [today] = useState(() => formatVietnameseDate(new Date()));
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [trendData, setTrendData] = useState<AttendanceTrendPoint[]>([]);
  const [feeSummary, setFeeSummary] = useState<FeeStatusSummary>({ paid: 0, unpaid: 0, partial: 0 });
  const [schoolYear, setSchoolYear] = useState('2024 – 2025');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageTitle('Dashboard');
    const load = async () => {
      setLoading(true);
      const [statsRes, notifyRes, trendRes, feeRes, settingsRes] = await Promise.all([
        getDashboardStats(),
        getDashboardNotifications(),
        getAttendanceTrend(),
        getFeeStatusSummary(),
        getSchoolSettings(),
      ]);
      setLoading(false);
      
      if (statsRes.stats) setStats(statsRes.stats);
      if (notifyRes.items) setNotifications(notifyRes.items);
      if (trendRes.trend) setTrendData(trendRes.trend);
      if (feeRes.summary) setFeeSummary(feeRes.summary);
      if (settingsRes.settings?.school_year) {
        setSchoolYear(settingsRes.settings.school_year.replace('-', ' – '));
      }
    };
    void load();
  }, [setPageTitle]);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Quản trị viên';


  
  // Chart data from real queries
  const feeStatus = [
    { name: 'Đã đóng', value: feeSummary.paid, color: COLORS.success },
    { name: 'Chưa đóng', value: feeSummary.unpaid, color: COLORS.error },
    { name: 'Đóng một phần', value: feeSummary.partial, color: COLORS.warning },
  ].filter(s => s.value > 0);

  return (
    <div className="space-y-6">
      {/* Welcome row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">
            Xin chào, <span className="text-primary">{displayName}</span>!
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">{today}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-primary/10 text-primary">
          <Users className="w-4 h-4" />
          Năm học {schoolYear}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Tổng học sinh"
          value={loading ? '...' : String(stats?.totalStudents || 0)}
          icon={<Users className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
          trend="Hồ sơ chính thức"
          trendDirection="up"
        />
        <StatCard
          label="Đang có mặt"
          value={loading ? '...' : String(stats?.attendanceToday.present || 0)}
          icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
          iconBg="bg-emerald-50"
          trend={`${stats?.attendanceToday.total || 0} học sinh điểm danh`}
          trendDirection="up"
        />
        <StatCard
          label="Vắng mặt"
          value={loading ? '...' : String(stats?.attendanceToday.absent || 0)}
          icon={<XCircle className="w-5 h-5 text-amber-500" />}
          iconBg="bg-amber-50"
          trend="Tính theo ngày hôm nay"
          trendDirection="down"
        />
        <StatCard
          label="Công nợ học phí"
          value={loading ? '...' : `${((stats?.totalDebt || 0) / 1000000).toFixed(1)}M`}
          icon={<Wallet className="w-5 h-5 text-red-500" />}
          iconBg="bg-red-50"
          trend={`${(stats?.totalDebt || 0).toLocaleString()} đ`}
          trendDirection="down"
        />
      </div>

      {/* Attendance table + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-base font-semibold text-[#1E293B]">Điểm danh hôm nay (Top 5 lớp)</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Cập nhật theo thời gian thực từ giáo viên
              </p>
            </div>
            <button className="flex items-center gap-1 text-xs font-medium text-primary">
              Xem chi tiết <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  {['Lớp học', 'Sĩ số', 'Có mặt', 'Vắng', 'Tỷ lệ'].map((h, i) => (
                    <th
                      key={h}
                      className={`py-3 font-medium text-xs uppercase tracking-wider text-[#64748B] ${i === 0 ? 'text-left px-6' : 'text-center px-4'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {(stats?.attendanceByClass || []).map((row) => {
                  const pct = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0;
                  const barColor = pct >= 90 ? COLORS.success : pct >= 75 ? COLORS.warning : COLORS.error;
                  return (
                    <tr key={row.classId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-[#1E293B]">{row.className}</td>
                      <td className="text-center px-4 py-3 text-[#64748B]">{row.total}</td>
                      <td className="text-center px-4 py-3">
                        <span className="inline-flex items-center justify-center w-8 h-6 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-600">
                          {row.present}
                        </span>
                      </td>
                      <td className="text-center px-4 py-3">
                        <span className="inline-flex items-center justify-center w-8 h-6 rounded-md text-xs font-semibold bg-amber-50 text-amber-600">
                          {row.absent}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                          </div>
                          <span className="text-xs font-semibold w-10 text-right" style={{ color: barColor }}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-base font-semibold text-[#1E293B]">Thông báo hệ thống</h2>
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs font-bold">
              {notifications.length}
            </span>
          </div>
          <div className="flex-1 divide-y divide-[#F1F5F9] overflow-auto">
            {notifications.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#94A3B8]">Không có thông báo mới</div>
            ) : (
              notifications.map((n) => {
                const dotColor = n.type === 'success' ? COLORS.success : n.type === 'warning' ? COLORS.warning : COLORS.secondary;
                return (
                  <div key={n.id} className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex gap-3">
                      <div className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug line-clamp-2 text-[#1E293B] font-medium">{n.title}</p>
                        <p className="text-xs mt-1 text-[#64748B] line-clamp-1">{n.content}</p>
                        <p className="text-[10px] mt-1 text-[#94A3B8] italic">{new Date(n.created_at).toLocaleString('vi-VN')}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="px-5 py-3 border-t border-[#E2E8F0]">
            <button onClick={() => navigate('/notifications')} className="w-full text-xs font-medium text-center py-1.5 rounded-lg hover:bg-gray-50 text-primary transition-colors">
              Xem tất cả thông báo
            </button>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div>
        <h2 className="text-lg font-semibold text-[#1E293B] mb-5">Thống kê &amp; Biểu đồ</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Bar chart */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
            <h3 className="text-sm font-semibold text-[#1E293B] mb-4">Học sinh theo khối lớp</h3>
            <RResponsiveContainer width="100%" height={220}>
              <RBarChart data={stats?.studentsByGrade || []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }} barSize={28}>
                <RCartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <RXAxis dataKey="gradeName" tick={{ fontSize: 11, fill: COLORS.textSecondary }} axisLine={false} tickLine={false} />
                <RYAxis tick={{ fontSize: 11, fill: COLORS.textSecondary }} axisLine={false} tickLine={false} />
                <RTooltip content={<ChartTooltip />} />
                <RBar dataKey="count" name="Học sinh" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
              </RBarChart>
            </RResponsiveContainer>
          </div>

          {/* Line chart */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
            <h3 className="text-sm font-semibold text-[#1E293B] mb-4">Xu hướng điểm danh (7 ngày)</h3>
            <RResponsiveContainer width="100%" height={220}>
              <RLineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <RCartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <RXAxis dataKey="day" tick={{ fontSize: 11, fill: COLORS.textSecondary }} axisLine={false} tickLine={false} />
                <RYAxis tick={{ fontSize: 11, fill: COLORS.textSecondary }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                <RTooltip content={<ChartTooltip />} />
                <RLine type="monotone" dataKey="rate" name="Tỷ lệ %" stroke={COLORS.secondary} strokeWidth={2.5} dot={{ fill: COLORS.secondary, r: 4, strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </RLineChart>
            </RResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
            <h3 className="text-sm font-semibold text-[#1E293B] mb-4">Tình trạng học phí</h3>
            <RResponsiveContainer width="100%" height={160}>
              <RPieChart>
                <RPie data={feeStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                  {feeStatus.map((entry, i) => <RCell key={i} fill={entry.color} />)}
                </RPie>
                <RTooltip content={<ChartTooltip />} />
              </RPieChart>
            </RResponsiveContainer>
            <div className="mt-2 space-y-2">
              {feeStatus.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-xs text-[#64748B]">{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-[#1E293B]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Trend icon for linting */}
      <span className="hidden"><TrendingUp /></span>
    </div>
  );
}
