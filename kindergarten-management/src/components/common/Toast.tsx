import React from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../lib/utils';
import type { ToastMessage, ToastType } from '../../types';

// ─── Config ───────────────────────────────────────────────────────────────────

const toastConfig: Record<
  ToastType,
  { icon: React.FC<{ className?: string }>; containerClass: string; iconClass: string }
> = {
  success: {
    icon: CheckCircle2,
    containerClass: 'border-emerald-200 bg-emerald-50',
    iconClass: 'text-emerald-500',
  },
  error: {
    icon: AlertCircle,
    containerClass: 'border-red-200 bg-red-50',
    iconClass: 'text-red-500',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'border-amber-200 bg-amber-50',
    iconClass: 'text-amber-500',
  },
  info: {
    icon: Info,
    containerClass: 'border-blue-200 bg-blue-50',
    iconClass: 'text-blue-500',
  },
};

// ─── Single Toast Item ────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-3 w-full max-w-sm rounded-xl border p-4 shadow-lg animate-fade-in',
        config.containerClass
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', config.iconClass)} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1E293B] leading-snug">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 p-0.5 rounded-md text-[#94A3B8] hover:text-[#64748B] transition-colors"
        aria-label="Đóng thông báo"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ─── Toast Container ──────────────────────────────────────────────────────────

/**
 * Global toast notification container.
 * Reads from appStore and renders via portal at the bottom-right of the screen.
 */
const Toast: React.FC = () => {
  const { toasts, removeToast } = useAppStore();

  if (toasts.length === 0) return null;

  return createPortal(
    <div
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end"
      aria-live="polite"
      aria-label="Thông báo hệ thống"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>,
    document.body
  );
};

// ─── useToast hook ────────────────────────────────────────────────────────────

/**
 * Convenience hook to fire toasts from any component.
 *
 * @example
 * const toast = useToast();
 * toast.success('Lưu thành công!');
 * toast.error('Đã có lỗi xảy ra', 'Chi tiết lỗi...');
 */
export function useToast() {
  const { addToast } = useAppStore();
  return React.useMemo(
    () => ({
      success: (title: string, message?: string, duration?: number) =>
        addToast('success', title, message, duration),
      error: (title: string, message?: string, duration?: number) =>
        addToast('error', title, message, duration),
      warning: (title: string, message?: string, duration?: number) =>
        addToast('warning', title, message, duration),
      info: (title: string, message?: string, duration?: number) =>
        addToast('info', title, message, duration),
    }),
    [addToast]
  );
}

export default Toast;
export type { ToastItemProps };
