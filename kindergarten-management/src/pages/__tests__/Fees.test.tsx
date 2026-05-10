import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fees from '../Fees';
import { MemoryRouter } from 'react-router-dom';
import * as feesService from '@/services/feesService';

// Mocking toast
vi.mock('@/components/common/Toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mocking stores
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { role: 'admin' },
  }),
}));

// Mocking services
vi.mock('@/services/feesService', () => ({
  listFees: vi.fn(),
  deleteFeeRecord: vi.fn(),
  sendBulkPaymentReminders: vi.fn(),
}));

const renderPage = () => {
  return render(
    <MemoryRouter>
      <Fees />
    </MemoryRouter>
  );
};

describe('Fees List Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the fees page and list items', async () => {
    vi.mocked(feesService.listFees).mockResolvedValue({
      data: {
        items: [
          { 
            id: '1', 
            student_name: 'Kid A', 
            title: 'Học phí tháng 10', 
            amount_vnd: 1000000, 
            status: 'unpaid',
            base_amount_vnd: 1000000,
            meal_deduction_vnd: 0,
            tuition_deduction_vnd: 0,
            month: 10,
            school_year: '2024-2025'
          }
        ],
        total: 1
      } as any,
      error: null
    });

    renderPage();
    expect(screen.getByText(/^Học phí$/i)).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText(/Kid A/i)).toBeDefined();
    });
  });

  it('should show the main action buttons', async () => {
    vi.mocked(feesService.listFees).mockResolvedValue({
      data: {
        items: [{ id: '1', student_name: 'Kid A', title: 'Fee', amount_vnd: 100, status: 'unpaid' }],
        total: 1
      } as any,
      error: null
    });

    renderPage();
    
    // The main "Tạo bản ghi phí" button should always be there
    expect(screen.getByText(/Tạo bản ghi phí/i)).toBeDefined();
    // "Tạo theo lớp" should also be there
    expect(screen.getByText(/Tạo theo lớp/i)).toBeDefined();
  });
});
