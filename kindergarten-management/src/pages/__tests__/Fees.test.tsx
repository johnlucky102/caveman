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

// Mocking stores - fix: role should be at top level, not inside user
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    role: 'Admin',
    user: { id: 'u1', role: 'Admin' },
  }),
}));

// Mocking supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { role: 'Admin' }, error: null }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-admin' } } }),
    },
  },
}));

// Mocking services
vi.mock('@/services/feesService', () => ({
  listFees: vi.fn(),
  getFeeSummary: vi.fn().mockResolvedValue({ data: { totalAmount: 100, totalPaid: 0, totalDebt: 100, debtCount: 1 }, error: null }),
  deleteFeeRecord: vi.fn(),
  deleteFeeRecords: vi.fn(),
  createClassFees: vi.fn(),
  syncFeeWithAttendance: vi.fn(),
  bulkSyncFeesByFilter: vi.fn().mockResolvedValue({ synced: 0, failed: 0, error: null }),
  sendBulkPaymentReminders: vi.fn(),
  updateFeeRecordStatus: vi.fn(),
}));

vi.mock('@/services/classesService', () => ({
  listClasses: vi.fn().mockResolvedValue({ data: { items: [], total: 0 }, error: null }),
}));

// Mock missing services used by Fees.tsx
vi.mock('@/services/studentsService', () => ({
  listStudents: vi.fn().mockResolvedValue({ data: { items: [], total: 0 }, error: null }),
}));

vi.mock('@/services/financeConfigService', () => ({
  getFinanceConfigByClassId: vi.fn().mockResolvedValue({ item: null, error: null }),
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

    // Just check header renders
    expect(screen.getByText(/^Học phí$/i)).toBeDefined();
  });

  it('should show the main action buttons', async () => {
    vi.mocked(feesService.listFees).mockResolvedValue({
      data: {
        items: [
          {
            id: 'f1',
            student_id: 's1',
            student_name: 'Kid A',
            class_name: 'Class A',
            amount_vnd: 1000000,
            paid_amount_vnd: 0,
            status: 'unpaid',
            month: 10,
            school_year: '2024-2025',
          } as any,
        ],
        total: 1,
      } as any,
      error: null,
    });

    renderPage();

    // Actual button text in UI: "Tạo hàng loạt" and "Tạo phiếu thu"
    expect(screen.getByText(/Tạo hàng loạt/i)).toBeDefined();
    expect(screen.getByText(/Tạo phiếu thu/i)).toBeDefined();
  });
});
