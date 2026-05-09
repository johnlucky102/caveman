import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Avatar from '@/components/common/Avatar';
import { useToast } from '@/components/common/Toast';
import { listClasses } from '@/services/classesService';
import { createStudent, getStudentById, updateStudent } from '@/services/studentsService';
import type { SelectOption } from '@/types';
import type { CreateStudentInput } from '@/types/domain';

interface StudentFormData {
  avatar: string | null;
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
    avatar: null,
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
  const isEditMode = Boolean(id && id !== 'new');

  const [formData, setFormData] = useState<StudentFormData>(defaultForm());
  const [classOptions, setClassOptions] = useState<SelectOption[]>([{ label: 'Chọn lớp học', value: '' }]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);

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
        avatar: result.item.avatar,
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

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      handleChange('avatar', reader.result as string);
    };
    reader.readAsDataURL(file);
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
      avatar: data.avatar,
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
    const result = isEditMode && id ? await updateStudent(id, payload) : await createStudent(payload);
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
          {isEditMode ? 'Chỉnh sửa học sinh' : 'Thêm học sinh mới'}
        </h1>
        <div className="w-24" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar src={formData.avatar} name={formData.full_name || 'Học sinh'} size="xl" />
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-600 transition-colors shadow-md"
              >
                <Camera className="w-4 h-4 text-white" />
                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            <p className="text-sm text-[#64748B]">Nhấn vào biểu tượng máy ảnh để tải ảnh đại diện</p>
          </div>
        </Card>

        <Card header={<div className="font-semibold text-[#1E293B]">Thông tin cơ bản</div>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Họ và tên"
                name="full_name"
                required
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                error={errors.full_name}
                placeholder="Nhập họ và tên học sinh"
              />
            </div>



            <Input
              label="Ngày sinh"
              name="date_of_birth"
              required
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => handleChange('date_of_birth', e.target.value)}
              error={errors.date_of_birth}
            />

            <Select
              label="Giới tính"
              required
              value={formData.gender}
              onChange={(v) => handleChange('gender', v as 'Male' | 'Female' | '')}
              error={errors.gender}
              options={genderOptions}
            />

            <Input label="Dân tộc" name="ethnicity" value={formData.ethnicity} onChange={(e) => handleChange('ethnicity', e.target.value)} placeholder="Ví dụ: Kinh" />

            <div className="sm:col-span-2">
              <Input label="Địa chỉ" name="address" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} placeholder="Nhập địa chỉ thường trú" />
            </div>
          </div>
        </Card>

        <Card header={<div className="font-semibold text-[#1E293B]">Thông tin lớp học</div>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Lớp học"
              required
              value={formData.class_id}
              onChange={(v) => handleChange('class_id', v)}
              error={errors.class_id}
              options={classOptions}
            />

            <Input
              label="Ngày nhập học"
              name="enrolled_date"
              required
              type="date"
              value={formData.enrolled_date}
              onChange={(e) => handleChange('enrolled_date', e.target.value)}
              error={errors.enrolled_date}
            />
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
            {isEditMode ? 'Lưu thay đổi' : 'Tạo học sinh'}
          </Button>
        </div>
      </form>
    </div>
  );
}
