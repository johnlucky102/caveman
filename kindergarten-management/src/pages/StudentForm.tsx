import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="h-10 flex items-center px-3 rounded-xl bg-muted/30 border border-transparent text-sm font-medium text-foreground">
        {value || '—'}
      </div>
    </div>
  );
}

import { useToast } from '@/components/common/Toast';
import { DatePicker } from '@/components/common/DatePicker';
import { listClasses } from '@/services/classesService';
import { createStudent, getStudentById, updateStudent } from '@/services/studentsService';
import { useAuthStore } from '@/stores/authStore';
import { isTeacher } from '@/lib/rbac';
import type { SelectOption } from '@/types';
import type { CreateStudentInput } from '@/types/domain';

interface StudentFormData {
  student_code: string;
  full_name: string;
  date_of_birth: string;
  gender: 'Male' | 'Female' | '';
  ethnicity: string;
  address: string;
  class_id: string;
  enrolled_date: string;
  height: string;
  weight: string;
  blood_type: string;
  allergies: string;
}

interface FormErrors {
  full_name?: string;
  date_of_birth?: string;
  gender?: string;
  class_id?: string;
  enrolled_date?: string;
}

function defaultForm(): StudentFormData {
  return {
    student_code: '',
    full_name: '',
    date_of_birth: '',
    gender: '',
    ethnicity: '',
    address: '',
    class_id: '',
    enrolled_date: '',
    height: '',
    weight: '',
    blood_type: '',
    allergies: '',
  };
}

function validateForm(data: StudentFormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.full_name.trim()) errors.full_name = 'Họ tên là bắt buộc';
  if (!data.date_of_birth) errors.date_of_birth = 'Ngày sinh là bắt buộc';
  if (!data.gender) errors.gender = 'Giới tính là bắt buộc';
  if (!data.class_id) errors.class_id = 'Lớp học là bắt buộc';
  if (!data.enrolled_date) errors.enrolled_date = 'Ngày nhập học là bắt buộc';
  return errors;
}

const genderOptions: SelectOption[] = [
  { label: 'Chọn giới tính', value: '' },
  { label: 'Nam', value: 'Male' },
  { label: 'Nữ', value: 'Female' },
];

const bloodTypeOptions: SelectOption[] = [
  { label: 'Chọn nhóm máu', value: '' },
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'AB', value: 'AB' },
  { label: 'O', value: 'O' },
];

