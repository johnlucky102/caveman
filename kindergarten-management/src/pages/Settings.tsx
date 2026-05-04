import { useState } from 'react';
import {
  Save,
  School,
  CalendarDays,
  Users,
  Plus,
  Trash2,
  Edit2,
  Shield,
} from 'lucide-react';
import Card, { CardHeader } from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import type { User, UserRole } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

type SettingsTab = 'school' | 'academic_year' | 'users';

interface SchoolInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  principal: string;
  founded_year: string;
}

interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'inactive';
}

interface UserItem {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  status: string;
  created_at: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockSchoolInfo: SchoolInfo = {
  name: 'KidGarden Kindergarten',
  address: '123 Nguyễn Văn Linh, Quận 7, TP.HCM',
  phone: '028 1234 5678',
  email: 'info@kidgarden.vn',
  principal: 'Nguyễn Thị Lan',
  founded_year: '2015',
};

const mockAcademicYears: AcademicYear[] = [
  { id: '1', name: '2023-2024', start_date: '2023-09-01', end_date: '2024-05-31', status: 'active' },
  { id: '2', name: '2022-2023', start_date: '2022-09-01', end_date: '2023-05-31', status: 'inactive' },
  { id: '3', name: '2021-2022', start_date: '2021-09-01', end_date: '2022-05-31', status: 'inactive' },
];

const mockUsers: UserItem[] = [
  { id: '1', full_name: 'Nguyễn Thị Lan', email: 'lan.nguyen@kidgarden.vn', role: 'admin', status: 'active', created_at: '2023-01-15' },
  { id: '2', full_name: 'Trần Văn Hùng', email: 'hung.tran@kidgarden.vn', role: 'teacher', status: 'active', created_at: '2023-02-20' },
  { id: '3', full_name: 'Lê Thị Mai', email: 'mai.le@kidgarden.vn', role: 'teacher', status: 'active', created_at: '2023-03-10' },
  { id: '4', full_name: 'Phạm Văn An', email: 'an.pham@kidgarden.vn', role: 'parent', status: 'active', created_at: '2023-04-05' },
  { id: '5', full_name: 'Hoàng Thị Bình', email: 'binh.hoang@kidgarden.vn', role: 'staff', status: 'active', created_at: '2023-05-12' },
  { id: '6', full_name: 'Vũ Văn Cường', email: 'cuong.vu@kidgarden.vn', role: 'teacher', status: 'inactive', created_at: '2022-09-01' },
];

const roleLabels: Record<UserRole, string> = {
  admin: 'Quản trị viên',
  teacher: 'Giáo viên',
  parent: 'Phụ huynh',
  staff: 'Nhân viên',
};

const roleBadgeVariant: Record<UserRole, 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'neutral'> = {
  admin: 'primary',
  teacher: 'secondary',
  parent: 'info',
  staff: 'neutral',
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('school');
  const [saving, setSaving] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(mockSchoolInfo);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(mockAcademicYears);
  const [users, setUsers] = useState<UserItem[]>(mockUsers);
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [newYearName, setNewYearName] = useState('');

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'school', label: 'Thông tin trường', icon: School },
    { id: 'academic_year', label: 'Năm học', icon: CalendarDays },
    { id: 'users', label: 'Người dùng', icon: Users },
  ];

  const handleSaveSchool = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
  };

  const handleAddYear = () => {
    if (!newYearName.trim()) return;
    const newYear: AcademicYear = {
      id: String(Date.now()),
      name: newYearName.trim(),
      start_date: `${newYearName.trim().split('-')[0]}-09-01`,
      end_date: `${newYearName.trim().split('-')[1] || newYearName.trim()}-05-31`,
      status: 'inactive',
    };
    setAcademicYears((y) => [...y, newYear]);
    setNewYearName('');
    setShowAddYearModal(false);
  };

  const handleDeleteUser = (id: string) =>
    setUsers((u) => u.filter((user) => user.id !== id));

  const handleToggleUserStatus = (id: string) =>
    setUsers((u) =>
      u.map((user) =>
        user.id === id
          ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
          : user
      )
    );

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#1E293B]">Cài đặt</h1>
        <p className="text-sm text-[#64748B]">Quản lý cấu hình hệ thống</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar */}
        <div className="lg:w-56 shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* School Info Tab */}
          {activeTab === 'school' && (
            <Card
              header={<CardHeader title="Thông tin trường học" subtitle="Cập nhật thông tin trường" />}
            >
              <div className="space-y-4">
                <Input
                  label="Tên trường"
                  value={schoolInfo.name}
                  onChange={(e) => setSchoolInfo((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                <Input
                  label="Địa chỉ"
                  value={schoolInfo.address}
                  onChange={(e) => setSchoolInfo((p) => ({ ...p, address: e.target.value }))}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Số điện thoại"
                    value={schoolInfo.phone}
                    onChange={(e) => setSchoolInfo((p) => ({ ...p, phone: e.target.value }))}
                    type="tel"
                  />
                  <Input
                    label="Email trường"
                    value={schoolInfo.email}
                    onChange={(e) => setSchoolInfo((p) => ({ ...p, email: e.target.value }))}
                    type="email"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Hiệu trưởng/ Giám đốc"
                    value={schoolInfo.principal}
                    onChange={(e) => setSchoolInfo((p) => ({ ...p, principal: e.target.value }))}
                  />
                  <Input
                    label="Năm thành lập"
                    value={schoolInfo.founded_year}
                    onChange={(e) => setSchoolInfo((p) => ({ ...p, founded_year: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveSchool} loading={saving} leftIcon={<Save className="w-4 h-4" />}>
                    Lưu thay đổi
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Academic Year Tab */}
          {activeTab === 'academic_year' && (
            <div className="space-y-4">
              <Card
                header={
                  <div className="flex items-center justify-between">
                    <CardHeader
                      title="Năm học"
                      subtitle="Quản lý các năm học của trường"
                    />
                    <Button
                      size="sm"
                      onClick={() => setShowAddYearModal(true)}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Thêm năm học
                    </Button>
                  </div>
                }
              >
                <div className="space-y-3">
                  {academicYears.map((year) => (
                    <div
                      key={year.id}
                      className={`flex items-center justify-between p-4 rounded-xl border ${
                        year.status === 'active'
                          ? 'border-primary/30 bg-primary/[0.02]'
                          : 'border-[#E2E8F0] bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            year.status === 'active' ? 'bg-primary/10' : 'bg-[#F1F5F9]'
                          }`}
                        >
                          <CalendarDays
                            className={`w-5 h-5 ${
                              year.status === 'active' ? 'text-primary' : 'text-[#94A3B8]'
                            }`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[#1E293B]">{year.name}</p>
                            {year.status === 'active' && (
                              <Badge variant="success" size="sm">Hiện tại</Badge>
                            )}
                          </div>
                          <p className="text-xs text-[#64748B] mt-0.5">
                            {new Date(year.start_date).toLocaleDateString('vi-VN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}{' '}
                            –{' '}
                            {new Date(year.end_date).toLocaleDateString('vi-VN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="xs"
                          variant={year.status === 'active' ? 'outline' : 'ghost'}
                          leftIcon={<Edit2 className="w-3 h-3" />}
                        >
                          Sửa
                        </Button>
                        {year.status !== 'active' && (
                          <Button
                            size="xs"
                            variant="ghost"
                            leftIcon={<Trash2 className="w-3 h-3" />}
                            onClick={() =>
                              setAcademicYears((y) => y.filter((item) => item.id !== year.id))
                            }
                          >
                            Xóa
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <Card
                header={
                  <div className="flex items-center justify-between gap-3">
                    <CardHeader
                      title="Người dùng"
                      subtitle={`${users.length} tài khoản`}
                    />
                    <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                      Thêm người dùng
                    </Button>
                  </div>
                }
                noPadding
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max text-sm">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                          Họ tên
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                          Vai trò
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                          Trạng thái
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-semibold text-primary">
                                  {user.full_name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </span>
                              </div>
                              <span className="font-medium text-[#1E293B]">{user.full_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[#64748B]">{user.email}</td>
                          <td className="px-4 py-3">
                            <Badge variant={roleBadgeVariant[user.role]} size="sm">
                              {roleLabels[user.role]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={user.status === 'active' ? 'success' : 'neutral'}
                              size="sm"
                            >
                              {user.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleToggleUserStatus(user.id)}
                                className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B] transition-colors"
                                title={user.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                              >
                                <Shield className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B] transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1.5 rounded-lg text-[#64748B] hover:bg-red-50 hover:text-red-500 transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Add Academic Year Modal */}
      <Modal
        open={showAddYearModal}
        onClose={() => {
          setShowAddYearModal(false);
          setNewYearName('');
        }}
        title="Thêm năm học mới"
        description="Nhập tên năm học theo định dạng 2024-2025"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Tên năm học"
            placeholder="VD: 2024-2025"
            value={newYearName}
            onChange={(e) => setNewYearName(e.target.value)}
            hint="Nhập theo định dạng: 2024-2025"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddYearModal(false);
                setNewYearName('');
              }}
            >
              Hủy
            </Button>
            <Button onClick={handleAddYear} disabled={!newYearName.trim()}>
              Thêm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
