import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import Card, { CardHeader } from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Table from '../components/common/Table';
import { AttendanceStatusBadge } from '../components/common/Badge';
import type { TableColumn, AttendanceStatus, SelectOption } from '../types';

// ─── Mock Data ────────────────────────────────────────────────────────────────

interface AttendanceHistoryRecord {
  id: string;
  student_id: string;
  student_name: string;
  class_id: string;
  class_name: string;
  date: string;
  status: AttendanceStatus;
  check_in_time?: string;
  check_out_time?: string;
  recorded_by: string;
  notes?: string;
}

const mockClasses: SelectOption[] = [
  { value: '', label: 'Tất cả lớp' },
  { value: 'c1', label: 'Lớp Lá A' },
  { value: 'c2', label: 'Lớp Lá B' },
  { value: 'c3', label: 'Lớp Cây A' },
  { value: 'c4', label: 'Lớp Cây B' },
  { value: 'c5', label: 'Lớp Hoa A' },
  { value: 'c6', label: 'Lớp Hoa B' },
];

const mockStudents: { id: string; name: string; class_id: string; class_name: string }[] = [
  { id: 's1', name: 'Nguyễn Minh Khoa', class_id: 'c1', class_name: 'Lớp Lá A' },
  { id: 's2', name: 'Trần Thị Hoa', class_id: 'c1', class_name: 'Lớp Lá A' },
  { id: 's3', name: 'Lê Văn An', class_id: 'c1', class_name: 'Lớp Lá A' },
  { id: 's4', name: 'Phạm Thu Hương', class_id: 'c2', class_name: 'Lớp Lá B' },
  { id: 's5', name: 'Hoàng Đức Long', class_id: 'c2', class_name: 'Lớp Lá B' },
  { id: 's6', name: 'Vũ Thị Mai', class_id: 'c3', class_name: 'Lớp Cây A' },
  { id: 's7', name: 'Đặng Văn Tùng', class_id: 'c3', class_name: 'Lớp Cây A' },
  { id: 's8', name: 'Lý Thị Lan', class_id: 'c4', class_name: 'Lớp Cây B' },
  { id: 's9', name: 'Bùi Văn Đức', class_id: 'c4', class_name: 'Lớp Cây B' },
  { id: 's10', name: 'Ngô Thị Lan', class_id: 'c5', class_name: 'Lớp Hoa A' },
];

function generateMockHistory(days: number = 30): AttendanceHistoryRecord[] {
  const records: AttendanceHistoryRecord[] = [];
  const statuses: AttendanceStatus[] = ['present', 'present', 'present', 'present', 'late', 'absent', 'excused'];

  for (let d = days - 1; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().split('T')[0];

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    mockStudents.forEach((student) => {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const checkIn = status === 'present' || status === 'late'
        ? `${7 + Math.floor(Math.random() * 2)}:${Math.random() > 0.5 ? '30' : '00'}`
        : undefined;
      const checkOut = status === 'present'
        ? `${16 + Math.floor(Math.random() * 2)}:${Math.random() > 0.5 ? '30' : '00'}`
        : undefined;

      records.push({
        id: `${dateStr}-${student.id}`,
        student_id: student.id,
        student_name: student.name,
        class_id: student.class_id,
        class_name: student.class_name,
        date: dateStr,
        status,
        check_in_time: checkIn,
        check_out_time: checkOut,
        recorded_by: 'Nguyễn Thị Mai',
        notes: status === 'absent' ? 'Vắng có phép' : status === 'late' ? 'Đến muộn 15 phút' : undefined,
      });
    });
  }
  return records;
}

