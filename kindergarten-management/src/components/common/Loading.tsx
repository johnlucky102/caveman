import React from 'react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type LoadingVariant = 'spinner' | 'dots' | 'skeleton' | 'pulse';

interface LoadingProps {
  /** Size preset */
  size?: LoadingSize;
  /** Loading animation variant */
  variant?: LoadingVariant;
  /** Additional className */
  className?: string;
  /** Label for screen readers */
  label?: string;
}

interface SkeletonProps {
  /** Additional className (use for width/height) */
  className?: string;
  /** Whether to show rounded-full shape */
  circle?: boolean;
  /** Number of skeleton lines to render */
  lines?: number;
}

interface PageLoadingProps {
  /** Message shown below the spinner */
  message?: string;
}

// ─── Size config ──────────────────────────────────────────────────────────────

const spinnerSizes: Record<LoadingSize, string> = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
  xl: 'w-12 h-12 border-[3px]',
};

const dotSizes: Record<LoadingSize, string> = {
  xs: 'w-1 h-1',
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
  xl: 'w-3 h-3',
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner: React.FC<{ size?: LoadingSize; className?: string; label?: string }> = ({
  size = 'md',
  className,
  label = 'Đang tải...',
}) => (
  <div
    role="status"
    aria-label={label}
    className={cn(
      'rounded-full border-[#E2E8F0] border-t-primary animate-spin shrink-0',
      spinnerSizes[size],
      className
    )}
  />
);

// ─── Dots ─────────────────────────────────────────────────────────────────────

const Dots: React.FC<{ size?: LoadingSize; className?: string }> = ({
  size = 'md',
  className,
}) => (
  <div className={cn('flex gap-1.5 items-center', className)} role="status" aria-label="Đang tải...">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className={cn('rounded-full bg-primary animate-bounce', dotSizes[size])}
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </div>
);

// ─── Loading Component ────────────────────────────────────────────────────────

/**
 * Flexible loading indicator supporting spinner and dots variants.
 * For skeleton and pulse, see Skeleton component below.
 */
const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  variant = 'spinner',
  className,
  label,
}) => {
  if (variant === 'dots') return <Dots size={size} className={className} />;
  return <Spinner size={size} className={className} label={label} />;
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

/**
 * Skeleton placeholder for loading states.
 * Use className to set width and height.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  circle = false,
  lines,
}) => {
  if (lines != null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-4 bg-[#F1F5F9] rounded animate-pulse',
              i === lines - 1 && 'w-3/4',
              className
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-[#F1F5F9] animate-pulse',
        circle ? 'rounded-full' : 'rounded-lg',
        className
      )}
      aria-hidden="true"
    />
  );
};

// ─── Page Loading ─────────────────────────────────────────────────────────────

/**
 * Full-page centered loading overlay.
 */
export const PageLoading: React.FC<PageLoadingProps> = ({
  message = 'Đang tải dữ liệu...',
}) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
    <Loading size="xl" variant="spinner" />
    <p className="text-sm text-[#64748B] animate-pulse">{message}</p>
  </div>
);

// ─── Card Skeleton ────────────────────────────────────────────────────────────

/**
 * Pre-built card-shaped skeleton for list/grid loading states.
 */
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton circle className="w-10 h-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    ))}
  </>
);

export default Loading;
export type { LoadingProps, LoadingSize, LoadingVariant };
