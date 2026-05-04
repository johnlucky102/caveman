import React from 'react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label rendered above the input */
  label?: string;
  /** Error message shown below the input */
  error?: string;
  /** Helper text shown below the input (hidden when error is set) */
  hint?: string;
  /** Icon or element rendered on the left inside the input */
  leftAddon?: React.ReactNode;
  /** Icon or element rendered on the right inside the input */
  rightAddon?: React.ReactNode;
  /** Make the input span full width of its container */
  fullWidth?: boolean;
  /** Mark field as required with an asterisk */
  required?: boolean;
}

// ─── Input Component ──────────────────────────────────────────────────────────

/**
 * Controlled/uncontrolled text input with label, error, hint, and addon slots.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftAddon,
      rightAddon,
      fullWidth = true,
      required,
      className,
      id,
      ...rest
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[#1E293B] select-none"
          >
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative flex items-center">
          {/* Left addon */}
          {leftAddon && (
            <span className="absolute left-3 text-[#94A3B8] pointer-events-none flex items-center">
              {leftAddon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            required={required}
            className={cn(
              'h-10 w-full rounded-xl border bg-white text-sm text-[#1E293B] placeholder:text-[#94A3B8] transition-colors duration-150 outline-none',
              'focus:border-primary focus:ring-2 focus:ring-primary/10',
              error
                ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10'
                : 'border-[#E2E8F0]',
              'disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]',
              leftAddon ? 'pl-9' : 'pl-3',
              rightAddon ? 'pr-9' : 'pr-3',
              className
            )}
            {...rest}
          />

          {/* Right addon */}
          {rightAddon && (
            <span className="absolute right-3 text-[#94A3B8] flex items-center">
              {rightAddon}
            </span>
          )}
        </div>

        {/* Error / hint text */}
        {error ? (
          <p className="text-xs text-red-500 flex items-center gap-1">{error}</p>
        ) : hint ? (
          <p className="text-xs text-[#64748B]">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
export type { InputProps };
