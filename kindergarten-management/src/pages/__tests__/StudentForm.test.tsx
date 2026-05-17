import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('should allow entering student name', async () => {
    renderForm();

    // Find the name input by its label
    const nameInput = await screen.findByLabelText(/Họ và tên/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Test Student' } });

    expect(nameInput.value).toBe('Test Student');
  });
});
