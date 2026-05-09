import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Avatar from '@/components/common/Avatar';
import { useToast } from '@/components/common/Toast';
import { createTeacherProfile, getTeacherById, updateTeacherProfile } from '@/services/usersService';

interface FormState {
  avatar: string | null;
  teacher_code: string;
  full_name: string;
  phone: string;
  email: string;
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
    teacher_code: 'Tự động tạo',
    full_name: '',
    phone: '',
    email: '',
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
        teacher_code: result.item.teacher_code || result.item.id.slice(0, 8).toUpperCase(),
        full_name: result.item.full_name,
        phone: result.item.phone || '',
        email: result.item.email || '',
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
    if (!isEditMode && !form.email.trim()) nextErrors.email = 'Email không được để trống';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      avatar: form.avatar,
    };
    const result = isEditMode && id ? await updateTeacherProfile(id, payload) : await createTeacherProfile(payload);
    setSaving(false);

    if (result.error) {
      toast.error(isEditMode ? 'Cập nhật giáo viên thất bại' : 'Tạo giáo viên thất bại', result.error.message);
      if (result.error.field) setErrors((prev) => ({ ...prev, [result.error!.field!]: result.error!.message }));
      return;
    }

    toast.success(isEditMode ? 'Cập nhật giáo viên thành công' : 'Tạo giáo viên thành công');
    navigate('/teachers');
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/teachers')}>
          Quay lại
        </Button>
        <h1 className="text-xl font-bold text-[#1E293B]">{isEditMode ? 'Chỉnh sửa giáo viên' : 'Thêm giáo viên mới'}</h1>
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



          <Input
            label="Họ và tên"
            placeholder="VD: Nguyễn Văn A"
            value={form.full_name}
            onChange={(e) => setField('full_name', e.target.value)}
            error={errors.full_name}
            required
            fullWidth
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Số điện thoại"
              type="tel"
              placeholder="VD: 0901 234 567"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              error={errors.phone}
              required
              fullWidth
            />

            {!isEditMode && (
              <Input
                label="Email"
                type="email"
                placeholder="VD: teacher@kidgarden.vn"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                error={errors.email}
                required
                fullWidth
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => navigate('/teachers')}>
              Hủy
            </Button>
            <Button type="submit" leftIcon={<Save className="w-4 h-4" />} loading={saving || loading}>
              {isEditMode ? 'Lưu thay đổi' : 'Thêm giáo viên'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
