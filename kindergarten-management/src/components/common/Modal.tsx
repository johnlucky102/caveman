import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from './Button';

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** Modal window title */
  title?: string;
  /** Description text below the title */
  description?: string;
  /** Modal body content */
  children?: React.ReactNode;
  /** Footer slot – if provided renders below content */
  footer?: React.ReactNode;
  /** Size preset */
  size?: ModalSize;
  /** Prevent closing when clicking the backdrop */
  disableBackdropClose?: boolean;
  /** Hide the default close (X) button */
  hideCloseButton?: boolean;
  /** Additional class for the dialog panel */
  className?: string;
}

// ─── Size classes ─────────────────────────────────────────────────────────────

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-[95vw] h-[90vh]',
};

// ─── Modal Component ──────────────────────────────────────────────────────────

/**
 * Accessible modal dialog rendered via React Portal.
 * Traps focus, closes on Escape, and supports multiple sizes.
 */
const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  disableBackdropClose = false,
  hideCloseButton = false,
  className,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Keyboard handling & focus management
  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={!disableBackdropClose ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative w-full bg-white rounded-2xl shadow-2xl outline-none animate-fade-in flex flex-col',
          sizeClasses[size],
          size === 'full' && 'overflow-hidden',
          className
        )}
      >
        {/* Header */}
        {(title || !hideCloseButton) && (
          <div className="flex items-start justify-between px-6 py-4 border-b border-[#E2E8F0] shrink-0">
            <div>
              {title && (
                <h2 id="modal-title" className="text-base font-semibold text-[#1E293B]">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-[#64748B] mt-0.5">{description}</p>
              )}
            </div>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className="ml-4 p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition-colors shrink-0"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={cn('flex-1 px-6 py-5', size === 'full' && 'overflow-y-auto')}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] rounded-b-2xl shrink-0 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

// ─── Confirm Modal ────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

/**
 * Pre-built confirmation dialog built on top of Modal.
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  title = 'Xác nhận',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'danger',
  loading = false,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[#64748B]">{message}</p>
    </Modal>
  );
};

export default Modal;
export type { ModalProps, ModalSize };
