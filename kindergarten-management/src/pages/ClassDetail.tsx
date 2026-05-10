import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Info, Users } from 'lucide-react';
import Card, { CardHeader } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import Badge, { StudentStatusBadge, AttendanceStatusBadge } from '@/components/common/Badge';
import { useToast } from '@/components/common/Toast';
import { listStudents } from '@/services/studentsService';
import { getClassById } from '@/services/classesService';
import { listAttendanceByClassAndDate, AttendanceStudentItem } from '@/services/attendanceService';
import { useAuthStore } from '@/stores/authStore';
import { canManageStudentOrClass } from '@/lib/rbac';
import type { ClassRecord, StudentRecord } from '@/types/domain';
import Table from '@/components/common/Table';

type Tab = 'info' | 'students' | 'attendance';

export default function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { role } = useAuthStore();
  const canManage = canManageStudentOrClass(role);

  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [classItem, setClassItem] = useState<ClassRecord | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [todayAttendance, setTodayAttendance] = useState<AttendanceStudentItem[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [classResult, studentsResult] = await Promise.all([
        getClassById(Number(id)),
        listStudents({ page: 1, pageSize: 200, classId: Number(id), sortBy: 'full_name', sortDirection: 'asc' }),
      ]);
      setLoading(false);

      if (classResult.error || !classResult.item) {
        toast.error('Không tải được lớp học', classResult.error?.message || 'Không tìm thấy lớp học');
        navigate('/classes');
        return;
      }

      if (studentsResult.error) toast.error('Không tải được danh sách học sinh', studentsResult.error.message);

      setClassItem(classResult.item);
      setStudents(studentsResult.data.items);
    };
    void load();
  }, [id, navigate, toast]);

  useEffect(() => {
    if (activeTab === 'attendance' && id) {
      const load = async () => {
        setLoadingAttendance(true);
        const today = new Date().toISOString().split('T')[0];
        const result = await listAttendanceByClassAndDate({ classId: Number(id), attendanceDate: today });
        setLoadingAttendance(false);
        if (result.error) {
          toast.error('Không tải được dữ liệu điểm danh', result.error.message);
        } else {
          setTodayAttendance(result.items);
        }
      };
      void load();
    }
  }, [activeTab, id, toast]);

  const attendanceRate = useMemo(() => {
    if (!todayAttendance.length) return 0;
    const present = todayAttendance.filter((i) => i.status === 'present').length;
    return Math.round((present / todayAttendance.length) * 100);
  }, [todayAttendance]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-56 bg-muted rounded animate-pulse" />
        <div className="h-60 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!classItem) return null;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'info', label: 'Thông tin chung', icon: <Info className="w-4 h-4" /> },
    { key: 'students', label: 'Danh sách học sinh', icon: <Users className="w-4 h-4" /> },
    { key: 'attendance', label: 'Điểm danh', icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/classes')}>
          Quay lại
        </Button>
        {canManage && (
          <Button variant="outline" size="sm" leftIcon={<Edit className="w-4 h-4" />} onClick={() => navigate(`/classes/${classItem.id}/edit`)}>
            Chỉnh sửa
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 p-5 bg-card border border-border rounded-xl">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Users className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground">{classItem.name}</h2>
          <p className="text-sm text-muted-foreground">
            Mã: LOP{classItem.id} · {classItem.room || 'Chưa có phòng'}
          </p>
        </div>
        <Badge variant={classItem.student_count >= classItem.max_students ? 'warning' : 'success'} size="md">
          {classItem.student_count}/{classItem.max_students}
        </Badge>
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'info' && (
        <div className="space-y-5">
          <Card header={<CardHeader title="Thông tin lớp học" />}>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Mã lớp', `LOP${classItem.id}`],
                ['Giáo viên chủ nhiệm', classItem.teacher_name || 'Chưa phân công'],
                ['Phòng học', classItem.room || '—'],
                ['Sĩ số', `${classItem.student_count}/${classItem.max_students} học sinh`],
                ['Ngày tạo', new Date(classItem.created_at).toLocaleDateString('vi-VN')],
                ['Trạng thái', classItem.student_count >= classItem.max_students ? 'Đầy lớp' : 'Hoạt động'],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                  <p className="font-medium text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card header={<CardHeader title="Cấu hình tài chính (Khấu trừ)" />}>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Loại lớp học</p>
                <p className="font-medium text-foreground">{classItem.class_type === 'Daycare' ? 'Lớp Bán trú' : 'Lớp Tối'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  {classItem.class_type === 'Daycare' ? 'Tiền cơm/ngày' : 'Tiền nghỉ/buổi'}
                </p>
                <p className="font-medium text-foreground">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                    classItem.class_type === 'Daycare' ? classItem.meal_rate : classItem.cancel_rate
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Kiểu khấu trừ nằm viện</p>
                <p className="font-medium text-foreground">
                  {classItem.hospital_deduction_type === 'Fixed' ? 'Số tiền cố định' : 'Tỷ lệ theo ngày công'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Giá trị khấu trừ viện</p>
                <p className="font-medium text-foreground text-red-500">
                  - {classItem.hospital_deduction_type === 'Fixed' 
                      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(classItem.hospital_deduction_value)
                      : `${classItem.hospital_deduction_value}% học phí ngày`}
                </p>
              </div>
            </div>
            {classItem.description && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Mô tả</p>
                <p className="text-sm text-foreground">{classItem.description}</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'students' && (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Họ tên</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mã HS</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ngày sinh</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/students/${student.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={student.avatar} name={student.full_name} size="sm" />
                        <span className="font-medium text-foreground">{student.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{student.student_code}</td>
                    <td className="px-4 py-3 text-muted-foreground">{student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('vi-VN') : '—'}</td>
                    <td className="px-4 py-3">
                      <StudentStatusBadge status="active" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {students.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Chưa có học sinh trong lớp</div>}
        </Card>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <Card header={<CardHeader title="Thống kê hôm nay" />}>
            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Tỷ lệ hiện diện hôm nay</span>
                <span className="font-bold text-primary">{attendanceRate}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${attendanceRate}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Dựa trên {todayAttendance.length} học sinh trong lớp.
              </p>
            </div>
          </Card>

          <Card noPadding header={<CardHeader title="Danh sách điểm danh hôm nay" />}>
            <Table
              columns={[
                {
                  key: 'student_name',
                  label: 'Học sinh',
                  render: (v) => (
                    <div className="flex items-center gap-3">
                      <Avatar name={String(v)} size="xs" />
                      <span className="font-medium">{String(v)}</span>
                    </div>
                  )
                },
                {
                  key: 'status',
                  label: 'Trạng thái',
                  render: (v) => <AttendanceStatusBadge status={v as any} />
                },
                {
                  key: 'check_in_time',
                  label: 'Giờ vào',
                  render: (v) => (v as React.ReactNode) || '—'
                },
                 {
                  key: 'note',
                  label: 'Ghi chú',
                  render: (v) => <span className="text-xs italic text-muted-foreground">{(v as React.ReactNode) || '—'}</span>
                }
              ]}
              data={todayAttendance as any}
              loading={loadingAttendance}
              emptyMessage="Chưa có dữ liệu điểm danh hôm nay"
            />
            <div className="p-4 border-t border-border flex justify-end">
              <Button size="sm" onClick={() => navigate(`/attendance?classId=${classItem.id}`)}>
                Đi tới trang điểm danh
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
