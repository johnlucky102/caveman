import { useState, useEffect } from 'react';
import {
  Save, School, CalendarDays, Users, Plus, Trash2, Edit2, Shield,
} from 'lucide-react';
import Card, { CardHeader } from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { getSchoolSettings, updateSchoolSettings, createSchoolSettings } from '@/services/settingsService';
import { supabase } from '@/lib/supabase';
import { ConfirmModal } from '@/components/common/Modal';
import type { SchoolSettings } from '@/types/domain';
import type { AppRole } from '@/types/domain';

// ─── Types ───────────────────────────────────────────────────────────────────

type SettingsTab = 'school' | 'academic_year' | 'users';

interface AcademicYear {
  id: number;
  school_year: string;
  academic_year_start: string | null;
  academic_year_end: string | null;
  is_current: boolean;
}

interface UserItem {
  id: string;
  full_name: string;
  phone: string | null;
  role: AppRole;
  created_at: string;
}

const roleLabels: Record<AppRole, string> = {
  Admin: 'Quản trị viên',
  Teacher: 'Giáo viên',
  Parent: 'Phụ huynh',
  Accountant: 'Kế toán',
};

const roleBadgeVariant: Record<AppRole, 'primary' | 'secondary' | 'info' | 'neutral'> = {
  Admin: 'primary',
  Teacher: 'secondary',
  Parent: 'info',
  Accountant: 'neutral',
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('school');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [newYearName, setNewYearName] = useState('');
  const [newYearStart, setNewYearStart] = useState('');
  const [newYearEnd, setNewYearEnd] = useState('');

  // Add User state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'Teacher' as AppRole,
  });

  // Deletion confirms
  const [confirmDeleteYear, setConfirmDeleteYear] = useState<AcademicYear | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserItem | null>(null);

  const toast = useToast();

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'school', label: 'Thông tin trường', icon: School },
    { id: 'academic_year', label: 'Năm học', icon: CalendarDays },
    { id: 'users', label: 'Người dùng', icon: Users },
  ];

  // Load school settings
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { settings, error } = await getSchoolSettings();
      setLoading(false);
      if (error) {
        toast.error('Lỗi', error.message);
      } else {
        setSchoolSettings(settings);
      }
    };
    void load();
  }, [toast]);

  // Load academic years from school_settings table
  useEffect(() => {
    if (activeTab === 'academic_year') {
      setLoading(true);
      supabase
        .from('school_settings')
        .select('id, school_year, academic_year_start, academic_year_end')
        .order('school_year', { ascending: false })
        .then(({ data, error }) => {
          setLoading(false);
          if (error) { toast.error('Lỗi', error.message); return; }
          const currentYear = schoolSettings?.school_year;
          setAcademicYears(
            (data || []).map((r: any) => ({
              id: r.id,
              school_year: r.school_year,
              academic_year_start: r.academic_year_start,
              academic_year_end: r.academic_year_end,
              is_current: r.school_year === currentYear,
            }))
          );
        });
    }
  }, [activeTab, schoolSettings?.school_year, toast]);

  // Load users
  useEffect(() => {
    if (activeTab === 'users') {
      setLoading(true);
      supabase
        .from('users')
        .select('id, full_name, phone, role, created_at')
        .order('full_name')
        .then(({ data, error }) => {
          setLoading(false);
          if (error) { toast.error('Lỗi', error.message); return; }
          setUsers(
            (data || []).map((u: any) => ({
              id: u.id,
              full_name: u.full_name,
              phone: u.phone,
              role: u.role || 'Parent',
              created_at: u.created_at,
            }))
          );
        });
    }
  }, [activeTab, toast]);

  const handleSaveSchool = async () => {
    if (!schoolSettings) return;
    setSaving(true);

    let error;
    if (schoolSettings.id) {
      const res = await updateSchoolSettings(schoolSettings.id, schoolSettings);
      error = res.error;
    } else {
      const res = await createSchoolSettings(schoolSettings as any);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      toast.error('Lỗi', error.message);
    } else {
      toast.success('Thành công', 'Đã lưu cấu hình nhà trường');
    }
  };

  const handleAddYear = async () => {
    if (!newYearName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('school_settings').insert({
      school_name: schoolSettings?.school_name || 'KidGarden',
      school_year: newYearName.trim(),
      academic_year_start: newYearStart || null,
      academic_year_end: newYearEnd || null,
    });
    setSaving(false);
    if (error) {
      toast.error('Lỗi', error.message);
    } else {
      toast.success('Thành công', 'Đã thêm năm học mới');
      setShowAddYearModal(false);
      setNewYearName('');
      setNewYearStart('');
      setNewYearEnd('');
      // Reload
      setActiveTab('school'); // force re-trigger
      setTimeout(() => setActiveTab('academic_year'), 50);
    }
  };

  const handleDeleteYear = async () => {
    if (!confirmDeleteYear) return;
    const { error } = await supabase.from('school_settings').delete().eq('id', confirmDeleteYear.id);
    if (error) {
      toast.error('Lỗi', error.message);
    } else {
      setAcademicYears((y) => y.filter((item) => item.id !== confirmDeleteYear.id));
      toast.success('Đã xóa', 'Năm học đã được xóa');
    }
    setConfirmDeleteYear(null);
  };

  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    const { error } = await supabase.from('users').delete().eq('id', confirmDeleteUser.id);
    if (error) {
      toast.error('Lỗi', error.message);
    } else {
      setUsers((u) => u.filter((user) => user.id !== confirmDeleteUser.id));
      toast.success('Đã xóa', 'Người dùng đã bị xóa');
    }
    setConfirmDeleteUser(null);
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: newUser
    });
    setSaving(false);

    if (error || data?.error) {
      toast.error('Lỗi', error?.message || data?.error);
    } else {
      toast.success('Thành công', 'Đã tạo tài khoản người dùng');
      setShowAddUserModal(false);
      setNewUser({ email: '', password: '', full_name: '', phone: '', role: 'Teacher' });
      // Reload users
      setActiveTab('school');
      setTimeout(() => setActiveTab('users'), 50);
    }
  };

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
            <Card header={<CardHeader title="Thông tin trường học" subtitle="Cập nhật thông tin trường" />}>
              {loading ? (
                <div className="p-10 text-center text-[#64748B]">Đang tải cấu hình...</div>
              ) : (
                <div className="space-y-4">
                  <Input label="Tên trường" value={schoolSettings?.school_name || ''}
                    onChange={(e) => setSchoolSettings((p) => ({ ...p!, school_name: e.target.value }))} required />
                  <Input label="Địa chỉ" value={schoolSettings?.address || ''}
                    onChange={(e) => setSchoolSettings((p) => ({ ...p!, address: e.target.value }))} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Số điện thoại" value={schoolSettings?.phone || ''}
                      onChange={(e) => setSchoolSettings((p) => ({ ...p!, phone: e.target.value }))} type="tel" />
                    <Input label="Email trường" value={schoolSettings?.email || ''}
                      onChange={(e) => setSchoolSettings((p) => ({ ...p!, email: e.target.value }))} type="email" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Năm học hiện tại" value={schoolSettings?.school_year || ''}
                      onChange={(e) => setSchoolSettings((p) => ({ ...p!, school_year: e.target.value }))} placeholder="VD: 2024-2025" />
                    <Input label="Logo URL" value={schoolSettings?.logo_url || ''}
                      onChange={(e) => setSchoolSettings((p) => ({ ...p!, logo_url: e.target.value }))} />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveSchool} loading={saving} leftIcon={<Save className="w-4 h-4" />}>
                      Lưu thay đổi
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Academic Year Tab */}
          {activeTab === 'academic_year' && (
            <div className="space-y-4">
              <Card
                header={
                  <div className="flex items-center justify-between">
                    <CardHeader title="Năm học" subtitle="Quản lý các năm học của trường" />
                    <Button size="sm" onClick={() => setShowAddYearModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
                      Thêm năm học
                    </Button>
                  </div>
                }
              >
                {loading ? (
                  <div className="p-8 text-center text-[#64748B]">Đang tải...</div>
                ) : academicYears.length === 0 ? (
                  <div className="p-8 text-center text-[#64748B]">Chưa có năm học nào</div>
                ) : (
                  <div className="space-y-3">
                    {academicYears.map((year) => (
                      <div
                        key={year.id}
                        className={`flex items-center justify-between p-4 rounded-xl border ${
                          year.is_current
                            ? 'border-primary/30 bg-primary/[0.02]'
                            : 'border-[#E2E8F0] bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            year.is_current ? 'bg-primary/10' : 'bg-[#F1F5F9]'
                          }`}>
                            <CalendarDays className={`w-5 h-5 ${year.is_current ? 'text-primary' : 'text-[#94A3B8]'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-[#1E293B]">{year.school_year}</p>
                              {year.is_current && <Badge variant="success" size="sm">Hiện tại</Badge>}
                            </div>
                            <p className="text-xs text-[#64748B] mt-0.5">
                              {year.academic_year_start
                                ? new Date(year.academic_year_start).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })
                                : '—'}{' '}
                              –{' '}
                              {year.academic_year_end
                                ? new Date(year.academic_year_end).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })
                                : '—'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!year.is_current && (
                            <Button size="xs" variant="ghost" leftIcon={<Trash2 className="w-3 h-3" />}
                              onClick={() => setConfirmDeleteYear(year)}>
                              Xóa
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <Card
                header={
                  <div className="flex items-center justify-between gap-3">
                    <CardHeader title="Người dùng" subtitle={`${users.length} tài khoản`} />
                    <Button size="sm" onClick={() => setShowAddUserModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
                      Thêm tài khoản
                    </Button>
                  </div>
                }
                noPadding
              >
                {loading ? (
                  <div className="p-8 text-center text-[#64748B]">Đang tải...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max text-sm">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Họ tên</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Số điện thoại</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Vai trò</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Ngày tạo</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[#64748B] uppercase tracking-wide">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-xs font-semibold text-primary">
                                    {user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </span>
                                </div>
                                <span className="font-medium text-[#1E293B]">{user.full_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[#64748B]">{user.phone || '—'}</td>
                            <td className="px-4 py-3">
                              <Badge variant={roleBadgeVariant[user.role] || 'neutral'} size="sm">
                                {roleLabels[user.role] || user.role}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-[#64748B]">
                              {new Date(user.created_at).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => setConfirmDeleteUser(user)}
                                className="p-1.5 rounded-lg text-[#64748B] hover:bg-red-50 hover:text-red-500 transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Add Academic Year Modal */}
      <Modal
        open={showAddYearModal}
        onClose={() => { setShowAddYearModal(false); setNewYearName(''); }}
        title="Thêm năm học mới"
        description="Nhập thông tin năm học"
        size="sm"
      >
        <div className="space-y-4">
          <Input label="Tên năm học" placeholder="VD: 2024-2025" value={newYearName}
            onChange={(e) => setNewYearName(e.target.value)} hint="Nhập theo định dạng: 2024-2025" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ngày bắt đầu" type="date" value={newYearStart}
              onChange={(e) => setNewYearStart(e.target.value)} />
            <Input label="Ngày kết thúc" type="date" value={newYearEnd}
              onChange={(e) => setNewYearEnd(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setShowAddYearModal(false); setNewYearName(''); }}>
              Hủy
            </Button>
            <Button onClick={handleAddYear} disabled={!newYearName.trim()} loading={saving}>
              Thêm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add User Account Modal */}
      <Modal
        open={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        title="Tạo tài khoản mới"
        description="Admin có thể tạo tài khoản cho nhân viên hoặc phụ huynh"
      >
        <div className="space-y-4">
          <Input label="Họ tên" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
            <Input label="Mật khẩu" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Số điện thoại" type="tel" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} />
            <Select 
              label="Vai trò" 
              value={newUser.role} 
              onChange={v => setNewUser({...newUser, role: v as AppRole})} 
              options={[
                { label: 'Quản trị viên', value: 'Admin' },
                { label: 'Giáo viên', value: 'Teacher' },
                { label: 'Phụ huynh', value: 'Parent' },
                { label: 'Kế toán', value: 'Accountant' },
              ]}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAddUserModal(false)}>Hủy</Button>
            <Button onClick={handleAddUser} loading={saving}>Tạo tài khoản</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(confirmDeleteYear)}
        onClose={() => setConfirmDeleteYear(null)}
        onConfirm={handleDeleteYear}
        title="Xóa năm học"
        message={`Bạn có chắc chắn muốn xóa năm học "${confirmDeleteYear?.school_year}"?`}
      />

      <ConfirmModal
        open={Boolean(confirmDeleteUser)}
        onClose={() => setConfirmDeleteUser(null)}
        onConfirm={handleDeleteUser}
        title="Xóa tài khoản"
        message={`Xóa tài khoản của "${confirmDeleteUser?.full_name}"?`}
      />
    </div>
  );
}
