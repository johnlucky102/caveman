/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle,
  XCircle,
  Wallet,
  TrendingUp,
  ChevronRight,
  HeartPulse,
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
import { getDashboardStats, getAttendanceTrend, getFeeStatusSummary, getTeacherWidgets, AttendanceTrendPoint, FeeStatusSummary, TeacherWidgetsData } from '@/services/dashboardService';
import { getSchoolSettings } from '@/services/settingsService';
import { useServiceCache } from '@/hooks/useServiceCache';
import { isTeacher } from '@/lib/rbac';

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

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-sm shadow-lg bg-popover border border-border">
      {label && <p className="font-semibold mb-1 text-foreground">{label}</p>}
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
  const { user, role } = useAuthStore();
  const { setPageTitle } = useAppStore();
  const navigate = useNavigate();
  const [today] = useState(() => formatVietnameseDate(new Date()));
  const isT = isTeacher(role);
  const [error, setError] = useState<string | null>(null);

  // Determine teacherId once per session
  const teacherId = useMemo(() => {
    const { role, user } = useAuthStore.getState();
    return role === 'Teacher' ? user?.id : undefined;
  }, []);

  // ── Cached service calls ────────────────────────────────────────────────────
  const { data: statsRes, loading: loadingStats, refetch: refetchStats } = useServiceCache(
    `dashboard-stats-${teacherId ?? 'all'}`,
    () => getDashboardStats(teacherId),
    { staleTime: isT ? 0 : 30_000 } // Teachers need real-time data for attendance/meds
  );

  const { data: trendRes, loading: loadingTrend, refetch: refetchTrend } = useServiceCache(
    `dashboard-trend-${teacherId ?? 'all'}`,
    () => getAttendanceTrend(teacherId),
    { staleTime: 120_000 }
  );

  const { data: feeRes, loading: loadingFee, refetch: refetchFee } = useServiceCache(
    `dashboard-fee-summary-${teacherId ?? 'all'}`,
    () => getFeeStatusSummary(teacherId),
    { staleTime: 60_000, enabled: !isT }
  );

  const { data: settingsRes } = useServiceCache(
    'school-settings',
    () => getSchoolSettings(),
    { staleTime: 300_000 }
  );

  const { data: teacherWidgetsRes, loading: loadingWidgets, refetch: refetchWidgets } = useServiceCache(
    `teacher-widgets-${teacherId}`,
    () => getTeacherWidgets(teacherId!),
    { staleTime: 60_000, enabled: isT && !!teacherId }
  );

  const loading = loadingStats || loadingTrend || (isT ? loadingWidgets : loadingFee);

  const stats = statsRes?.stats ?? null;
  const trendData = trendRes?.trend ?? [];
  const feeSummary: FeeStatusSummary = feeRes?.summary ?? { paid: 0, unpaid: 0, partial: 0 };
  const teacherWidgets: TeacherWidgetsData = teacherWidgetsRes?.data ?? { birthdays: [], medications: [] };
  const schoolYear = settingsRes?.settings?.school_year
    ? settingsRes.settings.school_year.replace('-', ' – ')
    : '2024 – 2025';

  // Check for errors from service calls
  useEffect(() => {
    const errors = [
      statsRes?.error?.message,
      trendRes?.error?.message,
      feeRes?.error?.message,
      teacherWidgetsRes?.error?.message
    ].filter(Boolean);
    if (errors.length > 0) {
      setError(errors[0]);
    }
  }, [statsRes, trendRes, feeRes, teacherWidgetsRes]);

  useEffect(() => {
    setPageTitle('Dashboard');
  }, [setPageTitle]);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Người dùng';

  const feeStatus = [
    { name: 'Đã đóng', value: feeSummary.paid, color: COLORS.success },
    { name: 'Chưa đóng', value: feeSummary.unpaid, color: COLORS.error },
    { name: 'Đóng một phần', value: feeSummary.partial, color: COLORS.warning },
  ].filter(s => s.value > 0);

  const handleRetry = () => {
    setError(null);
    refetchStats();
    refetchTrend();
    refetchFee();
    refetchWidgets();
  };

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={handleRetry}
            className="text-sm font-medium text-red-700 hover:text-red-900 underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Welcome row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Xin chào, <span className="text-primary">{displayName}</span>!
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
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
          trend={isT ? "Lớp phụ trách" : "Toàn trường"}
          trendDirection="up"
          onClick={() => navigate('/students')}
        />
        <StatCard
          label="Đang có mặt"
          value={loading ? '...' : String(stats?.attendanceToday.present || 0)}
          icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
          iconBg="bg-emerald-500/10"
          trend={`${stats?.attendanceToday.total || 0} học sinh điểm danh`}
          trendDirection="up"
          onClick={() => navigate('/attendance')}
        />
        <StatCard
          label="Vắng mặt"
          value={loading ? '...' : String(stats?.attendanceToday.absent || 0)}
          icon={<XCircle className="w-5 h-5 text-amber-500" />}
          iconBg="bg-amber-500/10"
          trend={isT ? "Vắng & Có phép" : "Tính theo ngày hôm nay"}
          trendDirection="down"
          onClick={() => navigate('/attendance')}
        />
        {isT ? (
          <StatCard
            label="Học sinh dặn thuốc"
            value={loading ? '...' : String(stats?.attentionCount || 0)}
            icon={<HeartPulse className="w-5 h-5 text-rose-500" />}
            iconBg="bg-rose-500/10"
            trend="Cần uống thuốc hôm nay"
            trendDirection="neutral"
            onClick={() => navigate('/attendance')}
          />
        ) : (
          <StatCard
            label="Công nợ học phí"
            value={loading ? '...' : `${((stats?.totalDebt || 0) / 1000000).toFixed(1)}M`}
            icon={<Wallet className="w-5 h-5 text-red-500" />}
            iconBg="bg-red-500/10"
            trend={`${(stats?.totalDebt || 0).toLocaleString()} đ`}
            trendDirection="down"
            onClick={() => navigate('/fees')}
          />
        )}
      </div>

      {/* Attendance table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {isT ? 'Tình hình lớp phụ trách' : 'Điểm danh hôm nay (Top 5 lớp)'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cập nhật theo thời gian thực từ giáo viên
            </p>
          </div>
          <button 
            onClick={() => navigate('/attendance')}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Xem chi tiết <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                {['Lớp học', 'Sĩ số', 'Có mặt', 'Vắng', 'Tỷ lệ'].map((h, i) => (
                  <th
                    key={h}
                    className={`py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground ${i === 0 ? 'text-left px-6' : 'text-center px-4'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(stats?.attendanceByClass || []).map((row) => {
                const pct = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0;
                const barColor = pct >= 90 ? COLORS.success : pct >= 75 ? COLORS.warning : COLORS.error;
                return (
                  <tr key={row.classId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 font-medium text-foreground">{row.className}</td>
                    <td className="text-center px-4 py-3 text-muted-foreground">{row.total}</td>
                    <td className="text-center px-4 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-6 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-500">
                        {row.present}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-6 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-500">
                        {row.absent}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
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
              {!loading && (stats?.attendanceByClass || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-muted-foreground/60 italic">
                    Chưa có dữ liệu điểm danh hôm nay
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-5">Thống kê &amp; Biểu đồ</h2>
        {isT && stats?.totalStudents === 0 && !loading ? (
          <div className="bg-card rounded-2xl border border-border border-dashed p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-primary/20" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Chưa có dữ liệu thống kê</h3>
            <p className="text-xs text-muted-foreground max-w-[280px] mx-auto mt-1.5">
              Khi bạn được phân công vào lớp học và thực hiện điểm danh, 
              các biểu đồ thống kê sẽ tự động hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${isT ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-6`}>
            {isT ? (
              <div className="bg-card rounded-2xl border border-border flex flex-col min-h-[220px]">
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Sinh nhật trong tháng</h3>
                </div>
                <div className="flex-1 p-5 overflow-y-auto max-h-[160px]">
                  {teacherWidgets.birthdays.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                      Không có sinh nhật tháng này
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {teacherWidgets.birthdays.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {s.full_name.split(' ').pop()?.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-foreground">{s.full_name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{new Date(s.date_of_birth).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Học sinh theo khối lớp</h3>
                {(stats?.studentsByGrade || []).length > 0 ? (
                  <RResponsiveContainer width="100%" height={220}>
                    <RBarChart data={stats?.studentsByGrade || []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }} barSize={28}>
                      <RCartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted/20" vertical={false} />
                      <RXAxis dataKey="gradeName" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                      <RYAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                      <RTooltip content={<ChartTooltip />} />
                      <RBar dataKey="count" name="Học sinh" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
                    </RBarChart>
                  </RResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground/60 italic border border-dashed border-border rounded-xl">
                    Chưa có dữ liệu học sinh
                  </div>
                )}
              </div>
            )}

            <div className="bg-card rounded-2xl border border-border flex flex-col min-h-[220px]">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">
                  {isT ? 'Lưu ý dặn thuốc hôm nay' : 'Xu hướng điểm danh (7 ngày)'}
                </h3>
              </div>
              <div className="flex-1 p-5 overflow-y-auto max-h-[160px]">
                {isT ? (
                  <>
                    {teacherWidgets.medications.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                        Không có dặn thuốc hôm nay
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {teacherWidgets.medications.map((m, i) => (
                          <div key={i} className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="text-sm font-semibold text-foreground">{m.studentName}</span>
                            </div>
                            <p className="text-xs text-muted-foreground italic">"{m.notes}"</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : trendData.length > 0 ? (
                  <RResponsiveContainer width="100%" height={220}>
                    <RLineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <RCartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted/20" vertical={false} />
                      <RXAxis dataKey="day" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={false} tickLine={false} />
                      <RYAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                      <RTooltip content={<ChartTooltip />} />
                      <RLine type="monotone" dataKey="rate" name="Tỷ lệ %" stroke={COLORS.secondary} strokeWidth={2.5} dot={{ fill: COLORS.secondary, r: 4, strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                    </RLineChart>
                  </RResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground/60 italic border border-dashed border-border rounded-xl">
                    Chưa có dữ liệu điểm danh
                  </div>
                )} 
              </div>
            </div>

            {!isT && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Tình trạng học phí</h3>
                {feeStatus.length > 0 ? (
                  <>
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
                            <span className="text-xs text-muted-foreground">{item.name}</span>
                          </div>
                          <span className="text-xs font-semibold text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[210px] flex items-center justify-center text-xs text-muted-foreground/60 italic border border-dashed border-border rounded-xl">
                    Chưa có dữ liệu học phí
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <span className="hidden"><TrendingUp /></span>
    </div>
  );
}
