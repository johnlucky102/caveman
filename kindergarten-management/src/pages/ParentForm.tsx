import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, UserPlus, X } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import { useToast } from '@/components/common/Toast';
import { DatePicker } from '@/components/common/DatePicker';
import { getParentById, createParent, updateParent, deleteParent, linkParentToStudent, unlinkParentFromStudent } from '@/services/usersService';
import { listStudents } from '@/services/studentsService';
import type { ParentRecord, CreateParentInput, StudentRecord } from '@/types/domain';
import type { SelectOption } from '@/types';
import { ConfirmModal } from '@/components/common/Modal';

export default function ParentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [allStudents, setAllStudents] = useState<StudentRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [formData, setFormData] = useState<CreateParentInput>({
    full_name: '',
    phone: '',
    email: '',
    relationship: 'Guardian',
    occupation: '',
    address: '',
    gender: 'Female',
    date_of_birth: '',
  });

  const [linkedStudents, setLinkedStudents] = useState<{id: string, full_name: string, class_name: string}[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const studentsResult = await listStudents({ page: 1, pageSize: 500 });
      if (!studentsResult.error) setAllStudents(studentsResult.data.items);

      if (id) {
        const result = await getParentById(id);
        if (result.error) {
          toast.error('Lỗi', result.error.message);
          navigate('/parents');
        } else if (result.item) {
          setFormData({
            full_name: result.item.full_name,
            phone: result.item.phone,
            email: result.item.email,
            relationship: result.item.relationship,
            occupation: result.item.occupation,
            address: result.item.address,
            gender: result.item.gender || 'Female',
            date_of_birth: result.item.date_of_birth || '',
          });
          setLinkedStudents(result.item.students || []);
        }
      }
      setLoading(false);
    };
    void loadData();
  }, [id, navigate, toast]);

  const handleSubmit = async () => {
    if (!formData.full_name.trim() || !formData.phone.trim()) {
      toast.error('Vui lòng nhập tên và số điện thoại');
      return;
    }

    setSaving(true);
    const result = isEdit 
      ? await updateParent(id!, formData) 
      : await createParent(formData);
    setSaving(false);

    if (result.error) {
      toast.error('Lỗi', result.error.message);
      return;
    }

    toast.success(isEdit ? 'Cập nhật thành công' : 'Thêm phụ huynh thành công');
    if (!isEdit && result.item) {
        navigate(`/parents/${result.item.id}/edit`);
    } else {
        navigate('/parents');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    const result = await deleteParent(id);
    setDeleting(false);
    if (result.error) {
      toast.error('Lỗi', result.error.message);
      return;
    }
    toast.success('Đã xóa phụ huynh');
    navigate('/parents');
  };

  const handleLinkStudent = async () => {
    if (!id || !selectedStudentId) return;
    const student = allStudents.find(s => s.id === selectedStudentId);
    if (!student) return;

    const result = await linkParentToStudent(id, selectedStudentId, formData.relationship);
    if (result.error) {
      toast.error('Lỗi', result.error.message);
      return;
    }

    setLinkedStudents(prev => [...prev, { id: student.id, full_name: student.full_name, class_name: student.class_name }]);
    setSelectedStudentId('');
    toast.success('Đã liên kết học sinh');
  };

  const handleUnlinkStudent = async (studentId: string) => {
    if (!id) return;
    const result = await unlinkParentFromStudent(id, studentId);
    if (result.error) {
      toast.error('Lỗi', result.error.message);
      return;
    }
    setLinkedStudents(prev => prev.filter(s => s.id !== studentId));
    toast.success('Đã gỡ liên kết');
  };

  const relationshipOptions: SelectOption[] = [
    { value: 'Father', label: 'Bố' },
    { value: 'Mother', label: 'Mẹ' },
    { value: 'Guardian', label: 'Người giám hộ' },
  ];

  const studentOptions: SelectOption[] = [
    { value: '', label: 'Chọn học sinh...' },
    ...allStudents
      .filter(s => !linkedStudents.some(ls => ls.id === s.id))
      .map(s => ({ value: s.id, label: `${s.full_name} (${s.class_name})` }))
  ];

  if (loading) return <div className="p-8 text-center">Đang tải...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/parents')}>
            Quay lại
          </Button>
          <h1 className="text-xl font-bold text-[#1E293B]">{isEdit ? 'Chỉnh sửa phụ huynh' : 'Thêm phụ huynh mới'}</h1>
        </div>
        {isEdit && (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={() => setShowDeleteConfirm(true)}
          >
            Xóa
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card header={<div className="font-semibold">Thông tin cơ bản</div>}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Họ và tên"
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                required
                placeholder="VD: Nguyễn Văn A"
              />
              <Input
                label="Số điện thoại"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                required
                placeholder="VD: 0912345678"
              />
              <Input
                label="Email"
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="VD: parent@example.com"
              />
              <Select
                label="Quan hệ với học sinh"
                value={formData.relationship}
                onChange={v => setFormData({ ...formData, relationship: v as any })}
                options={relationshipOptions}
              />
              <Input
                label="Nghề nghiệp"
                value={formData.occupation || ''}
                onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                placeholder="VD: Nhân viên văn phòng"
              />
              <Input
                label="Địa chỉ"
                value={formData.address || ''}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="VD: 123 Nguyễn Huệ, Quận 1"
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Giới tính"
                  value={formData.gender || 'Female'}
                  onChange={v => setFormData({ ...formData, gender: v })}
                  options={[
                    { label: 'Nam', value: 'Male' },
                    { label: 'Nữ', value: 'Female' },
                    { label: 'Khác', value: 'Other' },
                  ]}
                />
                <DatePicker
                  label="Ngày sinh"
                  date={formData.date_of_birth || ''}
                  setDate={(d) => setFormData({ ...formData, date_of_birth: d })}
                />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button leftIcon={<Save className="w-4 h-4" />} onClick={handleSubmit} loading={saving}>
                {isEdit ? 'Lưu thay đổi' : 'Tạo phụ huynh'}
              </Button>
            </div>
          </Card>

          {isEdit && (
            <Card header={<div className="font-semibold">Học sinh liên kết</div>}>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      value={selectedStudentId}
                      onChange={setSelectedStudentId}
                      options={studentOptions}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    leftIcon={<UserPlus className="w-4 h-4" />}
                    onClick={handleLinkStudent}
                    disabled={!selectedStudentId}
                  >
                    Thêm
                  </Button>
                </div>

                <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-xl overflow-hidden">
                  {linkedStudents.length > 0 ? linkedStudents.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-white">
                      <div>
                        <p className="text-sm font-medium text-[#1E293B]">{student.full_name}</p>
                        <p className="text-xs text-[#64748B]">{student.class_name}</p>
                      </div>
                      <button 
                        onClick={() => handleUnlinkStudent(student.id)}
                        className="p-1.5 text-[#94A3B8] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Gỡ liên kết"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-sm text-[#64748B]">Chưa liên kết với học sinh nào</div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
            <Card header={<div className="font-semibold">Hướng dẫn</div>}>
                <div className="text-sm text-[#64748B] space-y-3">
                    <p>• Nhập đầy đủ thông tin phụ huynh để quản lý liên lạc.</p>
                    <p>• Sau khi tạo xong, bạn có thể liên kết phụ huynh này với một hoặc nhiều học sinh.</p>
                    <p>• Thông tin này sẽ được dùng để gửi thông báo và quản lý học phí.</p>
                </div>
            </Card>
        </div>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Xóa phụ huynh"
        message={`Bạn có chắc chắn muốn xóa phụ huynh "${formData.full_name}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        loading={deleting}
      />
    </div>
  );
}
