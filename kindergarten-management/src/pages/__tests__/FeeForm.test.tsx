import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeeForm from '../FeeForm';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as studentsService from '@/services/studentsService';
import * as feesService from '@/services/feesService';

// Mocking components
vi.mock('@/components/common/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ user: { full_name: 'Admin' } }),
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

  it('should render and handle sync', async () => {
    // Mocking services
    vi.spyOn(studentsService, 'listStudents').mockResolvedValue({ data: { items: [] } as any, error: null });
    vi.spyOn(feesService, 'getFeeById').mockResolvedValue({ 
      item: { id: '1', student_id: 's1', amount_vnd: 1000, status: 'unpaid', month: 10, school_year: '2024' } as any, 
      error: null 
    });
    const syncSpy = vi.spyOn(feesService, 'syncFeeWithAttendance').mockResolvedValue({ item: {} as any, error: null });

    renderForm('/fees/1');

    // Wait for the button to be enabled
    await waitFor(() => {
      const btn = screen.queryByRole('button', { name: /Đồng bộ chuyên cần/i });
      return btn && !(btn as HTMLButtonElement).disabled;
    }, { timeout: 10000 });

    const syncBtn = screen.getByRole('button', { name: /Đồng bộ chuyên cần/i });
    fireEvent.click(syncBtn);
    
    await waitFor(() => {
      expect(syncSpy).toHaveBeenCalledWith('1');
    });
  });
});