const mockHistory = generateMockHistory(30);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(n: number): string {
  return n.toLocaleString('vi-VN') + ' đ';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AttendanceHistory() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [sortState, setSortState] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc',
  });

  const pageSize = 15;

  // Filter
  const filtered = useMemo(() => {
    return mockHistory.filter((r) => {
      const matchSearch =
        !search ||
        r.student_name.toLowerCase().includes(search.toLowerCase()) ||
        r.class_name.toLowerCase().includes(search.toLowerCase());
      const matchClass = !filterClass || r.class_id === filterClass;
      const matchStatus = !filterStatus || r.status === filterStatus;
      const matchFrom = !dateRange.from || r.date >= dateRange.from;
      const matchTo = !dateRange.to || r.date <= dateRange.to;
      return matchSearch && matchClass && matchStatus && matchFrom && matchTo;
    });
  }, [search, filterClass, filterStatus, dateRange]);

  // Sort
  const sorted = useMemo(() => {
    const sortedData = [...filtered].sort((a, b) => {
      let aVal: string | number = a[sortState.key as keyof AttendanceHistoryRecord] as string || '';
      let bVal: string | number = b[sortState.key as keyof AttendanceHistoryRecord] as string || '';
      if (sortState.key === 'amount') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }
      if (aVal < bVal) return sortState.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortState.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortedData;
  }, [filtered, sortState]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  const totalPages = Math.ceil(sorted.length / pageSize);

  const handleSort = (key: string) => {
    setSortState((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Stats
  const stats = useMemo(() => {
    const total = filtered.length;
    const present = filtered.filter((r) => r.status === 'present').length;
    const absent = filtered.filter((r) => r.status === 'absent').length;
    const late = filtered.filter((r) => r.status === 'late').length;
    const excused = filtered.filter((r) => r.status === 'excused').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, excused, rate };
  }, [filtered]);

  // Table columns
  const columns: TableColumn<AttendanceHistoryRecord>[] = [
    {
      key: 'date',
      label: 'Ngày',
      sortable: true,
      width: '120px',
      render: (v) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
          <span>{formatDate(String(v))}</span>
        </div>
      ),
    },
    {
      key: 'student_name',
      label: 'Học sinh',
      sortable: true,
      render: (v, row) => (
        <div>
          <p className="font-medium text-[#1E293B]">{String(v)}</p>
          <p className="text-xs text-[#64748B]">{row.class_name}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      sortable: true,
      render: (v) => <AttendanceStatusBadge status={String(v)} />,
    },
    {
      key: 'check_in_time',
      label: 'Giờ vào',
      width: '100px',
      render: (v) => (
        <span className="text-[#64748B] text-sm">{v ? String(v) : '—'}</span>
      ),
    },
    {
      key: 'check_out_time',
      label: 'Giờ ra',
      width: '100px',
      render: (v) => (
        <span className="text-[#64748B] text-sm">{v ? String(v) : '—'}</span>
      ),
    },
    {
      key: 'recorded_by',
      label: 'Người ghi',
      render: (v) => <span className="text-sm text-[#64748B]">{String(v)}</span>,
    },
    {
      key: 'notes',
      label: 'Ghi chú',
      render: (v) => (
        <span className="text-sm text-[#64748B] italic">{v ? String(v) : '—'}</span>
      ),
    },
  ];

  const statusOptions: SelectOption[] = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'present', label: 'Có mặt' },
    { value: 'late', label: 'Đi muộn' },
    { value: 'absent', label: 'Vắng mặt' },
    { value: 'excused', label: 'Có phép' },
  ];

  const changeDate = (delta: number) => {
    const from = dateRange.from ? new Date(dateRange.from) : new Date();
    from.setDate(from.getDate() + delta);
    setDateRange((p) => ({ ...p, from: from.toISOString().split('T')[0] }));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1E293B]">Lịch sử điểm danh</h1>
          <p className="text-sm text-[#64748B]">{sorted.length} bản ghi</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
          >
            Xuất Excel
          </Button>
          <Button
            size="sm"
            leftIcon={<Calendar className="w-4 h-4" />}
            onClick={() => navigate('/attendance')}
          >
            Điểm danh hôm nay
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#1E293B]">{stats.total}</p>
          <p className="text-xs text-[#64748B] mt-1">Tổng bản ghi</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.present}</p>
          <p className="text-xs text-emerald-600 mt-1">Có mặt</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{stats.absent}</p>
          <p className="text-xs text-red-500 mt-1">Vắng mặt</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{stats.late}</p>
          <p className="text-xs text-amber-500 mt-1">Đi muộn</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-500">{stats.excused}</p>
          <p className="text-xs text-blue-500 mt-1">Có phép</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats.rate}%</p>
          <p className="text-xs text-primary mt-1">Tỷ lệ</p>
        </div>
      </div>

      {/* Filters */}
      <Card noPadding>
        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1">
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm kiếm học sinh..."
                leftAddon={<Search className="w-4 h-4" />}
              />
            </div>

            {/* Class filter */}
            <div className="w-full sm:w-44">
              <Select
                options={mockClasses}
                value={filterClass}
                onChange={(v) => {
                  setFilterClass(v);
                  setCurrentPage(1);
                }}
                placeholder="Lớp học"
              />
            </div>

            {/* Status filter */}
            <div className="w-full sm:w-44">
              <Select
                options={statusOptions}
                value={filterStatus}
                onChange={(v) => {
                  setFilterStatus(v);
                  setCurrentPage(1);
                }}
                placeholder="Trạng thái"
              />
            </div>
          </div>

          {/* Date range */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeDate(-7)}
                className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-colors"
                aria-label="Tuần trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) =>
                    setDateRange((p) => ({ ...p, from: e.target.value }))
                  }
                  className="w-36"
                />
                <span className="text-[#64748B]">–</span>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) =>
                    setDateRange((p) => ({ ...p, to: e.target.value }))
                  }
                  className="w-36"
                />
              </div>
              <button
                onClick={() => changeDate(7)}
                className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-colors"
                aria-label="Tuần sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Filter className="w-4 h-4" />}
              >
                Lọc
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setFilterClass('');
                  setFilterStatus('');
                  setDateRange({ from: '', to: '' });
                  setCurrentPage(1);
                }}
              >
                Đặt lại
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card
        noPadding
        header={
          <CardHeader
            title="Danh sách điểm danh"
            subtitle={`${filtered.length} bản ghi trong ${mockHistory.length > 0 ? '30' : '0'} ngày`}
          />
        }
      >
        <Table
          columns={columns as unknown as TableColumn<Record<string, unknown>>[]}
          data={paginatedData as unknown as Record<string, unknown>[]}
          rowKey="id"
          pagination={{
            page: currentPage,
            pageSize,
            total: sorted.length,
            totalPages,
          }}
          onPageChange={setCurrentPage}
          sortState={sortState}
          onSort={handleSort}
          emptyMessage="Không có bản ghi điểm danh nào"
        />
      </Card>
    </div>
  );
}