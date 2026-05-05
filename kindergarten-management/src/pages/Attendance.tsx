import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Check, ChevronLeft, ChevronRight, Clock, Filter, History, Search, X } from 'lucide-react';
import Card, { CardHeader } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Table from '@/components/common/Table';
import { AttendanceStatusBadge } from '@/components/common/Badge';
import { useToast } from '@/components/common/Toast';
import { listClasses } from '@/services/classesService';
import {
  listAttendanceByClassAndDate,
  listAttendanceHistory,
  upsertAttendanceBulk,
  type AttendanceStudentItem,
} from '@/services/attendanceService';
import { useAuthStore } from '@/stores/authStore';
import type { SelectOption, TableColumn } from '@/types';
import type { AttendanceRecord, AttendanceStatusValue } from '@/types/domain';

type ViewMode = 'rollcall' | 'history';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Attendance() {
  const toast = useToast();
  const { user } = useAuthStore();

  const [viewMode, setViewMode] = useState<ViewMode>('rollcall');
  const [classOptions, setClassOptions] = useState<SelectOption[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<AttendanceStudentItem[]>([]);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [historyStudentFilter, setHistoryStudentFilter] = useState('');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');

  useEffect(() => {
    const loadClasses = async () => {
      const result = await listClasses({ page: 1, pageSize: 200, sortBy: 'name', sortDirection: 'asc' });
      if (result.error) {
        toast.error('Không tải được lớp học', result.error.message);
        return;
      }
      const options = result.data.items.map((item) => ({ value: String(item.id), label: item.name }));
      setClassOptions(options);
      if (options.length > 0) setSelectedClass(options[0].value);
    };
    void loadClasses();
  }, [toast]);

  useEffect(() => {
    if (!selectedClass) return;
    const loadRollCall = async () => {
      setLoading(true);
      const result = await listAttendanceByClassAndDate({ classId: Number(selectedClass), attendanceDate: date });
      setLoading(false);
      if (result.error) {
        toast.error('Không tải được dữ liệu điểm danh', result.error.message);
        setStudents([]);
        return;
      }
      setStudents(result.items);
    };
    void loadRollCall();
  }, [date, selectedClass, toast]);

  useEffect(() => {
    if (viewMode !== 'history' || !selectedClass) return;
    const loadHistory = async () => {
      setLoading(true);
      const result = await listAttendanceHistory(Number(selectedClass), historyStudentFilter || undefined, historyFrom || undefined, historyTo || undefined);
      setLoading(false);
      if (result.error) {
        toast.error('Không tải được lịch sử điểm danh', result.error.message);
        setHistory([]);
        return;
      }
      setHistory(result.items);
    };
    void loadHistory();
  }, [historyFrom, historyStudentFilter, historyTo, selectedClass, toast, viewMode]);

  const setStatus = (studentId: string, status: AttendanceStatusValue) => {
    setStudents((prev) =>
      prev.map((item) =>
        item.student_id === studentId
          ? {
              ...item,
              status,
              check_in_time: status === 'present' || status === 'late' ? item.check_in_time || '08:00:00' : null,
              check_out_time: status === 'present' ? item.check_out_time || '16:30:00' : null,
            }
          : item
      )
    );
  };

  const summary = useMemo(() => {
    const total = students.length;
    const present = students.filter((item) => item.status === 'present').length;
    const absent = students.filter((item) => item.status === 'absent').length;
    const late = students.filter((item) => item.status === 'late').length;
    const rate = total === 0 ? 0 : Math.round((present / total) * 100);
    return { total, present, absent, late, rate };
  }, [students]);

  const historyColumns: TableColumn<AttendanceRecord>[] = [
    {
      key: 'attendance_date',
      label: 'Ngày',
      render: (value) => <span className="text-[#64748B]">{new Date(String(value)).toLocaleDateString('vi-VN')}</span>,
    },
    {
      key: 'student_name',
      label: 'Học sinh',
      render: (value, row) => (
        <div>
          <p className="font-medium text-[#1E293B]">{String(value)}</p>
          <p className="text-xs text-[#64748B]">{row.class_name}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (value) => <AttendanceStatusBadge status={String(value)} />,
    },
    {
      key: 'check_in_time',
      label: 'Giờ vào',
      render: (value) => <span className="text-[#64748B]">{value ? String(value).slice(0, 5) : '—'}</span>,
    },
    {
      key: 'note',
      label: 'Ghi chú',
      render: (value) => <span className="text-[#64748B]">{value ? String(value) : '—'}</span>,
    },
  ];

  const handleSave = async () => {
    if (!selectedClass) return;
    setSaving(true);
    const result = await upsertAttendanceBulk(
      students.map((item) => ({
        student_id: item.student_id,
        class_id: Number(selectedClass),
        attendance_date: date,
        status: item.status,
        check_in_time: item.check_in_time,
        check_out_time: item.check_out_time,
        note: item.note,
        created_by: user?.id || null,
      }))
    );
    setSaving(false);
    if (result.error) {
      toast.error('Lưu điểm danh thất bại', result.error.message);
      return;
    }
    toast.success('Lưu điểm danh thành công');
    if (viewMode === 'history') {
      const historyResult = await listAttendanceHistory(Number(selectedClass), historyStudentFilter || undefined, historyFrom || undefined, historyTo || undefined);
      if (!historyResult.error) setHistory(historyResult.items);
    }
  };

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1E293B]">Điểm danh</h1>
          <p className="text-sm text-[#64748B]">Daily roll call + lịch sử điểm danh</p>
        </div>
        <Button size="sm" leftIcon={<CalendarCheck className="w-4 h-4" />} onClick={handleSave} loading={saving}>
          Lưu điểm danh
        </Button>
      </div>

      <Card noPadding>
        <div className="p-4 flex flex-col lg:flex-row gap-3 lg:items-end">
          <Select label="Lớp học" options={classOptions} value={selectedClass} onChange={setSelectedClass} />
          <div className="flex items-center gap-2">
            <button onClick={() => changeDate(-1)} className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-colors" aria-label="Ngày trước">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col gap-1">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 px-3 rounded-xl border border-[#E2E8F0] text-sm text-[#1E293B] outline-none focus:border-primary bg-white"
              />
              <span className="text-xs text-[#64748B] text-center">{formatDate(date)}</span>
            </div>
            <button onClick={() => changeDate(1)} className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-colors" aria-label="Ngày sau">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1 border border-[#E2E8F0] rounded-xl p-1 lg:ml-auto">
            <button
              onClick={() => setViewMode('rollcall')}
              className={`px-3 py-1.5 rounded-lg text-sm ${viewMode === 'rollcall' ? 'bg-primary text-white' : 'text-[#64748B]'}`}
            >
              Roll call
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${viewMode === 'history' ? 'bg-primary text-white' : 'text-[#64748B]'}`}
            >
              <History className="w-4 h-4" />
              History
            </button>
          </div>
        </div>
      </Card>

      {viewMode === 'rollcall' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-emerald-600">{summary.present}</p>
              <p className="text-xs text-[#64748B] mt-1">Có mặt</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-red-500">{summary.absent}</p>
              <p className="text-xs text-[#64748B] mt-1">Vắng</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-amber-500">{summary.late}</p>
              <p className="text-xs text-[#64748B] mt-1">Muộn</p>
            </div>
            <div className="bg-primary/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-primary">{summary.rate}%</p>
              <p className="text-xs text-[#64748B] mt-1">Tỷ lệ</p>
            </div>
          </div>

          <Card header={<CardHeader title="Danh sách điểm danh" subtitle={`${students.length} học sinh`} />} noPadding>
            <div className="divide-y divide-[#F1F5F9]">
              {students.map((student) => (
                <div key={student.student_id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {student.student_name.split(' ').pop()?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">{student.student_name}</p>
                      {student.check_in_time && (
                        <p className="text-xs text-[#64748B]">
                          Vào: {student.check_in_time.slice(0, 5)} · Ra: {student.check_out_time ? student.check_out_time.slice(0, 5) : '—'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AttendanceStatusBadge status={student.status} />
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => setStatus(student.student_id, 'present')}
                        className={`p-2 rounded-lg transition-colors ${
                          student.status === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-emerald-50 hover:text-emerald-600'
                        }`}
                        title="Có mặt"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setStatus(student.student_id, 'absent')}
                        className={`p-2 rounded-lg transition-colors ${
                          student.status === 'absent' ? 'bg-red-100 text-red-500' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-red-50 hover:text-red-500'
                        }`}
                        title="Vắng"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setStatus(student.student_id, 'late')}
                        className={`p-2 rounded-lg transition-colors ${
                          student.status === 'late' ? 'bg-amber-100 text-amber-500' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-amber-50 hover:text-amber-500'
                        }`}
                        title="Muộn"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {students.length === 0 && <div className="p-6 text-center text-sm text-[#64748B]">{loading ? 'Đang tải...' : 'Không có dữ liệu học sinh'}</div>}
            </div>
          </Card>
        </>
      )}

      {viewMode === 'history' && (
        <Card noPadding>
          <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="Lọc theo student id"
              value={historyStudentFilter}
              onChange={(e) => setHistoryStudentFilter(e.target.value)}
              leftAddon={<Search className="w-4 h-4" />}
            />
            <Input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} />
            <Input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} />
            <div className="flex items-end">
              <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />} onClick={() => setViewMode('history')}>
                Áp dụng
              </Button>
            </div>
          </div>

          <Table columns={historyColumns} data={history} rowKey="id" loading={loading} emptyMessage="Không có lịch sử điểm danh" />
        </Card>
      )}
    </div>
  );
}
