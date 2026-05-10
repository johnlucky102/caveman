import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Attendance from '../Attendance';
import { useAuthStore } from '@/stores/authStore';
import { listClasses } from '@/services/classesService';
import { listAttendanceByClassAndDate } from '@/services/attendanceService';
import { MemoryRouter } from 'react-router-dom';

// Mock stores and services
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/services/classesService', () => ({
  listClasses: vi.fn(),
}));

vi.mock('@/services/attendanceService', () => ({
  listAttendanceByClassAndDate: vi.fn(),
  listAttendanceHistory: vi.fn(),
  upsertAttendanceBulk: vi.fn(),
}));

// Mock Toast
vi.mock('@/components/common/Toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

const mockStudents = [
  {
    student_id: 's1',
    student_name: 'Nguyen Van A',
    class_id: 1,
    class_name: 'Lớp Mầm 1',
    attendance_id: null,
    status: 'present',
    meal_included: true,
    medicine_instructions: '',
    sleep_quality: 'Good',
    is_hospitalized: false,
  }
];

describe('Attendance UI Logic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as any).mockReturnValue({ role: 'Teacher', user: { id: 't1' } });
    (listClasses as any).mockResolvedValue({ data: { items: [{ id: 1, name: 'Lớp Mầm 1' }] }, error: null });
    (listAttendanceByClassAndDate as any).mockResolvedValue({ items: mockStudents, error: null });
  });

  it('should render the attendance page header', async () => {
    render(
      <MemoryRouter>
        <Attendance />
      </MemoryRouter>
    );

    expect(screen.getByText('Điểm danh')).toBeTruthy();
    expect(screen.getByText('Điểm danh nhanh')).toBeTruthy();
  });
});
