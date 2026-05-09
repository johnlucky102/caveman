import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Check, ChevronLeft, ChevronRight, Clock, Filter, History, Search, X, AlertTriangle } from 'lucide-react';
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
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState<AttendanceStatusValue | ''>('');
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
      const result = await listAttendanceHistory(
        Number(selectedClass),
        undefined, // We filter student name client-side for simplicity since we get all for the class
        historyFrom || undefined,
        historyTo || undefined
      );
      setLoading(false);
      if (result.error) {
        toast.error('Không tải được lịch sử điểm danh', result.error.message);
        setHistory([]);
        return;
      }
      setHistory(result.items);
    };
    void loadHistory();
  }, [historyFrom, historyTo, selectedClass, toast, viewMode]);

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
    const excused = students.filter((item) => item.status === 'excused').length;
    const rate = total === 0 ? 0 : Math.round(((present + late) / total) * 100);
    return { total, present, absent, late, excused, rate };
  }, [students]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchSearch = !historySearch || item.student_name.toLowerCase().includes(historySearch.toLowerCase());
      const matchStatus = !historyStatus || item.status === historyStatus;
      return matchSearch && matchStatus;
    });
  }, [history, historySearch, historyStatus]);

  const historyColumns: TableColumn<AttendanceRecord>[] = [
    {
      key: 'attendance_date',
      label: 'Ngày',
      render: (value) => <span className="text-muted-foreground">{new Date(String(value)).toLocaleDateString('vi-VN')}</span>,
    },
    {
      key: 'student_name',
      label: 'Học sinh',
      render: (value, row) => (
        <div>
          <p className="font-medium text-foreground">{String(value)}</p>
          <p className="text-xs text-muted-foreground">{row.class_name}</p>
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
      render: (value) => <span className="text-muted-foreground">{value ? String(value).slice(0, 5) : '—'}</span>,
    },
    {
      key: 'note',
      label: 'Ghi chú',
      render: (value) => <span className="text-muted-foreground">{value ? String(value) : '—'}</span>,
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
      const historyResult = await listAttendanceHistory(Number(selectedClass), undefined, historyFrom || undefined, historyTo || undefined);
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
          <h1 className="text-xl font-bold text-foreground">Điểm danh</h1>
          <p className="text-sm text-muted-foreground">Daily roll call + lịch sử điểm danh</p>
        </div>
        <Button size="sm" leftIcon={<CalendarCheck className="w-4 h-4" />} onClick={handleSave} loading={saving}>
          Lưu điểm danh
        </Button>
      </div>

      <Card noPadding>
        <div className="p-4 flex flex-col lg:flex-row gap-3 lg:items-end">
          <Select label="Lớp học" options={classOptions} value={selectedClass} onChange={setSelectedClass} />
          <div className="flex items-center gap-2">
            <button onClick={() => changeDate(-1)} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors" aria-label="Ngày trước">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col gap-1">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 px-3 rounded-xl border border-border text-sm text-foreground outline-none focus:border-primary bg-background"
              />
              <span className="text-xs text-muted-foreground text-center">{formatDate(date)}</span>
            </div>
            <button onClick={() => changeDate(1)} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors" aria-label="Ngày sau">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex border-b border-border lg:ml-auto">
            <button
              onClick={() => setViewMode('rollcall')}
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                viewMode === 'rollcall' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Điểm danh hôm nay
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                viewMode === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="w-4 h-4" />
              Lịch sử điểm danh
            </button>
          </div>
        </div>
      </Card>

      {viewMode === 'rollcall' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-500/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-emerald-500">{summary.present}</p>
              <p className="text-xs text-muted-foreground mt-1">Có mặt</p>
            </div>
            <div className="bg-red-500/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-red-500">{summary.absent}</p>
              <p className="text-xs text-muted-foreground mt-1">Vắng</p>
            </div>
            <div className="bg-amber-500/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-amber-500">{summary.late}</p>
              <p className="text-xs text-muted-foreground mt-1">Muộn</p>
            </div>
            <div className="bg-primary/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-primary">{summary.rate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Tỷ lệ</p>
            </div>
          </div>

          <Card header={<CardHeader title="Danh sách điểm danh" subtitle={`${students.length} học sinh`} />} noPadding>
            <div className="divide-y divide-border">
              {students.map((student) => (
                <div key={student.student_id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {student.student_name.split(' ').pop()?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{student.student_name}</p>
                      {student.check_in_time && (
                        <p className="text-xs text-muted-foreground">
                          Vào: {student.check_in_time.slice(0, 5)} · Ra: {student.check_out_time ? student.check_out_time.slice(0, 5) : '—'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setStatus(student.student_id, 'present')}
                        className={`p-2 rounded-lg transition-colors ${
                          student.status === 'present' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500'
                        }`}
                        title="Có mặt"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setStatus(student.student_id, 'absent')}
                        className={`p-2 rounded-lg transition-colors ${
                          student.status === 'absent' ? 'bg-red-500/20 text-red-500' : 'bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500'
                        }`}
                        title="Vắng"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setStatus(student.student_id, 'late')}
                        className={`p-2 rounded-lg transition-colors ${
                          student.status === 'late' ? 'bg-amber-500/20 text-amber-500' : 'bg-muted text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500'
                        }`}
                        title="Muộn"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setStatus(student.student_id, 'excused')}
                        className={`p-2 rounded-lg transition-colors ${
                          student.status === 'excused' ? 'bg-blue-500/20 text-blue-500' : 'bg-muted text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500'
                        }`}
                        title="Nghỉ có phép"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Ghi chú..."
                      value={student.note || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStudents(prev => prev.map(s => s.student_id === student.student_id ? { ...s, note: val } : s));
                      }}
                      className="h-9 px-3 rounded-lg border border-border bg-card text-xs text-foreground outline-none focus:border-primary w-full sm:w-40"
                    />
                    <AttendanceStatusBadge status={student.status} />
                  </div>
                </div>
              ))}
              {students.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">{loading ? 'Đang tải...' : 'Không có dữ liệu học sinh'}</div>}
            </div>
          </Card>
        </>
      )}

      {viewMode === 'history' && (
        <Card noPadding>
          <div className="p-4 flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Tìm học sinh..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                leftAddon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                value={historyStatus}
                onChange={(v) => setHistoryStatus(v as any)}
                options={[
                  { value: '', label: 'Tất cả trạng thái' },
                  { value: 'present', label: 'Có mặt' },
                  { value: 'absent', label: 'Vắng' },
                  { value: 'late', label: 'Muộn' },
                  { value: 'excused', label: 'Có phép' },
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <Input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} />
              <span className="text-muted-foreground">/</span>
              <Input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} />
            </div>
          </div>
          <Table columns={historyColumns} data={filteredHistory} rowKey="id" loading={loading} emptyMessage="Không có lịch sử điểm danh" />
        </Card>
      )}
    </div>
  );
}
