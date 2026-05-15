import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarCheck, Check, ChevronLeft, ChevronRight, Clock, Filter, History, Search, X, UserCheck, XCircle } from 'lucide-react';
import Card, { CardHeader } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Table from '@/components/common/Table';
import { AttendanceStatusBadge } from '@/components/common/Badge';
import { useToast } from '@/components/common/Toast';
import { DatePicker } from '@/components/common/DatePicker';
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
  const { role, user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const classIdParam = searchParams.get('classId');

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
  const [historyFrom, setHistoryFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [historyTo, setHistoryTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadClasses = async () => {
      const result = await listClasses({ 
        page: 1, 
        pageSize: 200, 
        sortBy: 'name', 
        sortDirection: 'asc',
        teacherId: role === 'Teacher' ? user?.id : undefined
      });
      if (result.error) {
        toast.error('Không tải được lớp học', result.error.message);
        return;
      }
      const options = result.data.items.map((item) => ({ value: String(item.id), label: item.name }));
      setClassOptions(options);
      
      if (classIdParam) {
        setSelectedClass(classIdParam);
      } else if (options.length > 0) {
        setSelectedClass(options[0].value);
      }
    };
    void loadClasses();
  }, [toast, classIdParam, role, user?.id]);

  useEffect(() => {
    if (!selectedClass) return;
    const loadRollCall = async () => {
      setLoading(true);
      const result = await listAttendanceByClassAndDate({ 
        classId: Number(selectedClass), 
        attendanceDate: date,
        teacherId: role === 'Teacher' ? user?.id : undefined
      });
      setLoading(false);
      if (result.error) {
        toast.error('Không tải được dữ liệu điểm danh', result.error.message);
        setStudents([]);
        return;
      }
      setStudents(result.items);
    };
    void loadRollCall();
  }, [date, selectedClass, toast, role, user?.id]);

  useEffect(() => {
    if (viewMode !== 'history' || !selectedClass) return;
    const loadHistory = async () => {
      setLoading(true);
      const result = await listAttendanceHistory(
        Number(selectedClass),
        undefined, 
        historyFrom || undefined,
        historyTo || undefined,
        role === 'Teacher' ? user?.id : undefined
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
  }, [historyFrom, historyTo, selectedClass, toast, viewMode, role, user?.id]);

  const togglePresent = (studentId: string, currentStatus: AttendanceStatusValue) => {
    const newStatus: AttendanceStatusValue = currentStatus === 'present' ? 'absent' : 'present';
    setStudents((prev) =>
      prev.map((item) =>
        item.student_id === studentId
          ? {
              ...item,
              status: newStatus,
              check_in_time: newStatus === 'present' ? (item.check_in_time || '08:00:00') : null,
              check_out_time: newStatus === 'present' ? (item.check_out_time || '16:30:00') : null,
              meal_included: newStatus === 'present' ? true : false,
            }
          : item
      )
    );
  };

  const summary = useMemo(() => {
    const total = students.length;
    const present = students.filter((item) => item.status === 'present').length;
    const absent = students.filter((item) => item.status === 'absent').length;
    const rate = total === 0 ? 0 : Math.round((present / total) * 100);
    const isSunday = new Date(date).getDay() === 0;
    return { total, present, absent, rate, isSunday };
  }, [students, date]);

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
  ];

  const handleSave = async () => {
    setSaving(true);
    const rows = students.map((s) => ({
      student_id: s.student_id,
      class_id: Number(selectedClass),
      attendance_date: date,
      status: s.status as AttendanceStatusValue,
      check_in_time: s.check_in_time,
      check_out_time: s.check_out_time,
      meal_included: s.meal_included,
    }));
    const result = await upsertAttendanceBulk(rows);
    setSaving(false);
    if (result.error) {
      toast.error('Lưu điểm danh thất bại', result.error.message);
      return;
    }
    toast.success('Đã lưu điểm danh');
  };

  const toggleAll = () => {
    const allPresent = students.every(s => s.status === 'present');
    const newStatus: AttendanceStatusValue = allPresent ? 'absent' : 'present';
    setStudents(prev => prev.map(item => ({
      ...item,
      status: newStatus,
      check_in_time: newStatus === 'present' ? (item.check_in_time || '08:00:00') : null,
      check_out_time: newStatus === 'present' ? (item.check_out_time || '16:30:00') : null,
      meal_included: newStatus === 'present',
    })));
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <Select
            value={selectedClass}
            onChange={(v) => { setSelectedClass(v); setPage(1); }}
            options={classOptions}
            placeholder="Chọn lớp học..."
          />
        </div>
        {selectedClass && (
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'rollcall' ? 'primary' : 'outline'}
              onClick={() => setViewMode('rollcall')}
              leftIcon={<UserCheck className="w-4 h-4" />}
            >
              Điểm danh
            </Button>
            <Button
              variant={viewMode === 'history' ? 'primary' : 'outline'}
              onClick={() => setViewMode('history')}
              leftIcon={<History className="w-4 h-4" />}
            >
              Lịch sử
            </Button>
          </div>
        )}
      </div>

      {viewMode === 'rollcall' && selectedClass && (
        <>
          {/* Date + Actions */}
          <Card noPadding>
            <div className="p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const d = new Date(date);
                    d.setDate(d.getDate() - 1);
                    setDate(d.toISOString().split('T')[0]);
                  }}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <DatePicker date={date} setDate={setDate} />
                <button
                  onClick={() => {
                    const d = new Date(date);
                    d.setDate(d.getDate() + 1);
                    setDate(d.toISOString().split('T')[0]);
                  }}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Đánh dấu tất cả
              </Button>
              <Button
                onClick={handleSave}
                loading={saving}
                leftIcon={<CalendarCheck className="w-4 h-4" />}
              >
                Lưu điểm danh
              </Button>
            </div>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{summary.total}</p>
              <p className="text-xs text-muted-foreground mt-1">Sĩ số</p>
            </div>
            <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-500">{summary.present}</p>
              <p className="text-xs text-muted-foreground mt-1">Có mặt</p>
            </div>
            <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
              <p className="text-2xl font-bold text-red-500">{summary.absent}</p>
              <p className="text-xs text-muted-foreground mt-1">Vắng</p>
            </div>
          </div>

          {/* Student List */}
          <Card noPadding>
            <div className="divide-y divide-border/50">
              {students.map((student) => (
                <React.Fragment key={student.student_id}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-accent/20 ${
                      student.status === 'absent' ? 'bg-red-500/5' : ''
                    }`}
                    onClick={() => togglePresent(student.student_id, student.status)}
                  >
                    {/* Large checkbox / toggle */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      student.status === 'present'
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {student.status === 'present' ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{student.student_name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {student.status === 'present' ? 'Có mặt' : 'Vắng mặt'}
                      </p>
                    </div>

                    {/* Time (present only) */}
                    {student.status === 'present' && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{student.check_in_time?.slice(0, 5) || '08:00'}</span>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              ))}
              {students.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {loading ? 'Đang tải...' : 'Không có dữ liệu học sinh'}
                </div>
              )}
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
                onChange={(e) => {
                  setHistorySearch(e.target.value);
                  setPage(1);
                }}
                leftAddon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                value={historyStatus}
                onChange={(v) => setHistoryStatus(v as any)}
                options={[
                  { value: '', label: 'Tất cả' },
                  { value: 'present', label: 'Có mặt' },
                  { value: 'absent', label: 'Vắng mặt' },
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <DatePicker date={historyFrom} setDate={(d) => { setHistoryFrom(d); setPage(1); }} />
              <span className="text-muted-foreground">/</span>
              <DatePicker date={historyTo} setDate={(d) => { setHistoryTo(d); setPage(1); }} />
            </div>
          </div>
          <Table columns={historyColumns} data={filteredHistory} rowKey="id" loading={loading} emptyMessage="Không có lịch sử điểm danh"
        renderMobileCard={(row) => {
          const r = row as unknown as import('@/types/domain').AttendanceRecord
          return (
            <div className="bg-card border-b border-border p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{r.student_name}</p>
                  <p className="text-xs text-muted-foreground">{r.class_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">{new Date(r.attendance_date).toLocaleDateString('vi-VN')}</p>
                  <span className={
                    r.status === 'present' ? 'text-xs font-medium text-emerald-500' :
                    r.status === 'late' ? 'text-xs font-medium text-amber-500' :
                    'text-xs font-medium text-red-500'
                  }>
                    {r.status === 'present' ? 'Có mặt' : r.status === 'late' ? 'Đi muộn' : 'Vắng'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {r.check_in_time && <span>Giờ vào: {r.check_in_time.slice(0, 5)}</span>}
                {r.check_out_time && <span>Giờ ra: {r.check_out_time.slice(0, 5)}</span>}
              </div>
            </div>
          )
        }}
      />
        </Card>
      )}
    </div>
  );
}
