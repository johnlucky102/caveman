import { describe, it, expect } from 'vitest';
import { calendarYearFromSchoolMonth, calendarMonthKeyFromSchoolYear } from '../schoolYearCalendar';

describe('schoolYearCalendar', () => {
  it('calendarYearFromSchoolMonth: spring months use end year', () => {
    expect(calendarYearFromSchoolMonth('2024-2025', 1)).toBe(2025);
    expect(calendarYearFromSchoolMonth('2024-2025', 8)).toBe(2025);
  });

  it('calendarYearFromSchoolMonth: fall months use start year', () => {
    expect(calendarYearFromSchoolMonth('2024-2025', 9)).toBe(2024);
    expect(calendarYearFromSchoolMonth('2024-2025', 12)).toBe(2024);
  });

  it('calendarYearFromSchoolMonth: invalid school year', () => {
    expect(calendarYearFromSchoolMonth('bad', 5)).toBeNull();
    expect(calendarYearFromSchoolMonth('', 5)).toBeNull();
  });

  it('calendarMonthKeyFromSchoolYear', () => {
    expect(calendarMonthKeyFromSchoolYear('2024-2025', 3)).toBe('2025-03');
    expect(calendarMonthKeyFromSchoolYear('2024-2025', 10)).toBe('2024-10');
    expect(calendarMonthKeyFromSchoolYear('2024-2025', null)).toBeNull();
    expect(calendarMonthKeyFromSchoolYear(null, 5)).toBeNull();
  });
});
