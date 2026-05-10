import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarCheck, Check, ChevronLeft, ChevronRight, Clock, Filter, History, Search, X, AlertTriangle, Utensils, Pill, Moon, Stethoscope, UserCheck, AlertCircle, FileCheck, MessageSquare, ClipboardCheck } from 'lucide-react';
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const handleStatusChange = (studentId: string, status: AttendanceStatusValue) => {
    setStudents((prev) =>
      prev.map((item) =>
        item.student_id === studentId
          ? {
              ...item,
              status,
              check_in_time: (status === 'present' || status === 'late') ? (item.check_in_time || '08:00:00') : null,
              check_out_time: status === 'present' ? (item.check_out_time || '16:30:00') : null,
              // Auto-enable meal if present/late, disable if absent/excused
              meal_included: (status === 'present' || status === 'late') ? true : false,
              is_hospitalized: (status === 'absent' || status === 'excused') ? item.is_hospitalized : false,
            }
          : item
      )
    );
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, note } : s));
  };

  const handleMedicineChange = (studentId: string, medicine: string) => {
    setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, medicine_instructions: medicine } : s));
  };

  const summary = useMemo(() => {
    const total = students.length;
    const present = students.filter((item) => item.status === 'present').length;
    const absent = students.filter((item) => item.status === 'absent').length;
    const late = students.filter((item) => item.status === 'late').length;
    const excused = students.filter((item) => item.status === 'excused').length;
    const cancelled = students.filter((item) => item.status === 'center_cancelled').length;
    const totalOff = absent + excused;
    const rate = total === 0 ? 0 : Math.round(((present + late) / total) * 100);
    const isSunday = new Date(date).getDay() === 0;
    return { total, present, absent, late, excused, cancelled, totalOff, rate, isSunday };
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
        meal_included: item.meal_included,
        medicine_instructions: item.medicine_instructions,
        sleep_quality: item.sleep_quality,
        is_hospitalized: item.is_hospitalized,
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
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            leftIcon={<UserCheck className="w-4 h-4" />} 
            onClick={() => {
              setStudents(prev => prev.map(s => ({
                ...s, 
                status: 'present',
                check_in_time: s.check_in_time || '08:00:00',
                check_out_time: s.check_out_time || '16:30:00',
                meal_included: true,
                is_hospitalized: false
              })));
              toast.info('Đã đánh dấu tất cả có mặt');
            }}
            disabled={students.length === 0}
          >
            Điểm danh nhanh
          </Button>
          <Button size="sm" leftIcon={<CalendarCheck className="w-4 h-4" />} onClick={handleSave} loading={saving}>
            Lưu điểm danh
          </Button>
        </div>
      </div>

      {summary.isSunday && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-500">Cảnh báo: Hôm nay là Chủ Nhật</p>
            <p className="text-xs text-amber-500/80">Trường thường không hoạt động vào cuối tuần. Hãy kiểm tra kỹ trước khi lưu dữ liệu.</p>
          </div>
        </div>
      )}

      <Card noPadding>
        <div className="p-4 flex flex-col lg:flex-row gap-4 lg:items-center">
          {classOptions.length > 1 ? (
            <div className="min-w-[200px]">
              <Select label="Lớp học" options={classOptions} value={selectedClass} onChange={setSelectedClass} />
            </div>
          ) : (
            <div className="flex flex-col gap-1 px-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lớp học</span>
              <span className="text-sm font-bold text-foreground bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                {classOptions[0]?.label || 'Đang tải...'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button onClick={() => changeDate(-1)} className="p-2.5 rounded-xl border border-border hover:bg-muted transition-colors" aria-label="Ngày trước">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-48">
              <DatePicker
                date={date}
                setDate={setDate}
                clearable={false}
              />
            </div>
            <button onClick={() => changeDate(1)} className="p-2.5 rounded-xl border border-border hover:bg-muted transition-colors" aria-label="Ngày sau">
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
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
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
            <div className="bg-blue-500/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-500">{summary.excused}</p>
              <p className="text-xs text-muted-foreground mt-1">Có phép</p>
            </div>
            <div className="bg-indigo-500/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-indigo-500">{summary.totalOff}</p>
              <p className="text-xs text-muted-foreground mt-1">TT Nghỉ</p>
            </div>
            <div className="bg-primary/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-primary">{summary.rate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Tỷ lệ</p>
            </div>
          </div>

          <Card header={<CardHeader title="Danh sách điểm danh" subtitle={`${students.length} học sinh`} />} noPadding>
            <div className="divide-y divide-border">
              {students.map((student) => (
                <React.Fragment key={student.student_id}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between px-4 py-4 lg:px-5 lg:py-3.5 hover:bg-muted/30 transition-colors border-b border-border last:border-0 gap-4">
                  {/* Top Section: Identity & Primary Status */}
                  <div className="flex items-center justify-between lg:justify-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 lg:w-9 lg:h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                        {student.student_name.split(' ').pop()?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{student.student_name}</p>
                        {student.check_in_time && (
                          <p className="text-[11px] text-muted-foreground">
                            Vào: {student.check_in_time.slice(0, 5)} · Ra: {student.check_out_time ? student.check_out_time.slice(0, 5) : '—'}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Mobile-only status badge */}
                    <div className="lg:hidden">
                      <AttendanceStatusBadge status={student.status} />
                    </div>
                  </div>
                  
                  {/* Actions Section: Responsive Grid/Flex */}
                  <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 flex-1 lg:justify-end">
                    {/* Meal & Hospitalized Toggles */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (student.status === 'absent' || student.status === 'excused') return;
                          setStudents(prev => prev.map(s => s.student_id === student.student_id ? { ...s, meal_included: !s.meal_included } : s));
                        }}
                        disabled={student.status === 'absent' || student.status === 'excused'}
                        className={`h-10 lg:h-9 px-4 lg:px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all border flex-1 sm:flex-none ${
                          student.meal_included 
                            ? 'bg-orange-500 text-white border-orange-600 shadow-sm' 
                            : 'bg-muted/50 text-muted-foreground border-border opacity-40'
                        } ${(student.status === 'absent' || student.status === 'excused') ? 'cursor-not-allowed grayscale' : 'hover:scale-105 active:scale-95'}`}
                        title="Ăn trưa"
                      >
                        <Utensils className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (student.status === 'present' || student.status === 'late') return;
                          setStudents(prev => prev.map(s => s.student_id === student.student_id ? { ...s, is_hospitalized: !s.is_hospitalized } : s));
                        }}
                        disabled={student.status === 'present' || student.status === 'late'}
                        className={`h-10 lg:h-9 px-4 lg:px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all border flex-1 sm:flex-none ${
                          student.is_hospitalized 
                            ? 'bg-red-500 text-white border-red-600 shadow-sm' 
                            : 'bg-muted/50 text-muted-foreground border-border opacity-40'
                        } ${student.status === 'present' || student.status === 'late' ? 'cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                        title="Học sinh nằm viện"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Status Selectors */}
                    <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl">
                      <button
                        onClick={() => handleStatusChange(student.student_id, 'present')}
                        className={`p-2 rounded-lg transition-all ${
                          student.status === 'present' ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-emerald-500/10'
                        }`}
                        title="Có mặt"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStatusChange(student.student_id, 'absent')}
                        className={`p-2 rounded-lg transition-all ${
                          student.status === 'absent' ? 'bg-amber-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-amber-500/10'
                        }`}
                        title="Vắng mặt"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStatusChange(student.student_id, 'late')}
                        className={`p-2 rounded-lg transition-all ${
                          student.status === 'late' ? 'bg-blue-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-blue-500/10'
                        }`}
                        title="Đi muộn"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStatusChange(student.student_id, 'excused')}
                        className={`p-2 rounded-lg transition-all ${
                          student.status === 'excused' ? 'bg-purple-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-purple-500/10'
                        }`}
                        title="Nghỉ có phép"
                      >
                        <ClipboardCheck className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Expandable Details Toggle */}
                    <button
                      onClick={() => setExpandedId(expandedId === student.student_id ? null : student.student_id)}
                      className={`h-10 lg:h-9 w-10 lg:w-9 rounded-xl flex items-center justify-center transition-all border shrink-0 ${
                        expandedId === student.student_id 
                          ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                          : (student.medicine_instructions || student.note)
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                            : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                      }`}
                      title="Chi tiết dặn dò & ghi chú"
                    >
                      <div className="relative">
                        <MessageSquare className="w-4 h-4" />
                        {(student.medicine_instructions || student.note) && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                        )}
                      </div>
                    </button>

                    <div className="hidden lg:block shrink-0">
                      <AttendanceStatusBadge status={student.status} />
                    </div>
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {expandedId === student.student_id && (
                  <div className="px-4 py-4 lg:px-20 bg-muted/20 border-b border-border/50 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1.5">
                          <Pill className="w-3 h-3" /> Dặn thuốc từ phụ huynh
                        </label>
                        <textarea
                          placeholder="Nhập lời dặn thuốc..."
                          value={student.medicine_instructions || ''}
                          onChange={(e) => handleMedicineChange(student.student_id, e.target.value)}
                          rows={2}
                          className="w-full bg-background border border-border/60 rounded-xl p-3 text-xs outline-none focus:border-blue-500/50 transition-all resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                          <MessageSquare className="w-3 h-3" /> Ghi chú của giáo viên
                        </label>
                        <textarea
                          placeholder="Ghi chú về tình trạng của bé..."
                          value={student.note || ''}
                          onChange={(e) => handleNoteChange(student.student_id, e.target.value)}
                          rows={2}
                          className="w-full bg-background border border-border/60 rounded-xl p-3 text-xs outline-none focus:border-primary/50 transition-all resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
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
                  { value: '', label: 'Tất cả trạng thái' },
                  { value: 'present', label: 'Có mặt' },
                  { value: 'absent', label: 'Vắng' },
                  { value: 'late', label: 'Muộn' },
                  { value: 'excused', label: 'Có phép' },
                  { value: 'center_cancelled', label: 'Trung tâm nghỉ' },
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <DatePicker date={historyFrom} setDate={(d) => { setHistoryFrom(d); setPage(1); }} />
              <span className="text-muted-foreground">/</span>
              <DatePicker date={historyTo} setDate={(d) => { setHistoryTo(d); setPage(1); }} />
            </div>
          </div>
          <Table columns={historyColumns} data={filteredHistory} rowKey="id" loading={loading} emptyMessage="Không có lịch sử điểm danh" />
        </Card>
      )}
    </div>
  );
}
