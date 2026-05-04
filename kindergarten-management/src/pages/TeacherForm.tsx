import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Avatar from '../components/common/Avatar';
import type { Teacher, TeacherStatus, Class } from '../types';

// ─── Mock Data ─────────────────────────────────────────────────────────────

const mockClasses: Class[] = [
  { id: 'c1', name: 'Lớp Lá A', grade_level: 'Lá', teacher_id: 't1', capacity: 30, current_count: 28, room: 'P.101', status: 'active', created_at: '', updated_at: '' },
  { id: 'c2', name: 'Lớp Lá B', grade_level: 'Lá', teacher_id: 't2', capacity: 30, current_count: 25, room: 'P.102', status: 'active', created_at: '', updated_at: '' },
  { id: 'c3', name: 'Lớp Chồi A', grade_level: 'Chồi', teacher_id: 't3', capacity: 28, current_count: 27, room: 'P.201', status: 'active', created_at: '', updated_at: '' },
  { id: 'c4', name: 'Lớp Chồi B', grade_level: 'Chồi', teacher_id: 't4', capacity: 28, current_count: 24, room: 'P.202', status: 'active', created_at: '', updated_at: '' },
  { id: 'c5', name: 'Lớp Mầm A', grade_level: 'Mầm', teacher_id: 't5', capacity: 25, current_count: 23, room: 'P.301', status: 'active', created_at: '', updated_at: '' },
  { id: 'c6', name: 'Lớp Mầm B', grade_level: 'Mầm', teacher_id: 't6', capacity: 25, current_count: 22, room: 'P.302', status: 'active', created_at: '', updated_at: '' },
];

const mockTeachers: Teacher[] = [
  { id: 't1', full_name: 'Phạm Thu Hương', email: 'huong.pham@kidgarden.vn', phone: '0901 234 567', status: 'active', hire_date: '2020-09-01', specialization: 'Mầm non', avatar_url: null, created_at: '', updated_at: '' },
  { id: 't2', full_name: 'Nguyễn Thị Mai', email: 'mai.nguyen@kidgarden.vn', phone: '0912 345 678', status: 'active', hire_date: '2019-06-15', specialization: 'Âm nhạc', avatar_url: null, created_at: '', updated_at: '' },
  { id: 't3', full_name: 'Trần Văn Hùng', email: 'hung.tran@kidgarden.vn', phone: '0923 456 789', status: 'on_leave', hire_date: '2021-01-10', specialization: 'Thể chất', avatar_url: null, created_at: '', updated_at: '' },
  { id: 't4', full_name: 'Lê Thị Bình', email: 'binh.le@kidgarden.vn', phone: '0934 567 890', status: 'active', hire_date: '2018-09-01', specialization: 'Mỹ thuật', avatar_url: null, created_at: '', updated_at: '' },
  { id: 't5', full_name: 'Hoàng Thu Trang', email: 'trang.hoang@kidgarden.vn', phone: '0945 678 901', status: 'active', hire_date: '2022-09-01', specialization: 'Tiếng Anh', avatar_url: null, created_at: '', updated_at: '' },
  { id: 't6', full_name: 'Vũ Thị Lan', email: 'lan.vu@kidgarden.vn', phone: '0956 789 012', status: 'inactive', hire_date: '2021-09-01', specialization: 'Toán tư duy', avatar_url: null, created_at: '', updated_at: '' },
];

// ─── Options ────────────────────────────────────────────────────────────────

const genderOptions = [
  { label: 'Nam', value: 'male' },
  { label: 'Nữ', value: 'female' },
];

const statusOptions = [
  { label: 'Đang làm việc', value: 'active' },
  { label: 'Nghỉ phép', value: 'on_leave' },
  { label: 'Nghỉ việc', value: 'inactive' },
];

const degreeOptions = [
  { label: 'Cao đẳng', value: 'college' },
  { label: 'Đại học', value: 'university' },
  { label: 'Thạc sĩ', value: 'master' },
  { label: 'Tiến sĩ', value: 'phd' },
];

const classOptions = mockClasses.map((c) => ({
  label: `${c.name} (${c.room})`,
  value: c.id,
}));

// ─── Form State ─────────────────────────────────────────────────────────────

interface FormState {
  avatar_url: string;
  teacher_code: string;
  full_name: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  phone: string;
  email: string;
  address: string;
  qualifications: string;
  specialization: string;
  assigned_classes: string[];
  hire_date: string;
  status: TeacherStatus;
}

interface FormErrors {
  teacher_code?: string;
  full_name?: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  email?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function TeacherForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEditMode = id && id !== 'new';
  const existingTeacher = isEditMode ? mockTeachers.find((t) => t.id === id) : null;

