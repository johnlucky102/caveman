import React from 'react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card header content */
  header?: React.ReactNode;
  /** Card footer content */
  footer?: React.ReactNode;
  /** Remove default padding from body */
  noPadding?: boolean;
  /** Remove the border */
  noBorder?: boolean;
  /** Add hover elevation effect */
  hoverable?: boolean;
}

interface StatCardProps {
  /** Stat label */
  label: string;
  /** Main value to display */
  value: string | number;
  /** Optional small description or comparison */
  description?: string;
  /** Icon element */
  icon?: React.ReactNode;
  /** Icon background color class (Tailwind) */
  iconBg?: string;
  /** Optional trend value (e.g. "+12%") */
  trend?: string;
  /** Trend direction for color */
  trendDirection?: 'up' | 'down' | 'neutral';
}

// ─── Card ─────────────────────────────────────────────────────────────────────

/**
 * General-purpose card with optional header, body, and footer sections.
 */
const Card: React.FC<CardProps> = ({
  header,
  footer,
  noPadding = false,
  noBorder = false,
  hoverable = false,
  children,
  className,
  ...rest
}) => {
  return (
    <div
      className={cn(
        'bg-white rounded-xl overflow-hidden transition-shadow',
        !noBorder && 'border border-[#E2E8F0]',
        hoverable && 'hover:shadow-md cursor-pointer',
        className
      )}
      {...rest}
    >
      {/* Header */}
      {header && (
        <div className="px-5 py-4 border-b border-[#E2E8F0]">{header}</div>
      )}

      {/* Body */}
      <div className={cn(!noPadding && 'px-5 py-4')}>{children}</div>

      {/* Footer */}
      {footer && (
        <div className="px-5 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">{footer}</div>
      )}
    </div>
  );
};

// ─── CardHeader ───────────────────────────────────────────────────────────────

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <h3 className="font-semibold text-[#1E293B] text-base">{title}</h3>
      {subtitle && <p className="text-sm text-[#64748B] mt-0.5">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

// ─── StatCard ─────────────────────────────────────────────────────────────────

/**
 * Dashboard statistics card with icon, value, label, and optional trend.
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  description,
  icon,
  iconBg = 'bg-primary/10',
  trend,
  trendDirection = 'neutral',
}) => {
  const trendColor = {
    up: 'text-emerald-600 bg-emerald-50',
    down: 'text-red-500 bg-red-50',
    neutral: 'text-[#64748B] bg-[#F1F5F9]',
  }[trendDirection];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#64748B] truncate">{label}</p>
          <p className="text-2xl font-bold text-[#1E293B] mt-1 leading-none">{value}</p>
          {description && (
            <p className="text-xs text-[#64748B] mt-1.5">{description}</p>
          )}
          {trend && (
            <span className={cn('inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full', trendColor)}>
              {trend}
            </span>
          )}
        </div>

        {icon && (
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;
export type { CardProps, StatCardProps };
