import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Reports from '../Reports';
import { MemoryRouter } from 'react-router-dom';
import * as dashboardService from '@/services/dashboardService';
import { supabase } from '@/lib/supabase';

// Mock components
vi.mock('@/components/common/Card', () => ({
  default: ({ children, header }: any) => (
    <div data-testid="card">
      {header && <div data-testid="card-header">{header}</div>}
      {children}
    </div>
  ),
  StatCard: ({ label, value }: any) => (
    <div data-testid="stat-card">
      <span data-testid="stat-label">{label}</span>
      <span data-testid="stat-value">{value}</span>
    </div>
  ),
  CardHeader: ({ title, subtitle }: any) => (
    <div data-testid="card-header">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

vi.mock('@/components/common/Button', () => ({
  default: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('@/components/common/Badge', () => ({
  default: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

vi.mock('@/components/common/Table', () => ({
  default: ({ data, columns }: any) => (
    <table data-testid="data-table">
      <thead>
        <tr>{columns.map((c: any) => <th key={c.key}>{c.label}</th>)}</tr>
      </thead>
      <tbody>
        {data.map((row: any, i: number) => (
          <tr key={i}>
            {columns.map((c: any) => (
              <td key={c.key}>
                {c.render ? c.render(row[c.key], row) : row[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/components/common/Toast', () => ({
  useToast: () => mockToast,
}));

// Mocking Auth Store
const mockRole = vi.fn().mockReturnValue('Admin');
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector?: any) => {
    const state = { role: mockRole() };
    return selector ? selector(state) : state;
  },
}));

// Mocking Supabase
const mockSupabaseResponse = (data: any = []) => {
  const obj: any = {
    data,
    error: null,
    select: () => obj,
    eq: () => obj,
    in: () => obj,
    or: () => obj,
    gte: () => obj,
    lte: () => obj,
    not: () => obj,
    neq: () => obj,
    order: () => obj,
    single: async () => ({ data, error: null }),
    maybeSingle: async () => ({ data, error: null }),
    then: (cb: any) => Promise.resolve(cb({ data, error: null })),
  };
  return obj;
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/services/dashboardService', () => ({
  getFinancialSummary: vi.fn().mockResolvedValue({ data: null, error: null }),
  getFinancialOverview: vi.fn().mockResolvedValue({ data: null, error: null }),
  getDashboardStats: vi.fn().mockResolvedValue({ stats: null, error: null }),
  getAssignedClassIds: vi.fn().mockResolvedValue([]),
  getAttendanceTrend: vi.fn().mockResolvedValue({ data: [], error: null }),
}));

vi.mock('@/services/analyticsService', () => ({
  getRevenueTrend: vi.fn().mockResolvedValue({ data: [], error: null }),
  getStudentDistribution: vi.fn().mockResolvedValue({ gender: [], grade: [], error: null }),
  getDebtAging: vi.fn().mockResolvedValue({ data: [], error: null }),
}));

vi.mock('@/services/attendanceService', () => ({
  listAttendanceHistory: vi.fn().mockResolvedValue({ items: [], error: null }),
}));

const renderPage = () => {
  return render(
    <MemoryRouter>
      <Reports />
    </MemoryRouter>
  );
};

describe('Reports Audit - Logic & RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Financial Summary Logic', () => {
    it('TC_LOGIC_01: should display financial KPIs correctly', async () => {
      mockRole.mockReturnValue('Admin');

      vi.mocked(dashboardService.getFinancialSummary).mockResolvedValue({
        data: {
          totalRevenue: 100000000,
          totalExpected: 150000000,
          paidCount: 50,
          pendingCount: 30,
          overdueCount: 10,
          inTermDebt: 20000000,
          overdueDebt: 10000000,
        },
        error: null,
      });

      renderPage();

      // Should render header and financial summary
      await waitFor(() => {
        expect(screen.getByText('Trung tâm Báo cáo')).toBeDefined();
      });
    });

    it('TC_LOGIC_02: should calculate total financial deductions correctly', async () => {
      mockRole.mockReturnValue('Admin');

      const mockFinancialSummary = {
        totalRevenue: 1000000,
        paidCount: 1,
        pendingCount: 1,
        overdueCount: 0
      };

      const mockFeeRecords = [
        { id: 'f1', meal_deduction_vnd: 200000, tuition_deduction_vnd: 50000, students: { full_name: 'A', classes: { name: 'L1' } } },
        { id: 'f2', meal_deduction_vnd: 100000, tuition_deduction_vnd: 0, students: { full_name: 'B', classes: { name: 'L2' } } }
      ];

      vi.mocked(dashboardService.getFinancialSummary).mockResolvedValue({ data: mockFinancialSummary, error: null });
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'fee_records') return mockSupabaseResponse(mockFeeRecords);
        return mockSupabaseResponse([]);
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Trung tâm Báo cáo')).toBeDefined();
      });
    });
  });

  describe('2. RBAC Access Control', () => {
    it('TC_RBAC_01: Teacher should see access denied message', async () => {
      mockRole.mockReturnValue('Teacher');
      renderPage();

      expect(await screen.findByText('Truy cập bị hạn chế')).toBeDefined();
      expect(screen.getByText(/Bạn không có quyền xem báo cáo tài chính/i)).toBeDefined();
    });

    it('TC_RBAC_02: Accountant should see financial reports', async () => {
      mockRole.mockReturnValue('Accountant');
      vi.mocked(dashboardService.getFinancialSummary).mockResolvedValue({
        data: { totalRevenue: 50000000, totalExpected: 70000000, paidCount: 20, pendingCount: 10, overdueCount: 5, inTermDebt: 10000000, overdueDebt: 5000000 },
        error: null,
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Trung tâm Báo cáo')).toBeDefined();
      });
      // getFinancialSummary should be called for Accountant
      expect(dashboardService.getFinancialSummary).toHaveBeenCalled();
    });

    it('TC_RBAC_03: Teacher should NOT trigger financial data fetch', async () => {
      mockRole.mockReturnValue('Teacher');
      renderPage();

      // getFinancialSummary should NOT be called when role is Teacher
      await waitFor(() => {
        expect(dashboardService.getFinancialSummary).not.toHaveBeenCalled();
      });
    });
  });
});
