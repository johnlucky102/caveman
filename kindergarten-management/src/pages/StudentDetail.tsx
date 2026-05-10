import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Edit, Heart, Info, Trash2, Wallet, CalendarCheck } from 'lucide-react';
import Card, { CardHeader } from '@/components/common/Card';
import Button from '@/components/common/Button';

import Table from '@/components/common/Table';
import { AttendanceStatusBadge, FeeStatusBadge } from '@/components/common/Badge';
import { useToast } from '@/components/common/Toast';
import { getStudentById, deleteStudent } from '@/services/studentsService';
import { listFees } from '@/services/feesService';
import { listAttendanceHistory } from '@/services/attendanceService';
import { useAuthStore } from '@/stores/authStore';
import { canManageStudentOrClass, canAddOrDeleteStudent, isTeacher } from '@/lib/rbac';
import type { StudentRecord, FeeRecordP2, AttendanceRecord } from '@/types/domain';
import type { TableColumn } from '@/types';

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
  const canAddDelete = canAddOrDeleteStudent(role);
  const isT = isTeacher(role);

  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const [feeItems, setFeeItems] = useState<FeeRecordP2[]>([]);
  const [loadingFees, setLoadingFees] = useState(false);

  const [attendanceItems, setAttendanceItems] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

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

  const handleDeleteStudent = async () => {
    if (!id || !window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ học sinh ${student?.full_name}?`)) return;
    
    setLoading(true);
    const { error } = await deleteStudent(id);
    setLoading(false);
    
    if (error) {
      toast.error('Lỗi khi xóa', error.message);
    } else {
      toast.success('Thành công', 'Đã xóa hồ sơ học sinh');
      navigate('/students');
    }
  };

  useEffect(() => {
    if (activeTab === 'fees' && id) {
      const load = async () => {
        setLoadingFees(true);
        const result = await listFees({ studentId: id, page: 1, pageSize: 50 });
        setLoadingFees(false);
        if (result.error) {
          toast.error('Không tải được học phí', result.error.message);
        } else {
          setFeeItems(result.data.items);
        }
      };
      void load();
    }
  }, [activeTab, id, toast]);

  useEffect(() => {
    if (activeTab === 'attendance' && id) {
      const load = async () => {
        setLoadingAttendance(true);
        const result = await listAttendanceHistory(undefined, id);
        setLoadingAttendance(false);
        if (result.error) {
          toast.error('Không tải được lịch sử điểm danh', result.error.message);
        } else {
          setAttendanceItems(result.items);
        }
      };
      void load();
    }
  }, [activeTab, id, toast]);

  const health = useMemo(() => (student?.health_info || {}) as Record<string, unknown>, [student?.health_info]);
  const allergies = typeof health.allergies === 'string' ? health.allergies : '';
  const height = typeof health.height === 'number' || typeof health.height === 'string' ? String(health.height) : '—';
  const weight = typeof health.weight === 'number' || typeof health.weight === 'string' ? String(health.weight) : '—';
  const bloodType = typeof health.blood_type === 'string' ? health.blood_type : '—';

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-56 bg-muted rounded animate-pulse" />
        <div className="h-60 bg-muted rounded-xl animate-pulse" />
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
        <div className="flex gap-2">
          {canManage && (
            <Button variant="outline" size="sm" leftIcon={<Edit className="w-4 h-4" />} onClick={() => navigate(`/students/${student.id}/edit`)}>
              {isT ? 'Cập nhật sức khỏe' : 'Chỉnh sửa'}
            </Button>
          )}
          {canAddDelete && (
            <Button variant="danger" size="sm" leftIcon={<Trash2 className="w-4 h-4" />} onClick={handleDeleteStudent}>
              Xóa
            </Button>
          )}
        </div>
      </div>

      <Card noPadding>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold shrink-0">
            {student.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-xl font-bold text-foreground">{student.full_name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
            {student.class_name} · {getAge(student.date_of_birth)} tuổi
            </p>
            <p className="text-sm text-muted-foreground mt-1">Mã HS: {student.student_code}</p>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Ngày nhập học: {formatDate(student.enrolled_date)}</p>
            <p>Ngày sinh: {formatDate(student.date_of_birth)}</p>
          </div>
        </div>
      </Card>

      <Card noPadding noBorder className="bg-transparent shadow-none space-y-4">
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
          {[
            { key: 'info', label: 'Thông tin', icon: <Info className="w-4 h-4" /> },
            { key: 'health', label: 'Sức khỏe', icon: <Heart className="w-4 h-4" /> },
            ...(!isT ? [{ key: 'fees', label: 'Học phí', icon: <Wallet className="w-4 h-4" /> }] : []),
            { key: 'attendance', label: 'Điểm danh', icon: <CalendarCheck className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as Tab)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl">
          {activeTab === 'info' && (
            <div className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card noPadding header={<CardHeader title="Thông tin học sinh" />}>
                  <div className="divide-y divide-border">
                    {[
                      ['Họ tên', student.full_name],
                      ['Mã học sinh', student.student_code],
                      ['Lớp', student.class_name],
                      ['Giới tính', student.gender === 'Male' ? 'Nam' : student.gender === 'Female' ? 'Nữ' : '—'],
                      ['Ngày sinh', formatDate(student.date_of_birth)],
                      ['Địa chỉ', student.address || '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between px-5 py-3 first:pt-0 last:pb-0">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium text-foreground text-right max-w-[60%]">{value}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card noPadding header={<CardHeader title="Thông tin phụ huynh" />}>
                  <div className="divide-y divide-border">
                    {student.parents && student.parents.length > 0 ? (
                      student.parents.map((parent) => (
                        <div key={parent.id} className="p-5 first:pt-0 last:pb-0">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-bold text-foreground">{parent.full_name}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                              parent.is_primary ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'
                            }`}>
                              {parent.relationship === 'Father' ? 'Bố' : parent.relationship === 'Mother' ? 'Mẹ' : 'Người giám hộ'}
                              {parent.is_primary ? ' (Chính)' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <p>SĐT: {parent.phone}</p>
                          </div>
                          <button 
                            onClick={() => navigate(`/parents/${parent.id}/edit`)}
                            className="mt-2 text-xs text-primary hover:underline font-medium"
                          >
                            Xem chi tiết phụ huynh
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-5 text-center text-sm text-muted-foreground">Chưa có thông tin phụ huynh</div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Chiều cao</p>
                  <p className="text-lg font-bold text-foreground">{height} {height === '—' ? '' : 'cm'}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Cân nặng</p>
                  <p className="text-lg font-bold text-foreground">{weight} {weight === '—' ? '' : 'kg'}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Nhóm máu</p>
                  <p className="text-lg font-bold text-foreground">{bloodType}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Dị ứng</p>
                  <p className="text-sm font-bold text-foreground">{allergies || 'Không'}</p>
                </div>
              </div>

              {allergies && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-500">Cảnh báo dị ứng</p>
                      <p className="text-sm text-red-500/80 mt-0.5">{allergies}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'fees' && (
            <div className="p-5">
              <Table
                columns={[
                  { key: 'fee_type_name', label: 'Loại phí' },
                  { 
                    key: 'month', 
                    label: 'Tháng', 
                    render: (v, row) => `T${v}/${(row as FeeRecordP2).school_year}` 
                  },
                  { 
                    key: 'amount_vnd', 
                    label: 'Số tiền', 
                    render: (v) => `${Number(v).toLocaleString()} đ` 
                  },
                  { 
                    key: 'status', 
                    label: 'Trạng thái', 
                    render: (v) => <FeeStatusBadge status={v as any} /> 
                  },
                ] as TableColumn<FeeRecordP2>[]}
                data={feeItems}
                loading={loadingFees}
                emptyMessage="Học sinh này chưa có bản ghi học phí nào"
              />
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="p-5">
              <Table
                columns={[
                  { 
                    key: 'attendance_date', 
                    label: 'Ngày', 
                    render: (v) => formatDate(String(v)) 
                  },
                  { 
                    key: 'status', 
                    label: 'Trạng thái', 
                    render: (v) => <AttendanceStatusBadge status={v as any} /> 
                  },
                  { 
                    key: 'note', 
                    label: 'Ghi chú', 
                    render: (v) => <span className="text-xs text-muted-foreground italic">{(v as React.ReactNode) || '—'}</span> 
                  },
                ] as TableColumn<AttendanceRecord>[]}
                data={attendanceItems}
                loading={loadingAttendance}
                emptyMessage="Học sinh này chưa có lịch sử điểm danh"
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
