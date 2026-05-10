import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, X, Calculator } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import { useToast } from '@/components/common/Toast';
import { assignTeacherToClass, createClass, getClassById, removeTeacherFromClass, updateClass } from '@/services/classesService';
import { listTeachers } from '@/services/usersService';
import type { ClassTeacherRecord } from '@/types/domain';
import type { SelectOption } from '@/types';

interface FormState {
  name: string;
  teacher_id: string;
  max_students: string;
  room: string;
  description: string;
  class_type: 'Daycare' | 'Evening';
  meal_rate: string;
  cancel_rate: string;
  hospital_deduction_type: 'Fixed' | 'Daily';
  hospital_deduction_value: string;
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
    class_type: 'Daycare',
    meal_rate: '20000',
    cancel_rate: '50000',
    hospital_deduction_type: 'Fixed',
    hospital_deduction_value: '0',
  });
  const [studentCount, setStudentCount] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<SelectOption[]>([]);
  const [classTeachers, setClassTeachers] = useState<ClassTeacherRecord[]>([]);

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
        class_type: result.item.class_type || 'Daycare',
        meal_rate: String(result.item.meal_rate || 20000),
        cancel_rate: String(result.item.cancel_rate || 50000),
        hospital_deduction_type: result.item.hospital_deduction_type || 'Fixed',
        hospital_deduction_value: String(result.item.hospital_deduction_value || 0),
      });
      setClassTeachers(result.item.teachers || []);
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
      class_type: form.class_type,
      meal_rate: Number(form.meal_rate),
      cancel_rate: Number(form.cancel_rate),
      hospital_deduction_type: form.hospital_deduction_type,
      hospital_deduction_value: Number(form.hospital_deduction_value),
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

  const handleAddTeacher = async (teacherId: string, role: string) => {
    if (!isEditMode || !id) return;
    if (!teacherId) return;
    const res = await assignTeacherToClass(Number(id), teacherId, role);
    if (!res.error) {
       // Refresh
       const result = await getClassById(Number(id));
       if (result.item) setClassTeachers(result.item.teachers || []);
    } else {
       toast.error('Phân công thất bại', res.error.message);
    }
  };

  const handleRemoveTeacher = async (ctId: string) => {
    if (!confirm('Gỡ giáo viên này khỏi lớp?')) return;
    const res = await removeTeacherFromClass(ctId);
    if (!res.error) {
       setClassTeachers(prev => prev.filter(t => t.id !== ctId));
    }
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

          {isEditMode && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-[#1E293B]">Quản lý Giáo viên ({classTeachers.length})</label>
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                {classTeachers.map(ct => (
                  <div key={ct.id} className="flex items-center justify-between p-3 bg-muted/20">
                    <div>
                      <p className="text-sm font-medium text-foreground">{ct.teacher_name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{ct.role}</p>
                    </div>
                    <button type="button" onClick={() => handleRemoveTeacher(ct.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {classTeachers.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">Chưa có giáo viên phân công</div>}
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Select
                  placeholder="Chọn giáo viên"
                  options={teacherOptions.filter(o => !classTeachers.find(ct => ct.teacher_id === o.value))}
                  value=""
                  onChange={(v) => {
                    const role = prompt('Vai trò (Lead, Assistant, Nanny):', 'Assistant');
                    if (role) handleAddTeacher(v, role);
                  }}
                />
                <p className="text-[10px] text-muted-foreground flex items-center">
                  * Chọn giáo viên để phân công vai trò mới cho lớp này.
                </p>
              </div>
            </div>
          )}

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

          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Calculator className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-foreground">Cấu hình tài chính (Khấu trừ)</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Loại lớp học"
                value={form.class_type}
                onChange={(v) => setField('class_type', v as any)}
                options={[
                  { value: 'Daycare', label: 'Lớp Bán trú' },
                  { value: 'Evening', label: 'Lớp Tối' },
                ]}
                fullWidth
              />

              {form.class_type === 'Daycare' ? (
                <Input
                  label="Tiền cơm/ngày"
                  type="number"
                  value={form.meal_rate}
                  onChange={(e) => setField('meal_rate', e.target.value)}
                  hint="Trừ tiền cơm khi vắng mặt"
                  fullWidth
                />
              ) : (
                <Input
                  label="Tiền nghỉ/buổi"
                  type="number"
                  value={form.cancel_rate}
                  onChange={(e) => setField('cancel_rate', e.target.value)}
                  hint="Trừ tiền khi trung tâm cho nghỉ"
                  fullWidth
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Select
                label="Kiểu khấu trừ nằm viện"
                value={form.hospital_deduction_type}
                onChange={(v) => setField('hospital_deduction_type', v as any)}
                options={[
                  { value: 'Fixed', label: 'Số tiền cố định' },
                  { value: 'Daily', label: 'Tỷ lệ theo ngày công' },
                ]}
                fullWidth
              />
              <Input
                label={form.hospital_deduction_type === 'Fixed' ? 'Số tiền trừ/ngày' : 'Tỷ lệ trừ (%)'}
                type="number"
                value={form.hospital_deduction_value}
                onChange={(e) => setField('hospital_deduction_value', e.target.value)}
                hint={form.hospital_deduction_type === 'Fixed' ? 'VD: 100000' : 'VD: 100 (trừ 100%)'}
                fullWidth
              />
            </div>
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
