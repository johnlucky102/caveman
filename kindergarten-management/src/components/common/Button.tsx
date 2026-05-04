import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Show loading spinner and disable interaction */
  loading?: boolean;
  /** Icon rendered before the label */
  leftIcon?: React.ReactNode;
  /** Icon rendered after the label */
  rightIcon?: React.ReactNode;
  /** Make button fill container width */
  fullWidth?: boolean;
}

// ─── Variant styles ───────────────────────────────────────────────────────────

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-600 active:bg-primary-700 shadow-sm disabled:bg-primary-200',
  secondary:
    'bg-secondary text-white hover:bg-secondary-500 active:bg-secondary-600 shadow-sm disabled:bg-secondary-200',
  outline:
    'border border-[#E2E8F0] bg-white text-[#1E293B] hover:bg-[#F1F5F9] active:bg-[#E2E8F0] disabled:text-[#94A3B8]',
  ghost:
    'bg-transparent text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B] active:bg-[#E2E8F0] disabled:text-[#CBD5E1]',
  danger:
    'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm disabled:bg-red-200',
  success:
    'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 shadow-sm disabled:bg-emerald-200',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1 rounded-lg',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
};

// ─── Button Component ─────────────────────────────────────────────────────────

/**
 * Reusable Button with multiple variants, sizes, loading state, and icon slots.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      children,
      disabled,
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 select-none cursor-pointer',
          'disabled:cursor-not-allowed disabled:opacity-60',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...rest}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}

        {children && <span className="truncate">{children}</span>}

        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
export type { ButtonProps, ButtonVariant, ButtonSize };
