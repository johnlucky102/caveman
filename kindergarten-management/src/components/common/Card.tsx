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
  /** Optional trend direction for color */
  trendDirection?: 'up' | 'down' | 'neutral';
  /** Optional click handler */
  onClick?: () => void;
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
        'bg-card rounded-xl overflow-hidden transition-shadow',
        !noBorder && 'border border-border',
        hoverable && 'hover:shadow-md cursor-pointer',
        className
      )}
      {...rest}
    >
      {/* Header */}
      {header && (
        <div className="px-5 py-4 border-b border-border">{header}</div>
      )}

      {/* Body */}
      <div className={cn(!noPadding && 'px-5 py-4')}>{children}</div>

      {/* Footer */}
      {footer && (
        <div className="px-5 py-3 border-t border-border bg-muted/50">{footer}</div>
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
      <h3 className="font-semibold text-foreground text-base">{title}</h3>
      {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
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
  onClick,
}) => {
  const trendColor = {
    up: 'text-emerald-600 bg-emerald-500/10',
    down: 'text-red-500 bg-red-500/10',
    neutral: 'text-muted-foreground bg-muted',
  }[trendDirection];

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card border border-border rounded-xl p-5 transition-all',
        onClick ? 'hover:shadow-md hover:border-primary/50 cursor-pointer active:scale-[0.98]' : ''
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1 leading-none">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
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
