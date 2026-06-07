import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";

import { cn } from "../../lib/utils";
import Button from "./Button";
import { Calendar } from "./Calendar";

export interface DatePickerProps {
  date?: string;
  setDate: (date: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  error?: string;
  required?: boolean;
  clearable?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
}

// Parse dd/MM/yyyy → yyyy-MM-dd (ISO format for storage)
function parseDisplayDate(display: string): string | null {
  if (!display || !display.trim()) return null;

  const trimmed = display.trim();
  // Match dd/MM/yyyy pattern
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const parsed = parse(trimmed, "dd/MM/yyyy", new Date());

  if (!isValid(parsed)) return null;

  // Return ISO format yyyy-MM-dd
  return format(parsed, "yyyy-MM-dd");
}

// Format yyyy-MM-dd → dd/MM/yyyy (display format)
function formatToDisplay(iso: string): string {
  if (!iso || !iso.trim()) return "";
  try {
    const date = new Date(iso);
    if (!isValid(date)) return "";
    return format(date, "dd/MM/yyyy", { locale: vi });
  } catch {
    return "";
  }
}

// Validate dd/MM/yyyy format
function isValidDateInput(input: string): boolean {
  if (!input || !input.trim()) return false;
  const parsed = parseDisplayDate(input);
  return parsed !== null;
}

export function DatePicker({
  date,
  setDate,
  label,
  placeholder = "dd/MM/yyyy",
  className,
  error,
  required,
  clearable = true,
  fullWidth = true,
  disabled = false,
}: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [validationError, setValidationError] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  // Sync external date prop to input display value
  React.useEffect(() => {
    if (date) {
      setInputValue(formatToDisplay(date));
      setValidationError("");
    } else {
      setInputValue("");
      setValidationError("");
    }
  }, [date]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Auto-format: add "/" after day and month
    // Remove non-digits first
    const digitsOnly = value.replace(/\D/g, "");

    if (digitsOnly.length <= 2) {
      // Just day: 01, 15
      value = digitsOnly;
    } else if (digitsOnly.length <= 4) {
      // Day + month: 15/05
      value = digitsOnly.slice(0, 2) + "/" + digitsOnly.slice(2);
    } else {
      // Day + month + year: 15/05/2020
      value = digitsOnly.slice(0, 2) + "/" + digitsOnly.slice(2, 4) + "/" + digitsOnly.slice(4, 8);
    }

    setInputValue(value);

    // Clear validation error while typing
    if (validationError) {
      setValidationError("");
    }
  };

  const handleInputBlur = () => {
    const trimmed = inputValue.trim();

    // Empty input
    if (!trimmed) {
      setDate("");
      setValidationError("");
      return;
    }

    // Validate and parse
    const parsed = parseDisplayDate(trimmed);
    if (parsed) {
      setDate(parsed);
      setInputValue(formatToDisplay(parsed)); // Normalize display
      setValidationError("");
    } else {
      setValidationError("Ngày không hợp lệ. Định dạng: dd/MM/yyyy");
    }
  };

  const handleCalendarSelect = (d: Date | undefined) => {
    if (d) {
      const isoDate = format(d, "yyyy-MM-dd");
      setDate(isoDate);
      setInputValue(formatToDisplay(isoDate));
      setValidationError("");
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDate("");
    setInputValue("");
    setValidationError("");
  };

  const selectedDate = date ? new Date(date) : undefined;
  const displayError = error || validationError;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground select-none">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}

      <div className="relative flex items-center gap-1">
        {/* Text input for manual entry */}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex h-10 flex-1 items-center rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all duration-150 outline-none hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/10",
            displayError && "border-destructive focus:border-destructive focus:ring-destructive/10",
            disabled && "opacity-60 cursor-not-allowed bg-muted pointer-events-none",
            "placeholder:text-muted-foreground"
          )}
        />

        {/* Calendar popup trigger */}
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background transition-all duration-150 outline-none hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/10",
                displayError && "border-destructive",
                disabled && "opacity-60 cursor-not-allowed bg-muted pointer-events-none"
              )}
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-50 w-auto rounded-2xl border border-border bg-popover p-0 shadow-2xl animate-in fade-in zoom-in duration-200"
              align="start"
              sideOffset={4}
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleCalendarSelect}
                initialFocus
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Clear button */}
        {clearable && inputValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background transition-all duration-150 outline-none hover:border-destructive/50 hover:bg-destructive/5"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
          </button>
        )}
      </div>

      {displayError && <p className="text-xs text-destructive">{displayError}</p>}
    </div>
  );
}
