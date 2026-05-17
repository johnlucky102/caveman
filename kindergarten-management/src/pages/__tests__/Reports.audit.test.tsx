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

  describe('1. Logic Calculations', () => {
    it('TC_LOGIC_01: should calculate 30-day attendance rate correctly (50%)', async () => {
      mockRole.mockReturnValue('Admin');
      
      const mockStudents = [{ id: 's1', full_name: 'Nguyen Van A', gender: 'Male', classes: { name: 'Mam A' } }];
      const today = new Date().toISOString().split('T')[0];
      const mockAttendance = [
        { student_id: 's1', status: 'present', attendance_date: today },
        { student_id: 's1', status: 'absent', attendance_date: today },
        { student_id: 's1', status: 'present', attendance_date: today },
        { student_id: 's1', status: 'absent', attendance_date: today },
      ];

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'students') return mockSupabaseResponse(mockStudents);
        if (table === 'attendance') return mockSupabaseResponse(mockAttendance);
        return mockSupabaseResponse([]);
      });

      renderPage();
      fireEvent.click(screen.getByText(/^Học sinh$/i));

      // Wait for table to render calculations
      await waitFor(() => {
        const table = screen.getByTestId('data-table');
        // Nguyen Van A has 2 present out of 4 total = 50%
        expect(table.textContent).toContain('50%');
      });
    });

    it('TC_LOGIC_02: should calculate total financial deductions correctly', async () => {
      mockRole.mockReturnValue('Admin');
      
      const mockFinancialSummary = {
        totalRevenue: 1000000,
        totalExpected: 1000000,
        paidCount: 1,
        pendingCount: 1,
        overdueCount: 0,
        inTermDebt: 0,
        overdueDebt: 0
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
      fireEvent.click(screen.getByText(/^Tài chính$/i));

      // Total meal deduction: 200k + 100k = 300k
      // Total other deduction: 50k + 0 = 50k
      // Total: 350k
      await waitFor(() => {
        expect(screen.getByTestId('total-deduction').textContent).toContain('350.000');
        expect(screen.getByTestId('meal-deduction').textContent).toContain('300.000');
        expect(screen.getByTestId('other-deduction').textContent).toContain('50.000');
      }, { timeout: 3000 });
    });
  });

  describe('2. RBAC Access Control', () => {
    it('TC_RBAC_01: Teacher should NOT see the Financial tab', async () => {
      mockRole.mockReturnValue('Teacher');
      renderPage();

      expect(screen.queryByText(/^Tài chính$/i)).toBeNull();
    });

    it('TC_RBAC_02: Accountant should see all tabs including Financial', async () => {
      mockRole.mockReturnValue('Accountant');
      renderPage();

      expect(screen.getByText(/^Tổng quan$/i)).toBeDefined();
      expect(screen.getByText(/^Học sinh$/i)).toBeDefined();
      expect(screen.getByText(/^Điểm danh$/i)).toBeDefined();
      expect(screen.getByText(/^Tài chính$/i)).toBeDefined();
    });

    it('TC_RBAC_03: Redirect to Overview if Teacher attempts to access Financial tab (simulated)', async () => {
      // Note: We can't easily simulate state change if UI hides the button,
      // but we can test the useEffect logic that resets activeTab if role changes or unauthorized.
      
      // We'll test if getFinancialSummary is NOT called when role is Teacher
      mockRole.mockReturnValue('Teacher');
      renderPage();
      
      // Overview is default, so getDashboardStats should be called
      expect(dashboardService.getDashboardStats).toHaveBeenCalled();
      // getFinancialSummary should NOT be called
      expect(dashboardService.getFinancialSummary).not.toHaveBeenCalled();
    });
  });
});
