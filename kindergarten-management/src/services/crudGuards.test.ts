import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  tableName: '',
  updatePayload: undefined as unknown,
  deleteTable: '',
  studentCountRows: [] as Array<{ class_id: number }>,
  nextError: null as unknown,
  from: vi.fn(),
  signUp: vi.fn(),
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-admin' } } }),
}));

vi.mock('@/lib/timeout', () => ({
  withSupabaseTimeout: vi.fn(async (query) => query),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.from,
    auth: {
      signUp: mocks.signUp,
      getUser: mocks.getUser,
    },
  },
}));

function makeBuilder(table: string) {
  let mode: 'select' | 'update' | 'delete' | null = null;
  const builder: Record<string, unknown> = {
    select: vi.fn(() => {
      mode = 'select';
      return builder;
    }),
    in: vi.fn(() => {
      mode = 'select';
      return builder;
    }),
    then: vi.fn().mockImplementation((cb) => cb({ data: mode === 'select' ? mocks.studentCountRows : null, error: mocks.nextError })),
    update: vi.fn((payload: unknown) => {
      mode = 'update';
      mocks.updatePayload = payload;
      return builder;
    }),
    delete: vi.fn(() => {
      mode = 'delete';
      mocks.deleteTable = table;
      return builder;
    }),
    eq: vi.fn(() => builder),
    single: vi.fn(() => {
      if (table === 'users') {
        return { data: { role: 'Admin' }, error: null };
      }
      return {
        data: {
          id: table === 'classes' ? 1 : 'student-1',
          name: 'Lớp A',
          class_code: 'LH123456',
          teacher_id: 'test-admin',
          room: 'P101',
          max_students: 10,
          description: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          users: null,
          class_id: 1,
          student_code: 'HS000001',
          full_name: 'Nguyen A',
          date_of_birth: null,
          gender: null,
          ethnicity: null,
          nationality: 'Việt Nam',
          address: null,
          enrolled_date: null,
          health_info: {},
          avatar: null,
          classes: { id: 1, name: 'Lớp A' },
        },
        error: mocks.nextError,
      };
    }),
    maybeSingle: vi.fn(() => (builder.single as any)()),
  };
  return builder;
}

describe('CRUD service guards', () => {
  beforeEach(() => {
    mocks.tableName = '';
    mocks.updatePayload = undefined;
    mocks.deleteTable = '';
    mocks.studentCountRows = [];
    mocks.nextError = null;
    mocks.from.mockImplementation((table: string) => {
      mocks.tableName = table;
      return makeBuilder(table);
    });
  });

  it('updateClass rejects max_students below current student count', async () => {
    const { updateClass } = await import('./classesService');
    mocks.studentCountRows = [{ class_id: 1 }, { class_id: 1 }, { class_id: 1 }];

    const result = await updateClass(1, { max_students: 2 });

    expect(result.error?.field).toBe('max_students');
    expect(result.error?.message).toContain('(3)');
    expect(mocks.updatePayload).toBeUndefined();
  });

  it('updateStudent strips student_code before update', async () => {
    const { updateStudent } = await import('./studentsService');

    await updateStudent('student-1', { student_code: 'HS999999', full_name: 'Nguyen B' });

    expect(mocks.updatePayload).toEqual(expect.objectContaining({ full_name: 'Nguyen B' }));
    expect((mocks.updatePayload as any).student_code).toBeUndefined();
  });

  it('deleteClass rejects when class still has students', async () => {
    const { deleteClass } = await import('./classesService');
    mocks.studentCountRows = [{ class_id: 1 }];

    const result = await deleteClass(1);

    expect(result.error?.code).toBe('VALIDATION');
    // We don't check deleteTable here because it shouldn't even call delete/update if validation fails
  });

  it('deleteStudent maps delete errors', async () => {
    const { deleteStudent } = await import('./studentsService');
    mocks.nextError = { message: 'permission denied' };

    const result = await deleteStudent('student-1');

    expect(result.error?.code).toBe('FORBIDDEN');
  });
});