  const [form, setForm] = useState<FormState>({
    avatar_url: existingTeacher?.avatar_url ?? '',
    teacher_code: '',
    full_name: existingTeacher?.full_name ?? '',
    date_of_birth: '',
    gender: 'female',
    phone: existingTeacher?.phone ?? '',
    email: existingTeacher?.email ?? '',
    address: '',
    qualifications: '',
    specialization: existingTeacher?.specialization ?? '',
    assigned_classes: [],
    hire_date: existingTeacher?.hire_date ?? '',
    status: (existingTeacher?.status ?? 'active') as TeacherStatus,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const set = (field: keyof FormState) => (value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((e) => ({ ...e, [field]: undefined }));
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
        set('avatar_url')(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
    set('avatar_url')('');
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.teacher_code.trim()) newErrors.teacher_code = 'Mã giáo viên không được để trống';
    if (!form.full_name.trim()) newErrors.full_name = 'Họ tên không được để trống';
    if (!form.date_of_birth) newErrors.date_of_birth = 'Ngày sinh không được để trống';
    if (!form.gender) newErrors.gender = 'Vui lòng chọn giới tính';
    if (!form.phone.trim()) newErrors.phone = 'Số điện thoại không được để trống';
    if (!form.email.trim()) newErrors.email = 'Email không được để trống';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Email không hợp lệ';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    navigate('/teachers');
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/teachers')}>
          Quay lại
        </Button>
        <h1 className="text-xl font-bold text-[#1E293B]">
          {isEditMode ? 'Chỉnh sửa giáo viên' : 'Thêm giáo viên mới'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar
                src={avatarPreview || form.avatar_url}
                name={form.full_name || 'GV'}
                size="xl"
              />
              {avatarPreview && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  aria-label="Xóa ảnh"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <label className="mt-3">
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <div className="flex items-center gap-2 px-4 py-2 bg-[#F1F5F9] text-[#64748B] rounded-lg cursor-pointer hover:bg-[#E2E8F0] transition-colors text-sm">
                <Upload className="w-4 h-4" />
                Tải ảnh lên
              </div>
            </label>
          </div>

          {/* Teacher Code */}
          <Input
            label="Mã giáo viên"
            placeholder="VD: GV001"
            value={form.teacher_code}
            onChange={(e) => set('teacher_code')(e.target.value)}
            error={errors.teacher_code}
            required
            fullWidth
          />

          {/* Full Name */}
          <Input
            label="Họ và tên"
            placeholder="VD: Nguyễn Văn A"
            value={form.full_name}
            onChange={(e) => set('full_name')(e.target.value)}
            error={errors.full_name}
            required
            fullWidth
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date of Birth */}
            <Input
              label="Ngày sinh"
              type="date"
              value={form.date_of_birth}
              onChange={(e) => set('date_of_birth')(e.target.value)}
              error={errors.date_of_birth}
              required
              fullWidth
            />

            {/* Gender */}
            <Select
              label="Giới tính"
              options={genderOptions}
              value={form.gender}
              onChange={set('gender')}
              error={errors.gender}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone */}
            <Input
              label="Số điện thoại"
              type="tel"
              placeholder="VD: 0901 234 567"
              value={form.phone}
              onChange={(e) => set('phone')(e.target.value)}
              error={errors.phone}
              required
              fullWidth
            />

            {/* Email */}
            <Input
              label="Email"
              type="email"
              placeholder="VD: teacher@kidgarden.vn"
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
              error={errors.email}
              required
              fullWidth
            />
          </div>

          {/* Address */}
          <Input
            label="Địa chỉ"
            placeholder="VD: 123 Nguyễn Trãi, Quận 1, TP.HCM"
            value={form.address}
            onChange={(e) => set('address')(e.target.value)}
            fullWidth
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Degree */}
            <Select
              label="Bằng cấp"
              options={degreeOptions}
              value={form.qualifications}
              onChange={set('qualifications')}
            />

            {/* Specialization */}
            <Input
              label="Chuyên môn"
              placeholder="VD: Mầm non, Âm nhạc..."
              value={form.specialization}
              onChange={(e) => set('specialization')(e.target.value)}
              fullWidth
            />
          </div>

          {/* Assigned Classes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#1E293B]">Lớp phụ trách</label>
            <div className="flex flex-wrap gap-2">
              {classOptions.map((opt) => {
                const isSelected = form.assigned_classes.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        set('assigned_classes')(form.assigned_classes.filter((c) => c !== opt.value));
                      } else {
                        set('assigned_classes')([...form.assigned_classes, opt.value]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      isSelected
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Hire Date */}
            <Input
              label="Ngày tuyển dụng"
              type="date"
              value={form.hire_date}
              onChange={(e) => set('hire_date')(e.target.value)}
              fullWidth
            />

            {/* Status */}
            <Select
              label="Trạng thái"
              options={statusOptions}
              value={form.status}
              onChange={set('status')}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => navigate('/teachers')}>
              Hủy
            </Button>
            <Button type="submit" leftIcon={<Save className="w-4 h-4" />} loading={saving}>
              {isEditMode ? 'Lưu thay đổi' : 'Thêm giáo viên'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
