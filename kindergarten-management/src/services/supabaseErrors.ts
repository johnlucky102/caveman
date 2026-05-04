import type { AppError } from '@/types/domain';

function mapErrorCode(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('duplicate') || lower.includes('unique')) return 'CONFLICT';
  if (lower.includes('permission') || lower.includes('not allowed')) return 'FORBIDDEN';
  if (lower.includes('not found')) return 'NOT_FOUND';
  return 'UNKNOWN';
}

export function toAppError(error: unknown, fallback = 'Có lỗi xảy ra.'): AppError {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String((error as { message?: unknown }).message || fallback);
    return {
      code: mapErrorCode(message),
      message,
    };
  }

  return {
    code: 'UNKNOWN',
    message: fallback,
  };
}
