import React from 'react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  /** Color variant */
  variant?: BadgeVariant;
  /** Size preset */
  size?: BadgeSize;
  /** Show a colored dot before the label */
  dot?: boolean;
  /** Badge content */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Optional click handler */
  onClick?: () => void;
}

// ─── Variant styles ───────────────────────────────────────────────────────────

const variantStyles: Record<BadgeVariant, { badge: string; dot: string }> = {
  primary: {
    badge: 'bg-primary/10 text-primary border-primary/20',
    dot: 'bg-primary',
  },
  secondary: {
    badge: 'bg-secondary/10 text-secondary-600 border-secondary/20',
    dot: 'bg-secondary',
  },
  success: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  warning: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  danger: {
    badge: 'bg-red-50 text-red-600 border-red-200',
    dot: 'bg-red-500',
  },
  info: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  neutral: {
    badge: 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]',
    dot: 'bg-[#94A3B8]',
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-0.5 gap-1.5',
  lg: 'text-sm px-2.5 py-1 gap-1.5',
};

// ─── Badge Component ──────────────────────────────────────────────────────────

/**
 * Status badge with multiple color variants, sizes, and optional dot indicator.
 */
const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  className,
  onClick,
}) => {
  const { badge: badgeClass, dot: dotClass } = variantStyles[variant];

  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center font-medium rounded-full border whitespace-nowrap',
        badgeClass,
        sizeStyles[size],
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
    >
      {dot && (
        <span className={cn('rounded-full shrink-0', dotClass, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      )}
      {children}
    </span>
  );
};

// ─── Pre-built status badges ──────────────────────────────────────────────────

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const studentStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  active:      { label: 'Đang học',     variant: 'success' },
  inactive:    { label: 'Không hoạt động', variant: 'neutral' },
  graduated:   { label: 'Đã tốt nghiệp', variant: 'info' },
  transferred: { label: 'Chuyển trường', variant: 'warning' },
};

const teacherStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  active:   { label: 'Đang làm việc', variant: 'success' },
  inactive: { label: 'Nghỉ việc',     variant: 'danger' },
  on_leave: { label: 'Nghỉ phép',     variant: 'warning' },
};

const attendanceStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  present: { label: 'Có mặt',   variant: 'success' },
  absent:  { label: 'Vắng mặt', variant: 'danger' },
  late:    { label: 'Đi muộn',  variant: 'warning' },
  excused: { label: 'Có phép',  variant: 'info' },
};

const feeStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  paid:    { label: 'Đã thanh toán', variant: 'success' },
  pending: { label: 'Chờ thanh toán', variant: 'warning' },
  overdue: { label: 'Quá hạn',       variant: 'danger' },
  waived:  { label: 'Miễn giảm',     variant: 'info' },
  partial: { label: 'Thanh toán 1 phần', variant: 'secondary' },
};

export const StudentStatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const cfg = studentStatusMap[status] || { label: status, variant: 'neutral' as BadgeVariant };
  return <Badge variant={cfg.variant} dot className={className}>{cfg.label}</Badge>;
};

export const TeacherStatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const cfg = teacherStatusMap[status] || { label: status, variant: 'neutral' as BadgeVariant };
  return <Badge variant={cfg.variant} dot className={className}>{cfg.label}</Badge>;
};

export const AttendanceStatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const cfg = attendanceStatusMap[status] || { label: status, variant: 'neutral' as BadgeVariant };
  return <Badge variant={cfg.variant} dot className={className}>{cfg.label}</Badge>;
};

export const FeeStatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const cfg = feeStatusMap[status] || { label: status, variant: 'neutral' as BadgeVariant };
  return <Badge variant={cfg.variant} dot className={className}>{cfg.label}</Badge>;
};

export default Badge;
export type { BadgeProps, BadgeVariant, BadgeSize };
