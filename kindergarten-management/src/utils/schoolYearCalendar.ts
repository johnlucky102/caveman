/**
 * Maps Vietnamese school year (e.g. "2024-2025") + month (1–12) to calendar year
 * for the fee month: months 1–8 fall in the end year (spring), 9–12 in start year (fall).
 */
export function calendarYearFromSchoolMonth(schoolYear: string, month: number): number | null {
  const parts = schoolYear.split('-').map((s) => Number(String(s).trim()));
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
    return null;
  }
  const [startYear, endYear] = parts;
  if (!Number.isFinite(month)) return null;
  if (month >= 1 && month <= 8) return endYear;
  return startYear;
}

/** `YYYY-MM` calendar key for a fee row, or null if inputs invalid. */
export function calendarMonthKeyFromSchoolYear(
  schoolYear: string | null | undefined,
  month: number | null | undefined
): string | null {
  if (schoolYear == null || month == null) return null;
  const y = calendarYearFromSchoolMonth(schoolYear, month);
  if (y == null) return null;
  return `${y}-${String(month).padStart(2, '0')}`;
}

/** Returns the current school year string (e.g. "2025-2026") based on today's date. */
export function getCurrentSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  // School year typically starts in Sept (Month 9)
  if (month >= 9) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}
