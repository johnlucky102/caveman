import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Avatar from '@/components/common/Avatar';
import { useToast } from '@/components/common/Toast';
import { createTeacherProfile, getTeacherById, updateTeacherProfile } from '@/services/usersService';

interface FormState {
  avatar: string | null;
  full_name: string;
  phone: string;
  email: string;
  gender: 'Male' | 'Female' | 'Other';
  date_of_birth: string;
  address: string;
  qualification: string;
  start_date: string;
  status: 'Active' | 'Inactive' | 'Resigned';
}

interface FormErrors {
  full_name?: string;
  phone?: string;
  email?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.full_name.trim()) errors.full_name = 'Họ tên không được để trống';
  if (!form.phone.trim()) errors.phone = 'Số điện thoại không được để trống';
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email không hợp lệ';
  return errors;
}

export default function TeacherForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditMode = Boolean(id && id !== 'new');

  const [form, setForm] = useState<FormState>({
    avatar: null,
    full_name: '',
    phone: '',
    email: '',
    gender: 'Female',
    date_of_birth: '',
    address: '',
    qualification: '',
    start_date: '',
    status: 'Active',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEditMode || !id) return;
    const loadTeacher = async () => {
      setLoading(true);
      const result = await getTeacherById(id);
      setLoading(false);
      if (result.error || !result.item) {
        toast.error('Không tải được giáo viên', result.error?.message || 'Không tìm thấy giáo viên');
        navigate('/teachers');
        return;
      }
      setForm({
        avatar: result.item.avatar,
        full_name: result.item.full_name,
        phone: result.item.phone || '',
        email: result.item.email || '',
        gender: (result.item.gender as any) || 'Female',
        date_of_birth: result.item.date_of_birth || '',
        address: result.item.address || '',
        qualification: result.item.qualification || '',
        start_date: result.item.start_date || '',
        status: (result.item.status as any) || 'Active',
      });
    };
    void loadTeacher();
  }, [id, isEditMode, navigate, toast]);

  const setField = (field: keyof FormState, value: string | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setField('avatar', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate(form);
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      avatar: form.avatar,
      gender: form.gender,
      date_of_birth: form.date_of_birth,
      address: form.address,
      qualification: form.qualification,
      start_date: form.start_date,
      status: form.status,
    };
    const result = await updateTeacherProfile(id, payload);
    setSaving(false);

    if (result.error) {
      toast.error('Cập nhật hồ sơ thất bại', result.error.message);
      return;
    }

    toast.success('Cập nhật hồ sơ thành công');
    navigate('/teachers');
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/teachers')}>
          Quay lại
        </Button>
        <h1 className="text-xl font-bold text-[#1E293B]">Hồ sơ giáo viên</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="space-y-5">
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar src={form.avatar} name={form.full_name || 'GV'} size="xl" />
              {form.avatar && (
                <button
                  type="button"
                  onClick={() => setField('avatar', null)}
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



          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Họ và tên"
              value={form.full_name}
              onChange={(e) => setField('full_name', e.target.value)}
              error={errors.full_name}
              required
              fullWidth
            />
            <Select
              label="Giới tính"
              value={form.gender}
              onChange={(v) => setField('gender', v)}
              options={[
                { label: 'Nam', value: 'Male' },
                { label: 'Nữ', value: 'Female' },
                { label: 'Khác', value: 'Other' },
              ]}
              fullWidth
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Ngày sinh"
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setField('date_of_birth', e.target.value)}
              fullWidth
            />
            <Input
              label="Số điện thoại"
              type="tel"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              error={errors.phone}
              required
              fullWidth
            />
          </div>

          <Input
            label="Email tài khoản"
            type="email"
            value={form.email}
            disabled
            hint="Liên kết với tài khoản hệ thống"
            fullWidth
          />

          <Input
            label="Địa chỉ thường trú"
            value={form.address}
            onChange={(e) => setField('address', e.target.value)}
            fullWidth
          />

          <Input
            label="Bằng cấp / Chuyên môn"
            value={form.qualification}
            onChange={(e) => setField('qualification', e.target.value)}
            placeholder="VD: Cử nhân Giáo dục mầm non"
            fullWidth
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Ngày bắt đầu làm việc"
              type="date"
              value={form.start_date}
              onChange={(e) => setField('start_date', e.target.value)}
              fullWidth
            />
            <Select
              label="Trạng thái"
              value={form.status}
              onChange={(v) => setField('status', v)}
              options={[
                { label: 'Đang làm việc', value: 'Active' },
                { label: 'Tạm nghỉ', value: 'Inactive' },
                { label: 'Đã nghỉ việc', value: 'Resigned' },
              ]}
              fullWidth
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => navigate('/teachers')}>
              Hủy
            </Button>
            <Button type="submit" leftIcon={<Save className="w-4 h-4" />} loading={saving || loading}>
              Lưu hồ sơ
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
