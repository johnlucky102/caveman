import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Reports from '../Reports';
import { MemoryRouter } from 'react-router-dom';
import * as dashboardService from '@/services/dashboardService';

// Mocking components to avoid complex rendering
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
  CardHeader: ({ title }: any) => (
    <div data-testid="card-header">{title}</div>
  ),
}));

vi.mock('@/components/common/Select', () => ({
  default: ({ value, onChange, options }: any) => (
    <select value={value} onChange={(e) => onChange?.(e.target.value)} data-testid="month-select">
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ),
}));

vi.mock('@/components/common/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

// Mocking Auth Store
const mockRole = vi.fn().mockReturnValue('Admin');
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector?: any) => {
    const state = { role: mockRole() };
    return selector ? selector(state) : state;
  },
}));

// Mocking dashboardService
vi.mock('@/services/dashboardService', () => ({
  getFinancialSummary: vi.fn().mockResolvedValue({ data: null, error: null }),
  getFinancialOverview: vi.fn().mockResolvedValue({ data: null, error: null }),
  getDashboardStats: vi.fn().mockResolvedValue({ stats: null, error: null }),
}));

const renderPage = () => {
  return render(
    <MemoryRouter>
      <Reports />
    </MemoryRouter>
  );
};

describe('Reports Page Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole.mockReturnValue('Admin');

    // Default mock implementation for financial summary
    vi.mocked(dashboardService.getFinancialSummary).mockResolvedValue({
      data: {
        totalRevenue: 50000000,
        totalExpected: 75000000,
        paidCount: 25,
        pendingCount: 15,
        overdueCount: 5,
        inTermDebt: 15000000,
        overdueDebt: 10000000,
      },
      error: null,
    });

    vi.mocked(dashboardService.getFinancialOverview).mockResolvedValue({
      data: {
        teacherCount: 10,
        activeClassCount: 8,
        totalStudentCount: 120,
      },
      error: null,
    });
  });

  it('should render header and month selector', async () => {
    renderPage();

    expect(await screen.findByText('Trung tâm Báo cáo')).toBeDefined();
    expect(screen.getByTestId('month-select')).toBeDefined();
  });

  it('should show access denied for Teacher role', async () => {
    mockRole.mockReturnValue('Teacher');
    renderPage();

    expect(await screen.findByText('Truy cập bị hạn chế')).toBeDefined();
    expect(screen.getByText(/Bạn không có quyền xem báo cáo tài chính/i)).toBeDefined();
  });

  it('should render financial KPI cards for Admin', async () => {
    renderPage();

    // Wait for loading to finish and cards to appear
    await waitFor(() => {
      const statCards = screen.getAllByTestId('stat-card');
      expect(statCards.length).toBeGreaterThanOrEqual(4);
    });

    // Check for expected labels in StatCards
    const labels = screen.getAllByTestId('stat-label');
    const labelTexts = labels.map(l => l.textContent);
    expect(labelTexts).toContain('Tổng doanh thu dự kiến');
    expect(labelTexts).toContain('Doanh thu thực tế');
  });

  it('should show financial data for Accountant role', async () => {
    mockRole.mockReturnValue('Accountant');
    renderPage();

    await waitFor(() => {
      const statCards = screen.getAllByTestId('stat-card');
      expect(statCards.length).toBeGreaterThanOrEqual(4);
    });
  });
});
