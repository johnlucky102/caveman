import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import { useToast } from '@/components/common/Toast';
import { createClass, getClassById, updateClass } from '@/services/classesService';
import { listTeachers } from '@/services/usersService';
import type { SelectOption } from '@/types';

interface FormState {
  name: string;
  teacher_id: string;
  max_students: string;
  room: string;
  description: string;
}

interface FormErrors {
  name?: string;
  room?: string;
  max_students?: string;
}

function validate(form: FormState, studentCount: number): FormErrors {
  const errors: FormErrors = {};
  const maxStudents = Number(form.max_students);
  if (!form.name.trim()) errors.name = 'Tên lớp học không được để trống';
  if (!form.room.trim()) errors.room = 'Số phòng không được để trống';
  if (!form.max_students || maxStudents < 1) errors.max_students = 'Sĩ số tối đa phải lớn hơn 0';
  if (maxStudents < studentCount) errors.max_students = `Sĩ số tối đa không được nhỏ hơn số học sinh hiện tại (${studentCount})`;
  return errors;
}

export default function ClassForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditMode = Boolean(id && id !== 'new');

  const [form, setForm] = useState<FormState>({
    name: '',
    teacher_id: '',
    max_students: '30',
    room: '',
    description: '',
  });
  const [studentCount, setStudentCount] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<SelectOption[]>([{ label: 'Chưa phân công', value: '' }]);

  useEffect(() => {
    const loadOptions = async () => {
      const teachersResult = await listTeachers();
      if (teachersResult.error) toast.error('Không tải được giáo viên', teachersResult.error.message);
      setTeacherOptions([
        { label: 'Chưa phân công', value: '' },
        ...teachersResult.items.map((item) => ({ value: item.id, label: item.full_name })),
      ]);
    };
    void loadOptions();
  }, [toast]);

  useEffect(() => {
    if (!isEditMode || !id) return;
    const loadClass = async () => {
      setLoading(true);
      const result = await getClassById(Number(id));
      setLoading(false);

      if (result.error || !result.item) {
        toast.error('Không tải được lớp học', result.error?.message || 'Không tìm thấy lớp học');
        navigate('/classes');
        return;
      }

      setStudentCount(result.item.student_count);
      setForm({
        name: result.item.name,
        teacher_id: result.item.teacher_id || '',
        max_students: String(result.item.max_students),
        room: result.item.room || '',
        description: result.item.description || '',
      });
    };
    void loadClass();
  }, [id, isEditMode, navigate, toast]);

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate(form, studentCount);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      teacher_id: form.teacher_id || null,
      max_students: Number(form.max_students),
      room: form.room.trim(),
      description: form.description.trim() || null,
    };

    const result = isEditMode && id ? await updateClass(Number(id), payload) : await createClass(payload);
    setSaving(false);

    if (result.error) {
      toast.error(isEditMode ? 'Cập nhật lớp học thất bại' : 'Tạo lớp học thất bại', result.error.message);
      if (result.error.field === 'max_students') setErrors((prev) => ({ ...prev, max_students: result.error?.message }));
      return;
    }

    toast.success(isEditMode ? 'Cập nhật lớp học thành công' : 'Tạo lớp học thành công');
    navigate('/classes');
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/classes')}>
          Quay lại
        </Button>
        <h1 className="text-xl font-bold text-[#1E293B]">{isEditMode ? 'Chỉnh sửa lớp học' : 'Thêm lớp học mới'}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="space-y-5">
          <Input label="Tên lớp học" name="name" value={form.name} onChange={(e) => setField('name', e.target.value)} error={errors.name} required fullWidth />

          <Select
            label="Giáo viên chủ nhiệm"
            options={teacherOptions}
            value={form.teacher_id}
            onChange={(value) => setField('teacher_id', value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Số phòng" name="room" value={form.room} onChange={(e) => setField('room', e.target.value)} error={errors.room} required fullWidth />
            <Input
              label="Sĩ số tối đa"
              name="max_students"
              type="number"
              min={Math.max(1, studentCount)}
              max={50}
              value={form.max_students}
              onChange={(e) => setField('max_students', e.target.value)}
              error={errors.max_students}
              hint={isEditMode ? `Hiện có ${studentCount} học sinh` : undefined}
              required
              fullWidth
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#1E293B]">Mô tả</label>
            <textarea
              rows={3}
              placeholder="Mô tả thêm về lớp học (tùy chọn)"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => navigate('/classes')}>
              Hủy
            </Button>
            <Button type="submit" leftIcon={<Save className="w-4 h-4" />} loading={saving || loading}>
              {isEditMode ? 'Lưu thay đổi' : 'Thêm lớp học'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
