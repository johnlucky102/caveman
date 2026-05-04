import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Mail, Phone, Edit2, Trash2 } from 'lucide-react';
import Card, { CardHeader } from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Avatar from '../components/common/Avatar';
import { TeacherStatusBadge } from '../components/common/Badge';
import type { Teacher, Class } from '../types';

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

function getTeacherClasses(teacherId: string): string {
  const classes = mockClasses.filter((c) => c.teacher_id === teacherId);
  if (classes.length === 0) return '—';
  return classes.map((c) => c.name).join(', ');
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function Teachers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = mockTeachers.filter((t) => {
    const matchesSearch = t.full_name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.phone.includes(search);
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1E293B]">Quản lý giáo viên</h1>
          <p className="text-sm text-[#64748B]">{mockTeachers.length} giáo viên</p>
        </div>
        <Button size="sm" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => navigate('/teachers/new')}>
          Thêm giáo viên
        </Button>
      </div>

      {/* Search & Filter */}
      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo tên, email, số điện thoại..."
              leftAddon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'active', 'on_leave', 'inactive'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-primary text-white'
                    : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                {status === 'all' ? 'Tất cả' : status === 'active' ? 'Đang làm việc' : status === 'on_leave' ? 'Nghỉ phép' : 'Nghỉ việc'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Teacher Table */}
      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Giáo viên</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Điện thoại</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Lớp chủ nhiệm</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Trạng thái</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#64748B] uppercase tracking-wide">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={t.avatar_url} name={t.full_name} size="sm" />
                      <div>
                        <p className="font-medium text-[#1E293B]">{t.full_name}</p>
                        <p className="text-xs text-[#64748B]">{t.specialization}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-[#64748B]">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-[#64748B]">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.phone || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#64748B]">{getTeacherClasses(t.id)}</td>
                  <td className="px-4 py-3">
                    <TeacherStatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigate(`/teachers/${t.id}/edit`)}
                        className="p-2 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B] transition-colors"
                        aria-label="Sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/teachers/${t.id}`)}
                        className="p-2 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B] transition-colors"
                        aria-label="Xem chi tiết"
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
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-[#94A3B8]">Không tìm thấy giáo viên nào</div>
        )}
      </Card>
    </div>
  );
}
