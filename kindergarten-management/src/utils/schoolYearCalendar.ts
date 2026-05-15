/**
 * Maps a school year string + month (1-12) to the calendar year for the fee month.
 * Accepts both old format ("2025-2026") and new single-year format ("2026").
 * For old format: months 1-8 fall in end year (spring), 9-12 in start year (fall).
 * For new format: returns the year directly (sans any range parsing).
 */
export function calendarYearFromSchoolMonth(schoolYear: string, month: number): number | null {
  // single-year format ("2026")
  const single = Number(schoolYear.trim());
  if (Number.isFinite(single) && single > 1000) {
    return single;
  }
  // old format fallback ("2025-2026")
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
  return y + '-' + String(month).padStart(2, '0');
}

/** Returns the current school year as a single calendar year string (e.g. "2026"). */
export function getCurrentSchoolYear(): string {
  return String(new Date().getFullYear());
}
