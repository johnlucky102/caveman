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
 */
export function summarizeDeductions(logs: any[]) {
  const totalMeal = logs.reduce((sum, log) => sum + (log.meal_deduction_vnd || 0), 0);
  const totalOther = logs.reduce((sum, log) => sum + (log.tuition_deduction_vnd || 0), 0);
  const total = totalMeal + totalOther;
  
  const mealPercent = total > 0 ? Math.round((totalMeal / total) * 100) : 0;
  const otherPercent = total > 0 ? Math.round((totalOther / total) * 100) : 0;

  return { totalMeal, totalOther, total, mealPercent, otherPercent };
}
