import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Info, Users } from 'lucide-react';
import Card, { CardHeader } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import Badge, { StudentStatusBadge } from '@/components/common/Badge';
import { useToast } from '@/components/common/Toast';
import { listStudents } from '@/services/studentsService';
import { getClassById } from '@/services/classesService';
import { useAuthStore } from '@/stores/authStore';
import { canManageStudentOrClass } from '@/lib/rbac';
import type { ClassRecord, StudentRecord } from '@/types/domain';

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

  const attendanceRate = useMemo(() => {
    if (!students.length) return 0;
    return Math.max(85, Math.min(100, Math.round(95 - (students.length % 5))));
  }, [students.length]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-56 bg-[#E2E8F0] rounded animate-pulse" />
        <div className="h-60 bg-[#E2E8F0] rounded-xl animate-pulse" />
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

      <div className="flex items-center gap-4 p-5 bg-white border border-[#E2E8F0] rounded-xl">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Users className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-[#1E293B]">{classItem.name}</h2>
          <p className="text-sm text-[#64748B]">
            Mã: {classItem.class_code || classItem.id} · {classItem.room || 'Chưa có phòng'}
          </p>
        </div>
        <Badge variant={classItem.student_count >= classItem.max_students ? 'warning' : 'success'} size="md">
          {classItem.student_count}/{classItem.max_students}
        </Badge>
      </div>

      <div className="border-b border-[#E2E8F0]">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'info' && (
        <Card header={<CardHeader title="Thông tin lớp học" />}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Mã lớp', classItem.class_code || String(classItem.id)],
              ['Giáo viên chủ nhiệm', classItem.teacher_name || 'Chưa phân công'],
              ['Phòng học', classItem.room || '—'],
              ['Sĩ số', `${classItem.student_count}/${classItem.max_students} học sinh`],
              ['Ngày tạo', new Date(classItem.created_at).toLocaleDateString('vi-VN')],
              ['Trạng thái', classItem.student_count >= classItem.max_students ? 'Đầy lớp' : 'Hoạt động'],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <p className="text-xs text-[#94A3B8] mb-0.5">{label}</p>
                <p className="font-medium text-[#1E293B]">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'students' && (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Họ tên</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Mã HS</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Ngày sinh</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-[#F8FAFC] transition-colors cursor-pointer" onClick={() => navigate(`/students/${student.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={student.avatar} name={student.full_name} size="sm" />
                        <span className="font-medium text-[#1E293B]">{student.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{student.student_code}</td>
                    <td className="px-4 py-3 text-[#64748B]">{student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('vi-VN') : '—'}</td>
                    <td className="px-4 py-3">
                      <StudentStatusBadge status="active" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {students.length === 0 && <div className="py-12 text-center text-sm text-[#94A3B8]">Chưa có học sinh trong lớp</div>}
        </Card>
      )}

      {activeTab === 'attendance' && (
        <Card header={<CardHeader title="Điểm danh" subtitle="Phase P2 sẽ thay bằng dữ liệu attendance thật" />}>
          <div className="space-y-2">
            <p className="text-sm text-[#64748B]">Tỷ lệ chuyên cần tạm tính: {attendanceRate}%</p>
            <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${attendanceRate}%` }} />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
