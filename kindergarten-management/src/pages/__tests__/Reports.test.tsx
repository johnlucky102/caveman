import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Reports from '../Reports';
import { MemoryRouter } from 'react-router-dom';
import * as dashboardService from '@/services/dashboardService';

// Mocking components
vi.mock('@/components/common/Card', () => ({
  default: ({ children, header }: any) => (
    <div data-testid="card">
      {header && <div data-testid="card-header">{header}</div>}
      {children}
    </div>
  ),
  StatCard: ({ label, value }: any) => (
    <div data-testid="stat-card">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
  CardHeader: ({ title }: any) => (
    <div data-testid="card-header">{title}</div>
  ),
}));

vi.mock('@/components/common/Button', () => ({
  default: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('@/components/common/Badge', () => ({
  default: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/common/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

// Mocking services
vi.mock('@/services/dashboardService', () => ({
  getFinancialSummary: vi.fn(),
  getDashboardStats: vi.fn().mockResolvedValue({ stats: null, error: null }),
}));

const renderPage = () => {
  return render(
    <MemoryRouter>
      <Reports />
    </MemoryRouter>
  );
};

describe('Reports Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the reports page structure', async () => {
    vi.mocked(dashboardService.getDashboardStats).mockResolvedValue({
      stats: {
        totalStudents: 100,
        totalDebt: 5000000,
        attendanceToday: { present: 80, absent: 5, total: 85 },
        attendanceByClass: [],
        studentsByGrade: [],
      },
      error: null,
    });

    renderPage();
    expect(screen.getByText(/^Báo cáo$/i)).toBeDefined();
    expect(screen.getByText(/Tổng quan tài chính/i)).toBeDefined();
  });

  it('should display financial metrics', async () => {
    vi.mocked(dashboardService.getFinancialSummary).mockResolvedValue({
      data: {
        totalRevenue: 12345678,
        paidCount: 10,
        pendingCount: 5,
        overdueCount: 2,
      },
      error: null
    });

    renderPage();
    
    // Click Finance tab
    const financeTab = screen.getByRole('button', { name: /^Tài chính$/i });
    fireEvent.click(financeTab);

    await waitFor(() => {
      expect(screen.getByText(/12.345.678 đ/)).toBeDefined();
    });
  });
});
