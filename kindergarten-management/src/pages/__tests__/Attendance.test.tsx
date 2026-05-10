import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Attendance from '../Attendance';
import { MemoryRouter } from 'react-router-dom';

// Mocking toast
vi.mock('@/components/common/Toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mocking services
vi.mock('@/services/classesService', () => ({
  listClasses: vi.fn().mockResolvedValue({ data: { items: [{ id: 1, name: 'Class A' }] }, error: null }),
}));

vi.mock('@/services/attendanceService', () => ({
  listAttendanceByClassAndDate: vi.fn().mockResolvedValue({ 
    items: [{ student_id: 's1', student_name: 'Kid A', status: 'present', meal_included: true }], 
    error: null 
  }),
  upsertAttendanceBulk: vi.fn().mockResolvedValue({ error: null }),
}));

const renderAttendance = () => {
  return render(
    <MemoryRouter>
      <Attendance />
    </MemoryRouter>
  );
};

describe('Attendance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the attendance page', async () => {
    renderAttendance();
    expect(await screen.findByText(/Điểm danh hàng ngày/i)).toBeDefined();
  });

  it('should load students for selected class', async () => {
    renderAttendance();
    expect(await screen.findByText('Kid A')).toBeDefined();
  });

  it('should trigger save on button click', async () => {
    const { upsertAttendanceBulk } = await import('@/services/attendanceService');
    renderAttendance();
    
    const saveBtn = await screen.findByRole('button', { name: /Lưu điểm danh/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(upsertAttendanceBulk).toHaveBeenCalled();
    });
  });
});
