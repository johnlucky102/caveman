import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SelectOption } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  /** Field label rendered above the select */
  label?: string;
  /** Error message shown below */
  error?: string;
  /** Helper text shown below (hidden when error is set) */
  hint?: string;
  /** Array of options */
  options: SelectOption[];
  /** Placeholder option text */
  placeholder?: string;
  /** Fired with the selected value string */
  onChange?: (value: string) => void;
  /** Make the select span full width */
  fullWidth?: boolean;
  /** Mark as required */
  required?: boolean;
}

// ─── Select Component ─────────────────────────────────────────────────────────

/**
 * Styled select dropdown with label, error, hint, and custom arrow icon.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      placeholder,
      onChange,
      fullWidth = true,
      required,
      className,
      id,
      value,
      ...rest
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e.target.value);
    };

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-foreground select-none"
          >
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </label>
        )}

        {/* Select wrapper */}
        <div className={cn('relative', className)}>
          <select
            ref={ref}
            id={selectId}
            required={required}
            value={value}
            onChange={handleChange}
            className={cn(
              'h-10 w-full appearance-none rounded-xl border bg-background text-sm text-foreground transition-colors duration-150 outline-none cursor-pointer',
              'focus:border-primary focus:ring-2 focus:ring-primary/10',
              error
                ? 'border-destructive focus:border-destructive focus:ring-destructive/10'
                : 'border-border',
              'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground/60',
              'pl-3 pr-9',
            )}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Custom arrow */}
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60">
            <ChevronDown className="w-4 h-4" />
          </span>
        </div>

        {/* Error / hint text */}
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
export type { SelectProps };
