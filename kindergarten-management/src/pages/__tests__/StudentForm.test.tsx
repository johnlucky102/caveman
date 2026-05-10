import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StudentForm from '../StudentForm';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mocking toast
vi.mock('@/components/common/Toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mocking services
vi.mock('@/services/classesService', () => ({
  listClasses: vi.fn().mockResolvedValue({ data: { items: [{ id: 1, name: 'Class A' }] }, error: null }),
}));

vi.mock('@/services/studentsService', () => ({
  createStudent: vi.fn(),
  getStudentById: vi.fn().mockResolvedValue({ item: null, error: null }),
  updateStudent: vi.fn(),
}));

const renderForm = () => {
  return render(
    <MemoryRouter initialEntries={['/students/new']}>
      <Routes>
        <Route path="/students/:id" element={<StudentForm />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('StudentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the form', async () => {
    renderForm();
    expect(await screen.findByText('Thêm học sinh mới')).toBeDefined();
  });

  it('should show validation error on submit', async () => {
    renderForm();
    
    const submitBtn = await screen.findByRole('button', { name: /Tạo học sinh/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Họ tên là bắt buộc/i)).toBeDefined();
  });

  it('should trigger createStudent', async () => {
    const { createStudent } = await import('@/services/studentsService');
    vi.mocked(createStudent).mockResolvedValue({ item: { id: 's1' } as any, error: null });
    
    renderForm();

    const nameInput = await screen.findByLabelText(/Họ và tên/i);
    fireEvent.change(nameInput, { target: { value: 'Test Student' } });
    
    fireEvent.change(screen.getByLabelText(/Ngày sinh/i), { target: { value: '2020-01-01' } });
    fireEvent.change(screen.getByLabelText(/Giới tính/i), { target: { value: 'Male' } });
    fireEvent.change(screen.getByLabelText(/Lớp học/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Ngày nhập học/i), { target: { value: '2024-09-01' } });

    const submitBtn = screen.getByRole('button', { name: /Tạo học sinh/i });
    fireEvent.click(submitBtn);

    await vi.waitFor(() => {
      expect(createStudent).toHaveBeenCalled();
    });
  });
});
