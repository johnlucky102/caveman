import * as React from "react";
import { format } from "date-fns";
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
}

export function DatePicker({
  date,
  setDate,
  label,
  placeholder = "Chọn ngày",
  className,
  error,
  required,
  clearable = true,
  fullWidth = true,
}: DatePickerProps) {
  const selectedDate = date ? new Date(date) : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground select-none">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}

      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all duration-150 outline-none hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/10",
              !date && "text-muted-foreground",
              error && "border-destructive focus:border-destructive focus:ring-destructive/10"
            )}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {selectedDate ? (
                  format(selectedDate, "dd/MM/yyyy", { locale: vi })
                ) : (
                  <span>{placeholder}</span>
                )}
              </span>
            </div>
            {clearable && date && (
              <X
                className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-destructive transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setDate("");
                }}
              />
            )}
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
              onSelect={(d) => {
                if (d) {
                  // Format as YYYY-MM-DD for consistency with your backend/standard
                  setDate(format(d, "yyyy-MM-dd"));
                }
              }}
              initialFocus
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
