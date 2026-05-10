import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Reports from '../Reports';
import { MemoryRouter } from 'react-router-dom';
import * as dashboardService from '@/services/dashboardService';
import { supabase } from '@/lib/supabase';

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

vi.mock('@/components/common/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

// Mocking Auth Store
const mockRole = vi.fn().mockReturnValue('Admin');
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ role: mockRole() }),
}));

// Mocking Supabase
const mockSupabaseResponse = {
  data: [],
  error: null,
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  then: vi.fn().mockImplementation(function(this: any, cb) {
    return Promise.resolve(cb({ data: this._data || [], error: null }));
  }),
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockImplementation(() => {
      const obj = { ...mockSupabaseResponse };
      return obj;
    }),
  },
}));

// Mocking dashboardService
vi.mock('@/services/dashboardService', () => ({
  getFinancialSummary: vi.fn().mockResolvedValue({ data: null, error: null }),
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
    
    // Default mock implementation
    vi.mocked(dashboardService.getDashboardStats).mockResolvedValue({
      stats: {
        totalStudents: 0,
        totalDebt: 0,
        attendanceToday: { present: 0, absent: 0, total: 0 },
        attendanceByClass: [],
        studentsByGrade: [],
      },
      error: null
    });
  });

  it('should render overview stats for Admin', async () => {
    vi.mocked(dashboardService.getDashboardStats).mockResolvedValue({
      stats: {
        totalStudents: 120,
        totalDebt: 15000000,
        attendanceToday: { present: 100, absent: 10, total: 110 },
        attendanceByClass: [],
        studentsByGrade: [],
      },
      error: null,
    });

    renderPage();

    // Use findByText which has built-in waitFor
    const statValue = await screen.findByText('120', {}, { timeout: 3000 });
    expect(statValue).toBeDefined();
    expect(await screen.findByText(/15.000.000/)).toBeDefined();
  });

  it('should hide financial tab for Teacher', async () => {
    mockRole.mockReturnValue('Teacher');
    renderPage();

    expect(screen.queryByText(/^Tài chính$/i)).toBeNull();
  });

  it('should switch tabs and load student data', async () => {
    const mockStudents = [
      { id: '1', full_name: 'Nguyen Van A', gender: 'Male', classes: { name: 'Mam A' } }
    ];
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      const obj: any = { ...mockSupabaseResponse };
      if (table === 'students') {
        obj.order = vi.fn().mockResolvedValue({ data: mockStudents, error: null });
      }
      return obj;
    });

    renderPage();

    const studentTab = screen.getByText(/^Học sinh$/i);
    fireEvent.click(studentTab);

    expect(await screen.findByText('Nguyen Van A')).toBeDefined();
  });

  it('should handle attendance report loading', async () => {
    const mockAttendance = [
      { attendance_date: '2023-10-01', status: 'present' },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      const obj: any = { ...mockSupabaseResponse };
      if (table === 'attendance') {
        obj.then = vi.fn().mockImplementation((cb) => Promise.resolve(cb({ data: mockAttendance, error: null })));
      }
      return obj;
    });

    renderPage();

    const attendanceTab = screen.getByText(/^Điểm danh$/i);
    fireEvent.click(attendanceTab);

    // Be flexible with date format (1/10/2023, 10/1/2023, etc)
    await waitFor(() => {
      const table = screen.getByTestId('data-table');
      expect(table.textContent).toContain('2023');
      expect(table.textContent).toContain('10');
      expect(table.textContent).toContain('1');
    });
  });
});
