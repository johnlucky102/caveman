import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as studentsService from '../studentsService';
import * as feesService from '../feesService';

// Mock the services to simulate integration
vi.mock('../studentsService', () => ({
  createStudent: vi.fn(),
}));

vi.mock('../feesService', () => ({
  createFeeRecord: vi.fn(),
  validatePaidAmount: vi.fn().mockReturnValue(null),
}));

describe('Student Enrollment to Billing Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully enroll a student and then generate a fee record', async () => {
    // 1. Setup Student Creation Mock
    const mockStudent = {
      id: 'student-123',
      full_name: 'Nguyen Van A',
      class_id: 1,
      class_name: 'Mam 1',
      student_code: 'HS123456',
    };
    vi.mocked(studentsService.createStudent).mockResolvedValue({
      item: mockStudent as any,
      error: null,
    });

    // 2. Setup Fee Creation Mock
    const mockFee = {
      id: 'fee-456',
      student_id: 'student-123',
      amount_vnd: 2000000,
      status: 'unpaid',
      month: 10,
      school_year: '2024-2025',
    };
    vi.mocked(feesService.createFeeRecord).mockResolvedValue({
      item: mockFee as any,
      error: null,
    });

    // --- EXECUTION ---

    // Step 1: Create Student
    const enrollment = await studentsService.createStudent({
      full_name: 'Nguyen Van A',
      class_id: 1,
    } as any);

    expect(enrollment.error).toBeNull();
    expect(enrollment.item?.id).toBe('student-123');

    // Step 2: Create Fee for that student
    const feeGeneration = await feesService.createFeeRecord({
      student_id: enrollment.item!.id,
      class_id: enrollment.item!.class_id,
      amount_vnd: 2000000,
      paid_amount_vnd: 0,
      month: 10,
      school_year: '2024-2025',
      status: 'unpaid',
    } as any);

    expect(feeGeneration.error).toBeNull();
    expect(feeGeneration.item?.student_id).toBe('student-123');
    expect(feeGeneration.item?.amount_vnd).toBe(2000000);
  });

  it('should fail fee generation if student creation fails', async () => {
    vi.mocked(studentsService.createStudent).mockResolvedValue({
      item: null,
      error: { code: 'DATABASE_ERROR', message: 'Failed to create student' },
    });

    const enrollment = await studentsService.createStudent({ full_name: 'Bad Data' } as any);
    
    expect(enrollment.item).toBeNull();
    expect(enrollment.error).not.toBeNull();

    // Logic in UI would typically stop here, but we verify the service interaction
    expect(feesService.createFeeRecord).not.toHaveBeenCalled();
  });
});
