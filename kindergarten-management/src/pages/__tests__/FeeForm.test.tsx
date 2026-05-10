import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeeForm from '../FeeForm';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { listStudents } from '@/services/studentsService';
import { getFeeById, syncFeeWithAttendance } from '@/services/feesService';

// Mocking toast
vi.mock('@/components/common/Toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mocking services
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { full_name: 'Test Admin' },
    isAuthenticated: true,
  }),
}));

vi.mock('@/services/studentsService', () => ({
  listStudents: vi.fn().mockResolvedValue({ data: { items: [{ id: 1, full_name: 'Kid A' }] }, error: null }),
}));

vi.mock('@/services/feesService', () => ({
  createFeeRecord: vi.fn(),
  getFeeById: vi.fn().mockResolvedValue({ item: null, error: null }),
  updateFeeRecord: vi.fn(),
  deleteFeeRecord: vi.fn(),
  syncFeeWithAttendance: vi.fn(),
}));

const renderForm = (path = '/fees/new') => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/fees/:id" element={<FeeForm />} />
        <Route path="/fees/new" element={<FeeForm />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('FeeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the form', async () => {
    renderForm();
    expect(await screen.findByText(/Tạo hóa đơn học phí/i)).toBeDefined();
  });

  it('should trigger sync with attendance calculation', async () => {
    vi.mocked(getFeeById).mockResolvedValue({ item: { id: '1', amount_vnd: 0, student_id: '1', class_id: 1, school_year: '2024-2025', month: 10, status: 'unpaid', paid_amount_vnd: 0, paid_date: null, due_date: null, payment_method: null, base_amount_vnd: 0, meal_deduction_vnd: 0, tuition_deduction_vnd: 0, deduction_note: null, created_at: '', updated_at: '', student_name: 'Kid A', class_name: 'Class A' } as any, error: null });
    vi.mocked(syncFeeWithAttendance).mockResolvedValue({
      item: { id: '1', amount_vnd: 1000000 } as any,
      error: null
    });

    renderForm('/fees/1');

    // Wait for data load
    const syncBtn = await screen.findByRole('button', { name: /Đồng bộ chuyên cần/i });
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(syncFeeWithAttendance).toHaveBeenCalled();
    });
  });
});
