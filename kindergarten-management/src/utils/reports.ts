/**
 * Utility functions for report calculations and formatting.
 */

/**
 * Formats a number as VND currency.
 * Removes special non-breaking spaces for easier testing and consistency.
 */
export function formatCurrencyVND(amount: number): string {
  const formatted = new Intl.NumberFormat('vi-VN').format(amount);
  // Replace non-breaking spaces (U+00A0) and other special whitespaces with standard space
  return formatted.replace(/\s/g, ' ') + ' đ';
}

/**
 * Calculates attendance percentage safely.
 */
export function calculateAttendanceRate(present: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((present / total) * 100);
}

/**
 * Summarizes financial deductions from logs.
 * Now uses unified attendance_deduction_vnd instead of split meal/tuition.
 */
export function summarizeDeductions(logs: any[]) {
  const totalDeduction = logs.reduce((sum, log) => sum + (log.attendance_deduction_vnd || 0), 0);
  return {
    totalDeduction,
    totalMeal: totalDeduction,
    totalOther: 0,
    total: totalDeduction,
    mealPercent: totalDeduction > 0 ? 100 : 0,
    otherPercent: 0,
  };
}
