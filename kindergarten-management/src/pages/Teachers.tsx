import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Mail, Phone, Search, Trash2, UserPlus } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Avatar from '@/components/common/Avatar';
import Badge from '@/components/common/Badge';
import { ConfirmModal } from '@/components/common/Modal';
import { useToast } from '@/components/common/Toast';
import { deleteTeacherProfile, listTeachers } from '@/services/usersService';
import type { UserProfile } from '@/types/domain';

export default function Teachers() {
  const navigate = useNavigate();
  const toast = useToast();
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    const result = await listTeachers();
    setLoading(false);
    if (result.error) {
      toast.error('Không tải được danh sách giáo viên', result.error.message);
      setTeachers([]);
      return;
    }
    setTeachers(result.items);
  }, [toast]);

  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return teachers;
    return teachers.filter((teacher) => {
      return (
        teacher.full_name.toLowerCase().includes(term) ||
        (teacher.email || '').toLowerCase().includes(term) ||
        (teacher.phone || '').includes(term) ||
        (teacher.teacher_code || '').toLowerCase().includes(term)
      );
    });
  }, [search, teachers]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteTeacherProfile(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      toast.error('Xóa giáo viên thất bại', result.error.message);
      return;
    }
    toast.success('Xóa giáo viên thành công');
    setDeleteTarget(null);
    void loadTeachers();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1E293B]">Quản lý giáo viên</h1>
          <p className="text-sm text-[#64748B]">{teachers.length} giáo viên</p>
        </div>
        <Button size="sm" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => navigate('/teachers/new')}>
          Thêm giáo viên
        </Button>
      </div>

      <Card noPadding>
        <div className="p-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên, mã, email, số điện thoại..."
            leftAddon={<Search className="w-4 h-4" />}
          />
        </div>
      </Card>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Giáo viên</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Mã GV</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Điện thoại</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Trạng thái</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#64748B] uppercase tracking-wide">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3" colSpan={6}>
                        <div className="h-4 bg-[#F1F5F9] rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                : filtered.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={teacher.avatar} name={teacher.full_name} size="sm" />
                          <div>
                            <p className="font-medium text-[#1E293B]">{teacher.full_name}</p>
                            <p className="text-xs text-[#64748B]">Giáo viên</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{teacher.teacher_code || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-[#64748B]">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{teacher.email || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-[#64748B]">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{teacher.phone || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="success" size="sm">Đang làm việc</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/teachers/${teacher.id}/edit`)}
                            className="p-2 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B] transition-colors"
                            aria-label="Sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(teacher)}
                            className="p-2 rounded-lg text-[#64748B] hover:bg-red-50 hover:text-red-500 transition-colors"
                            aria-label="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-[#94A3B8]">Không tìm thấy giáo viên nào</div>
        )}
      </Card>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xóa giáo viên"
        message={deleteTarget ? `Xóa giáo viên "${deleteTarget.full_name}"?` : undefined}
        confirmLabel="Xóa"
        loading={deleting}
      />
    </div>
  );
}
