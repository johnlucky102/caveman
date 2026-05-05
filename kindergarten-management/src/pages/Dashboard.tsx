/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
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
const attendanceData = [
  { class: 'Mầm A', total: 25, present: 23, absent: 2 },
  { class: 'Mầm B', total: 24, present: 22, absent: 2 },
  { class: 'Chồi A', total: 28, present: 26, absent: 2 },
  { class: 'Chồi B', total: 27, present: 24, absent: 3 },
  { class: 'Lá A',   total: 30, present: 28, absent: 2 },
  { class: 'Lá B',   total: 29, present: 25, absent: 4 },
  { class: 'Lá C',   total: 28, present: 26, absent: 2 },
  { class: 'Búp Sen', total: 27, present: 23, absent: 4 },
];

const recentNotifications = [
  { id: 1, title: 'Phụ huynh Nguyễn Thị Lan đã đóng học phí tháng 4', time: '5 phút trước', type: 'success' },
  { id: 2, title: 'Học sinh Trần Minh Khoa (Lớp Lá A) nghỉ ốm hôm nay', time: '18 phút trước', type: 'warning' },
  { id: 3, title: 'Nhắc nhở: Cuộc họp phụ huynh lớp Chồi B lúc 17:00 hôm nay', time: '1 giờ trước', type: 'info' },
  { id: 4, title: 'Giáo viên Phạm Thu Hương đã cập nhật sổ liên lạc lớp Mầm A', time: '2 giờ trước', type: 'success' },
  { id: 5, title: '8 học sinh đến muộn trong buổi sáng nay', time: '3 giờ trước', type: 'warning' },
];

const studentsByGrade = [
  { grade: 'Mầm',    students: 49 },
  { grade: 'Chồi',   students: 55 },
  { grade: 'Lá',     students: 87 },
  { grade: 'Búp Sen', students: 27 },
  { grade: 'Nhà trẻ', students: 110 },
];

const attendanceTrend = [
  { day: 'T2', rate: 92 },
  { day: 'T3', rate: 88 },
  { day: 'T4', rate: 95 },
  { day: 'T5', rate: 91 },
  { day: 'T6', rate: 87 },
  { day: 'T7', rate: 78 },
  { day: 'CN', rate: 0 },
];

const feeStatus = [
  { name: 'Đã đóng đủ',       value: 245, color: COLORS.success },
  { name: 'Đóng một phần',    value: 48,  color: COLORS.warning },
  { name: 'Chưa đóng',        value: 35,  color: COLORS.error },
];

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
  const [today] = useState(() => formatVietnameseDate(new Date()));

  useEffect(() => {
    setPageTitle('Dashboard');
  }, [setPageTitle]);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Quản trị viên';

  const totalStudents = attendanceData.reduce((s, r) => s + r.total, 0);
  const totalPresent  = attendanceData.reduce((s, r) => s + r.present, 0);

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
          Năm học 2024 – 2025
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Tổng học sinh"
          value="328"
          icon={<Users className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
          trend="+12 tháng này"
          trendDirection="up"
        />
        <StatCard
          label="Đang đi học"
          value="297"
          icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
          iconBg="bg-emerald-50"
          trend="90.5% tỷ lệ"
          trendDirection="up"
        />
        <StatCard
          label="Nghỉ học hôm nay"
          value="31"
          icon={<XCircle className="w-5 h-5 text-amber-500" />}
          iconBg="bg-amber-50"
          trend="9.5% vắng mặt"
          trendDirection="down"
        />
        <StatCard
          label="Công nợ học phí"
          value="42.5M"
          icon={<Wallet className="w-5 h-5 text-red-500" />}
          iconBg="bg-red-50"
          trend="15 hộ chưa đóng"
          trendDirection="down"
        />
      </div>

      {/* Attendance table + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-base font-semibold text-[#1E293B]">Điểm danh hôm nay</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                {totalPresent}/{totalStudents} học sinh có mặt ({((totalPresent / totalStudents) * 100).toFixed(1)}%)
              </p>
            </div>
            <button className="flex items-center gap-1 text-xs font-medium text-primary">
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
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
                {attendanceData.map((row) => {
                  const pct = Math.round((row.present / row.total) * 100);
                  const barColor = pct >= 90 ? COLORS.success : pct >= 75 ? COLORS.warning : COLORS.error;
                  return (
                    <tr key={row.class} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-[#1E293B]">{row.class}</td>
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
            <h2 className="text-base font-semibold text-[#1E293B]">Thông báo gần đây</h2>
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs font-bold">
              {recentNotifications.length}
            </span>
          </div>
          <div className="flex-1 divide-y divide-[#F1F5F9] overflow-auto">
            {recentNotifications.map((n) => {
              const dotColor = n.type === 'success' ? COLORS.success : n.type === 'warning' ? COLORS.warning : COLORS.secondary;
              return (
                <div key={n.id} className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex gap-3">
                    <div className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug line-clamp-2 text-[#1E293B]">{n.title}</p>
                      <p className="text-xs mt-1 text-[#64748B]">{n.time}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-[#E2E8F0]">
            <button className="w-full text-xs font-medium text-center py-1.5 rounded-lg hover:bg-gray-50 text-primary transition-colors">
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
              <RBarChart data={studentsByGrade} margin={{ top: 5, right: 5, left: -20, bottom: 5 }} barSize={28}>
                <RCartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <RXAxis dataKey="grade" tick={{ fontSize: 11, fill: COLORS.textSecondary }} axisLine={false} tickLine={false} />
                <RYAxis tick={{ fontSize: 11, fill: COLORS.textSecondary }} axisLine={false} tickLine={false} />
                <RTooltip content={<ChartTooltip />} />
                <RBar dataKey="students" name="Học sinh" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
              </RBarChart>
            </RResponsiveContainer>
          </div>

          {/* Line chart */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
            <h3 className="text-sm font-semibold text-[#1E293B] mb-4">Xu hướng điểm danh (7 ngày)</h3>
            <RResponsiveContainer width="100%" height={220}>
              <RLineChart data={attendanceTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
