import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Edit, Heart, Info, Trash2 } from 'lucide-react';
import Card, { CardHeader } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import { useToast } from '@/components/common/Toast';
import { getStudentById } from '@/services/studentsService';
import { useAuthStore } from '@/stores/authStore';
import { canManageStudentOrClass } from '@/lib/rbac';
import type { StudentRecord } from '@/types/domain';

type Tab = 'info' | 'health' | 'fees' | 'attendance';

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
}

function getAge(dateOfBirth?: string | null): string {
  if (!dateOfBirth) return '—';
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return String(age);
}

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { role } = useAuthStore();
  const canManage = canManageStudentOrClass(role);

  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const result = await getStudentById(id);
      setLoading(false);

      if (result.error || !result.item) {
        toast.error('Không tải được hồ sơ học sinh', result.error?.message || 'Không tìm thấy học sinh');
        navigate('/students');
        return;
      }
      setStudent(result.item);
    };
    void load();
  }, [id, navigate, toast]);

  const health = useMemo(() => (student?.health_info || {}) as Record<string, unknown>, [student?.health_info]);
  const allergies = typeof health.allergies === 'string' ? health.allergies : '';
  const height = typeof health.height === 'number' || typeof health.height === 'string' ? String(health.height) : '—';
  const weight = typeof health.weight === 'number' || typeof health.weight === 'string' ? String(health.weight) : '—';
  const bloodType = typeof health.blood_type === 'string' ? health.blood_type : '—';

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-56 bg-[#E2E8F0] rounded animate-pulse" />
        <div className="h-60 bg-[#E2E8F0] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/students')}>
          Quay lại
        </Button>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leftIcon={<Edit className="w-4 h-4" />} onClick={() => navigate(`/students/${student.id}/edit`)}>
              Chỉnh sửa
            </Button>
            <Button variant="danger" size="sm" leftIcon={<Trash2 className="w-4 h-4" />} onClick={() => toast.info('Xóa sẽ bật ở phase sau')}>
              Xóa
            </Button>
          </div>
        )}
      </div>

      <Card noPadding>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-6">
          <Avatar src={student.avatar} name={student.full_name} size="xl" />
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-xl font-bold text-[#1E293B]">{student.full_name}</h1>
            <p className="text-sm text-[#64748B] mt-1">
            {student.class_name} · {getAge(student.date_of_birth)} tuổi
            </p>
            <p className="text-sm text-[#64748B] mt-1">Mã HS: {student.student_code}</p>
          </div>
          <div className="text-sm text-[#64748B]">
            <p>Ngày nhập học: {formatDate(student.enrolled_date)}</p>
            <p>Ngày sinh: {formatDate(student.date_of_birth)}</p>
          </div>
        </div>
      </Card>

      <Card noPadding noBorder className="bg-transparent shadow-none space-y-4">
        <div className="flex gap-1 bg-white border border-[#E2E8F0] rounded-xl p-1">
          {[
            { key: 'info', label: 'Thông tin', icon: <Info className="w-4 h-4" /> },
            { key: 'health', label: 'Sức khỏe', icon: <Heart className="w-4 h-4" /> },
            { key: 'fees', label: 'Học phí', icon: <Info className="w-4 h-4" /> },
            { key: 'attendance', label: 'Điểm danh', icon: <Info className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as Tab)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key ? 'bg-primary text-white shadow-sm' : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC]'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl">
          {activeTab === 'info' && (
            <div className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card noPadding header={<CardHeader title="Thông tin học sinh" />}>
                  <div className="divide-y divide-[#F1F5F9]">
                    {[
                      ['Họ tên', student.full_name],
                      ['Mã học sinh', student.student_code],
                      ['Lớp', student.class_name],
                      ['Giới tính', student.gender === 'Male' ? 'Nam' : student.gender === 'Female' ? 'Nữ' : '—'],
                      ['Ngày sinh', formatDate(student.date_of_birth)],
                      ['Địa chỉ', student.address || '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between px-5 py-3 first:pt-0 last:pb-0">
                        <p className="text-sm text-[#94A3B8]">{label}</p>
                        <p className="text-sm font-medium text-[#1E293B] text-right max-w-[60%]">{value}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <div className="bg-[#F8FAFC] rounded-xl p-4 text-center">
                  <p className="text-xs text-[#94A3B8] mb-1">Chiều cao</p>
                  <p className="text-lg font-bold text-[#1E293B]">{height} {height === '—' ? '' : 'cm'}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-4 text-center">
                  <p className="text-xs text-[#94A3B8] mb-1">Cân nặng</p>
                  <p className="text-lg font-bold text-[#1E293B]">{weight} {weight === '—' ? '' : 'kg'}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-4 text-center">
                  <p className="text-xs text-[#94A3B8] mb-1">Nhóm máu</p>
                  <p className="text-lg font-bold text-[#1E293B]">{bloodType}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-4 text-center">
                  <p className="text-xs text-[#94A3B8] mb-1">Dị ứng</p>
                  <p className="text-sm font-bold text-[#1E293B]">{allergies || 'Không'}</p>
                </div>
              </div>

              {allergies && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-600">Cảnh báo dị ứng</p>
                      <p className="text-sm text-red-500 mt-0.5">{allergies}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'fees' || activeTab === 'attendance') && (
            <div className="p-8 text-center text-[#64748B]">
              Dữ liệu {activeTab === 'fees' ? 'học phí' : 'điểm danh'} sẽ được triển khai ở phase P2.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
