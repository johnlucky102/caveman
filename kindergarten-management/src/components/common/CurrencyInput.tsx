import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  suffix?: string;
}

export default function CurrencyInput({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  suffix = 'đ',
  className,
  id,
  ...rest
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  // Format number to string with dots: 3000000 -> "3.000.000"
  const formatNumber = (val: string | number) => {
    if (!val && val !== 0) return '';
    const num = String(val).replace(/\D/g, '');
    if (!num) return '';
    return new Intl.NumberFormat('vi-VN').format(Number(num));
  };

  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setDisplayValue(formatNumber(rawValue));
    onChange(rawValue);
  };

  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground select-none">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}

      <div className="relative group">
        <input
          id={inputId}
          type="text"
          value={displayValue}
          onChange={handleChange}
          autoComplete="off"
          className={cn(
            'h-10 w-full rounded-xl border bg-background text-sm font-semibold text-foreground transition-all duration-150 outline-none',
            'focus:border-primary focus:ring-2 focus:ring-primary/10',
            'pr-10 pl-3',
            error ? 'border-destructive focus:border-destructive' : 'border-border',
            'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground/60',
            className
          )}
          {...rest}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 text-xs font-bold pointer-events-none select-none">
            {suffix}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
