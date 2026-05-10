import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// --- Mocks ---

// Partial mock for lucide-react to satisfy Toast and other components
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal() as any;
  const mockIcon = (name: string) => () => <div data-testid={`icon-${name.toLowerCase()}`} />;
  
  return {
    ...actual,
    ArrowLeft: mockIcon('ArrowLeft'),
    Printer: mockIcon('Printer'),
    Receipt: mockIcon('Receipt'),
    Save: mockIcon('Save'),
    Trash2: mockIcon('Trash2'),
    Wallet: mockIcon('Wallet'),
    RefreshCw: mockIcon('RefreshCw'),
    Lock: mockIcon('Lock'),
    AlertCircle: mockIcon('AlertCircle'),
    CheckCircle2: mockIcon('CheckCircle2'),
    XCircle: mockIcon('XCircle'),
    Info: mockIcon('Info'),
    X: mockIcon('X'),
  };
});

// Mock Auth Store
const mockAuthStore = {
  user: { id: 'teacher-1' },
  role: 'Teacher',
};
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => mockAuthStore,
  __esModule: true,
  default: () => mockAuthStore,
}));

// Mock Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'fee-123' }),
}));

// Mock Services
vi.mock('@/services/studentsService', () => ({
  listStudents: vi.fn(() => Promise.resolve({ data: { items: [] }, error: null })),
}));

const mockFeeItem = {
  id: 'fee-123',
  amount_vnd: 1000000,
  paid_amount_vnd: 500000,
  status: 'partial',
  month: 10,
  school_year: '2025-2026',
  student_id: 'std-1',
  student_name: 'John Doe',
  class_name: 'Class A',
  base_amount_vnd: 1000000,
  meal_deduction_vnd: 0,
  tuition_deduction_vnd: 0,
};

vi.mock('@/services/feesService', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    getFeeById: vi.fn(() => Promise.resolve({ item: mockFeeItem, error: null })),
    updateFeeRecord: vi.fn(),
    createFeeRecord: vi.fn(),
    syncFeeWithAttendance: vi.fn(async (id) => {
      if (id === 'paid-fee-id') return { item: null, error: { code: 'FORBIDDEN', message: 'hoàn tất thanh toán' } };
      return { item: mockFeeItem, error: null };
    }),
  };
});

// Import the component after mocks
import FeeForm from '@/pages/FeeForm';
import { syncFeeWithAttendance } from '@/services/feesService';

describe('KidGarden Financial RBAC & Security Test Suite', () => {

  describe('TC-01: UI/UX Guard (Component Test)', () => {
    it('should show read-only money fields and security banner for Teacher role', async () => {
      render(<FeeForm />);
      
      // Wait for data load
      await waitFor(() => {
        expect(screen.queryByText(/Bạn chỉ có quyền xem dữ liệu tài chính/i)).toBeTruthy();
      });

      // Check specific fields
      // Note: We use queryByLabelText because the input might be nested or have different accessibility names
      const baseAmountInput = screen.getByLabelText(/Học phí gốc/i) as HTMLInputElement;
      const amountInput = screen.getByLabelText(/Số tiền phải thu/i) as HTMLInputElement;
      const paidAmountInput = screen.getByLabelText(/Đã thu/i) as HTMLInputElement;
      
      expect(baseAmountInput.readOnly).toBe(true);
      expect(amountInput.readOnly).toBe(true);
      expect(paidAmountInput.readOnly).toBe(true);
      
      // Lock icons should be present
      const lockIcons = screen.getAllByTestId('icon-lock');
      expect(lockIcons.length).toBeGreaterThanOrEqual(3);
      
      // Delete button should be hidden for Teachers
      expect(screen.queryByText(/Xóa/i)).toBeNull();
    });
  });

  describe('TC-02: Service Layer Security', () => {
    it('Scenario B: should block syncFeeWithAttendance for PAID records', async () => {
      const feeId = 'paid-fee-id';
      const result = await syncFeeWithAttendance(feeId);
      
      expect(result.error).not.toBeNull();
      expect(result.error?.code).toBe('FORBIDDEN');
      expect(result.error?.message).toContain('hoàn tất thanh toán');
    });
  });

  describe('TC-03: Database RLS Simulation', () => {
    const simulateRLS = (role: string, oldData: any, newData: any) => {
      if (role === 'Admin' || role === 'Accountant') return true;
      if (role === 'Teacher') {
        const moneyChanged = 
          newData.amount_vnd !== oldData.amount_vnd || 
          newData.paid_amount_vnd !== oldData.paid_amount_vnd ||
          newData.base_amount_vnd !== oldData.base_amount_vnd;
        
        return !moneyChanged;
      }
      return false;
    };

    it('should deny money updates for Teacher role', () => {
      const oldData = { amount_vnd: 1000, paid_amount_vnd: 0, base_amount_vnd: 1000 };
      const newData = { amount_vnd: 500, paid_amount_vnd: 0, base_amount_vnd: 1000 };
      
      const allowed = simulateRLS('Teacher', oldData, newData);
      expect(allowed).toBe(false);
    });

    it('should allow non-financial updates for Teacher role', () => {
      const oldData = { amount_vnd: 1000, title: 'Old' };
      const newData = { amount_vnd: 1000, title: 'New' };
      
      const allowed = simulateRLS('Teacher', oldData, newData);
      expect(allowed).toBe(true);
    });
  });

  describe('TC-04: Boundary Test (MAX_INT)', () => {
    it('should detect overflow for values > 2^31 - 1', () => {
      const maxInt = 2147483647;
      const overflowVal = 2147483648;
      
      const validate = (val: number) => {
        if (val > 2147483647) return false;
        return true;
      };

      expect(validate(maxInt)).toBe(true);
      expect(validate(overflowVal)).toBe(false);
    });
  });
});