export default function StudentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { role } = useAuthStore();
  const isT = isTeacher(role);
  const isEditMode = Boolean(id && id !== 'new');

  const [formData, setFormData] = useState<StudentFormData>(defaultForm());
  const [classOptions, setClassOptions] = useState<SelectOption[]>([{ label: 'Chọn lớp học', value: '' }]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEditMode && role === 'Teacher') {
      toast.error('Truy cập bị chặn', 'Giáo viên không có quyền tạo hồ sơ học sinh mới.');
      navigate('/students');
      return;
    }
  }, [isEditMode, role, navigate, toast]);

  useEffect(() => {
    const loadOptions = async () => {
      const result = await listClasses({ page: 1, pageSize: 200, sortBy: 'name', sortDirection: 'asc' });
      if (result.error) {
        toast.error('Không tải được lớp học', result.error.message);
        return;
      }
      setClassOptions([
        { label: 'Chọn lớp học', value: '' },
        ...result.data.items.map((item) => ({ value: String(item.id), label: item.name })),
      ]);
    };
    void loadOptions();
  }, [toast]);

  useEffect(() => {
    if (!isEditMode || !id) return;
    const loadStudent = async () => {
      setLoading(true);
      const result = await getStudentById(id);
      setLoading(false);
      if (result.error || !result.item) {
        toast.error('Không tải được hồ sơ học sinh', result.error?.message || 'Không tìm thấy học sinh');
        navigate('/students');
        return;
      }

      const health = result.item.health_info || {};
      setFormData({
        student_code: result.item.student_code,
        full_name: result.item.full_name,
        date_of_birth: result.item.date_of_birth || '',
        gender: result.item.gender || '',
        ethnicity: result.item.ethnicity || '',
        address: result.item.address || '',
        class_id: String(result.item.class_id),
        enrolled_date: result.item.enrolled_date || '',
        height: typeof health.height === 'number' || typeof health.height === 'string' ? String(health.height) : '',
        weight: typeof health.weight === 'number' || typeof health.weight === 'string' ? String(health.weight) : '',
        blood_type: typeof health.blood_type === 'string' ? health.blood_type : '',
        allergies: typeof health.allergies === 'string' ? health.allergies : '',
      });
    };
    void loadStudent();
  }, [id, isEditMode, navigate, toast]);

  const studentCodePreview = useMemo(() => {
    if (isEditMode) return formData.student_code || 'Đang tải...';
    return 'Tự động tạo';
  }, [formData.student_code, isEditMode]);

  function handleChange<K extends keyof StudentFormData>(field: K, value: StudentFormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }


  function toPayload(data: StudentFormData): CreateStudentInput {
    return {
      class_id: Number(data.class_id),
      full_name: data.full_name.trim(),
      date_of_birth: data.date_of_birth || null,
      gender: data.gender || null,
      ethnicity: data.ethnicity || null,
      nationality: 'Việt Nam',
      address: data.address || null,
      enrolled_date: data.enrolled_date || null,
      avatar: null,
      health_info: {
        height: data.height ? Number(data.height) : null,
        weight: data.weight ? Number(data.weight) : null,
        blood_type: data.blood_type || null,
        allergies: data.allergies || null,
      },
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validateForm(formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    const payload = toPayload(formData);
    const result = isEditMode && id ? await updateStudent(id, payload, useAuthStore.getState().user?.id) : await createStudent(payload);
    setIsSaving(false);

    if (result.error) {
      toast.error(isEditMode ? 'Cập nhật học sinh thất bại' : 'Tạo học sinh thất bại', result.error.message);
      return;
    }

    toast.success(isEditMode ? 'Cập nhật học sinh thành công' : 'Tạo học sinh thành công');
    navigate('/students');
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/students')}>
          Quay lại
        </Button>
        <h1 className="text-lg font-bold text-[#1E293B] absolute left-1/2 -translate-x-1/2">
          {isEditMode ? (isT ? 'Cập nhật sức khỏe học sinh' : 'Chỉnh sửa học sinh') : 'Thêm học sinh mới'}
        </h1>
        <div className="w-24" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" aria-label="student-form">

        <Card header={<div className="font-semibold text-[#1E293B]">Thông tin cơ bản</div>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              {isT ? (
                <ReadOnlyField label="Họ và tên" value={formData.full_name} />
              ) : (
                <Input
                  label="Họ và tên"
                  name="full_name"
                  required
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  error={errors.full_name}
                  placeholder="Nhập họ và tên học sinh"
                />
              )}
            </div>



            {isT ? (
              <ReadOnlyField label="Ngày sinh" value={formData.date_of_birth ? new Date(formData.date_of_birth).toLocaleDateString('vi-VN') : ''} />
            ) : (
              <DatePicker
                label="Ngày sinh"
                date={formData.date_of_birth}
                setDate={(d) => handleChange('date_of_birth', d)}
                required
                error={errors.date_of_birth}
                clearable={false}
              />
            )}

            {isT ? (
              <ReadOnlyField label="Giới tính" value={genderOptions.find(o => o.value === formData.gender)?.label || ''} />
            ) : (
              <Select
                label="Giới tính"
                required
                value={formData.gender}
                onChange={(v) => handleChange('gender', v as 'Male' | 'Female' | '')}
                error={errors.gender}
                options={genderOptions}
              />
            )}

            {isT ? (
              <ReadOnlyField label="Dân tộc" value={formData.ethnicity} />
            ) : (
              <Input 
                label="Dân tộc" 
                name="ethnicity" 
                value={formData.ethnicity} 
                onChange={(e) => handleChange('ethnicity', e.target.value)} 
                placeholder="Ví dụ: Kinh" 
              />
            )}

            <div className="sm:col-span-2">
              {isT ? (
                <ReadOnlyField label="Địa chỉ" value={formData.address} />
              ) : (
                <Input 
                  label="Địa chỉ" 
                  name="address" 
                  value={formData.address} 
                  onChange={(e) => handleChange('address', e.target.value)} 
                  placeholder="Nhập địa chỉ thường trú" 
                />
              )}
            </div>
          </div>
        </Card>

        <Card header={<div className="font-semibold text-[#1E293B]">Thông tin lớp học</div>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isT ? (
              <ReadOnlyField label="Lớp học" value={classOptions.find(o => o.value === formData.class_id)?.label || ''} />
            ) : (
              <Select
                label="Lớp học"
                required
                value={formData.class_id}
                onChange={(v) => handleChange('class_id', v)}
                error={errors.class_id}
                options={classOptions}
              />
            )}

            {isT ? (
              <ReadOnlyField label="Ngày nhập học" value={formData.enrolled_date ? new Date(formData.enrolled_date).toLocaleDateString('vi-VN') : ''} />
            ) : (
              <DatePicker
                label="Ngày nhập học"
                date={formData.enrolled_date}
                setDate={(d) => handleChange('enrolled_date', d)}
                required
                error={errors.enrolled_date}
                clearable={false}
              />
            )}
          </div>
        </Card>

        <Card header={<div className="font-semibold text-[#1E293B]">Thông tin sức khỏe</div>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Chiều cao (cm)" type="number" min="50" max="200" value={formData.height} onChange={(e) => handleChange('height', e.target.value)} />
            <Input label="Cân nặng (kg)" type="number" min="5" max="100" value={formData.weight} onChange={(e) => handleChange('weight', e.target.value)} />
            <Select label="Nhóm máu" value={formData.blood_type} onChange={(v) => handleChange('blood_type', v)} options={bloodTypeOptions} />
            <div className="sm:col-span-2">
              <Input label="Dị ứng" value={formData.allergies} onChange={(e) => handleChange('allergies', e.target.value)} placeholder="Liệt kê dị ứng (nếu có)" />
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={() => navigate('/students')}>
            Hủy bỏ
          </Button>
          <Button type="submit" loading={isSaving || loading}>
            {isEditMode ? (isT ? 'Lưu thông tin sức khỏe' : 'Lưu thay đổi') : 'Tạo học sinh'}
          </Button>
        </div>
      </form>
    </div>
  );
}
