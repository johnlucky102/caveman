import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { calendarYearFromSchoolMonth, getCurrentSchoolYear } from '@/utils/schoolYearCalendar';
import { AlertCircle, Plus, Search, TrendingDown, TrendingUp, Wallet, Trash2, Pencil, Bell, Printer } from 'lucide-react';
import Card, { CardHeader, StatCard } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Table from '@/components/common/Table';
import { FeeStatusBadge } from '@/components/common/Badge';
import { useToast } from '@/components/common/Toast';
import CurrencyInput from '@/components/common/CurrencyInput';
import { listFees, getFeeSummary, updateFeeRecordStatus, deleteFeeRecord, deleteFeeRecords, createClassFees, syncFeeWithAttendance } from '@/services/feesService';
import { listClasses } from '@/services/classesService';
import Modal, { ConfirmModal } from '@/components/common/Modal';
import { RefreshCw, ClipboardList } from 'lucide-react';
import type { PaginationMeta, SelectOption, TableColumn } from '@/types';
import type { FeeRecordP2, FeeStatusValue } from '@/types/domain';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
}

function pagination(page: number, pageSize: number, total: number): PaginationMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export default function Fees() {
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<FeeStatusValue | ''>('');
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [classId, setClassId] = useState<string>('');
  const [schoolYear, setSchoolYear] = useState<string>(getCurrentSchoolYear());
  const [items, setItems] = useState<FeeRecordP2[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [feeToDelete, setFeeToDelete] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkMonth, setBulkMonth] = useState(new Date().getMonth() + 1);
  const [bulkSchoolYear, setBulkSchoolYear] = useState(getCurrentSchoolYear());
  const [bulkBaseAmount, setBulkBaseAmount] = useState(3000000);
  const [bulkTitle, setBulkTitle] = useState('Học phí tháng');
  const [classOptions, setClassOptions] = useState<SelectOption[]>([]);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [summary, setSummary] = useState({ totalAmount: 0, totalPaid: 0, totalDebt: 0, debtCount: 0 });
  const pageSize = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const statusOptions: SelectOption[] = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'unpaid', label: 'Chưa thanh toán' },
    { value: 'partial', label: 'Thanh toán 1 phần' },
    { value: 'paid', label: 'Đã thanh toán' },
  ];

  const monthOptions: SelectOption[] = [
    { value: '', label: 'Tất cả các tháng' },
    ...Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1),
      label: `Tháng ${i + 1}`,
    })),
  ];

  const loadFees = useCallback(async () => {
    setLoading(true);
    const result = await listFees({
      page,
      pageSize,
      search: debouncedSearch,
      status: status || undefined,
      month: month ? Number(month) : undefined,
      classId: classId ? Number(classId) : undefined,
      schoolYear: schoolYear || undefined,
    });
    setLoading(false);
    if (result.error) {
      toast.error('Không tải được danh sách học phí', result.error.message);
      setItems([]);
      setTotal(0);
      return;
    }
    setItems(result.data.items);
    setTotal(result.data.total);
  }, [page, pageSize, debouncedSearch, status, month, classId, schoolYear, toast]);

  const loadSummary = useCallback(async () => {
    const result = await getFeeSummary({
      page: 1,
      pageSize: 9999,
      search: debouncedSearch,
      status: status || undefined,
      month: month ? Number(month) : undefined,
      classId: classId ? Number(classId) : undefined,
      schoolYear: schoolYear || undefined,
    });
    if (result.data) {
      setSummary(result.data);
    }
  }, [debouncedSearch, status, month, classId, schoolYear]);

  useEffect(() => {
    void loadFees();
    void loadSummary();
  }, [loadFees, loadSummary]);

  useEffect(() => {
    const loadClasses = async () => {
      const result = await listClasses({ page: 1, pageSize: 200, sortBy: 'name', sortDirection: 'asc' });
      if (result.data) {
        setClassOptions(result.data.items.map(c => ({ value: String(c.id), label: c.name })));
        if (result.data.items.length > 0) setBulkClassId(String(result.data.items[0].id));
      }
    };
    void loadClasses();
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    const result = await deleteFeeRecord(id);
    setDeleting(false);
    setFeeToDelete(null);
    setShowDeleteConfirm(false);
    if (result.error) {
      toast.error('Lỗi', result.error.message);
    } else {
      toast.success('Đã xóa bản ghi học phí');
      void loadFees();
    }
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    const result = await deleteFeeRecords(selectedIds);
    setDeleting(false);
    setShowBulkDeleteConfirm(false);
    if (result.error) {
      toast.error('Lỗi', result.error.message);
    } else {
      toast.success(`Đã xóa ${selectedIds.length} bản ghi học phí`);
      setSelectedIds([]);
      void loadFees();
    }
  };

  const handleBulkCreate = async () => {
    if (!bulkClassId) {
      toast.error('Vui lòng chọn lớp học');
      return;
    }
    setBulkCreating(true);
    const result = await createClassFees(
      { classId: Number(bulkClassId), month: bulkMonth, schoolYear: bulkSchoolYear },
      1,
      bulkBaseAmount,
      []
    );
    setBulkCreating(false);
    if (result.error) {
      toast.error('Lỗi khi tạo hàng loạt', result.error.message);
    } else {
      toast.success('Đã tạo học phí cho toàn bộ học sinh trong lớp');
      setShowBulkCreateModal(false);
      void loadFees();
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(i => i.id));
    }
  };

  const columns: TableColumn<FeeRecordP2>[] = [
    {
      key: '_select',
      label: (
        <input
          type="checkbox"
          checked={items.length > 0 && selectedIds.length === items.length}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
        />
      ),
      width: '40px',
      render: (_value, row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={() => toggleSelect(row.id)}
          className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
        />
      ),
    },
    {
      key: 'student_name',
      label: 'Học sinh',
      render: (value, row) => (
        <div>
          <p className="font-medium text-foreground">{String(value)}</p>
          <p className="text-xs text-muted-foreground">
            {row.class_name} · {row.title || 'Học phí'}
          </p>
        </div>
      ),
    },
    {
      key: 'amount_vnd',
      label: 'Số tiền',
      render: (value, row) => (
        <div className="text-right">
          <p className="font-medium">{formatCurrency(Number(value))}</p>
          {row.base_amount_vnd > Number(value) && (
            <p className="text-xs text-red-500">
              Đã giảm {formatCurrency(row.base_amount_vnd - Number(value))}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'attendance_deduction_vnd',
      label: 'Khấu trừ vắng',
      render: (value) => (
        <span className={Number(value) > 0 ? 'text-red-500' : 'text-muted-foreground'}>
          {Number(value) > 0 ? `-${formatCurrency(Number(value))}` : '—'}
        </span>
      ),
    },
    {
      key: 'paid_amount_vnd',
      label: 'Đã thu',
      render: (value, row) => (
        <div className="text-right">
          <p className={row.paid_amount_vnd >= row.amount_vnd ? 'text-emerald-500 font-medium' : ''}>
            {formatCurrency(Number(value))}
          </p>
          {row.paid_amount_vnd < row.amount_vnd && row.paid_amount_vnd > 0 && (
            <p className="text-xs text-amber-500">
              Còn {formatCurrency(row.amount_vnd - row.paid_amount_vnd)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'month',
      label: 'Tháng',
      render: (value) => (
        <span className="text-muted-foreground">
          {value !== null && value !== undefined ? `T${String(value)}` : ''}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (value) => <FeeStatusBadge status={String(value)} />,
    },
    {
      key: 'actions',
      label: '',
      width: '60px',
      render: (_value, row) => (
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/fees/${row.id}`);
            }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Chỉnh sửa"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFeeToDelete(row.id);
              setShowDeleteConfirm(true);
            }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Học phí</h1>
          <p className="text-sm text-muted-foreground">Quản lý các khoản thu và tình trạng thanh toán</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowBulkCreateModal(true)}
          >
            Tạo hàng loạt
          </Button>
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/fees/new')}
          >
            Tạo phiếu thu
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 min-w-0">
            <Input
              placeholder="Tìm học sinh..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              leftAddon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Select
              value={status}
              onChange={(v) => { setStatus(v as FeeStatusValue | ''); setPage(1); }}
              options={statusOptions}
              placeholder="Trạng thái"
            />
            <Select
              value={month}
              onChange={(v) => { setMonth(v); setPage(1); }}
              options={monthOptions}
              placeholder="Tháng"
            />
            <Select
              value={classId}
              onChange={(v) => { setClassId(v); setPage(1); }}
              options={[{ value: '', label: 'Tất cả lớp' }, ...classOptions]}
              placeholder="Lớp học"
            />
            <Select
              value={schoolYear}
              onChange={(v) => { setSchoolYear(v); setPage(1); }}
              options={[{ value: '', label: 'Tất cả năm' }, ...Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                const value = `${year}-${year + 1}`;
                return { value, label: value };
              })]}
              placeholder="Năm học"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Tổng" value={formatCurrency(summary.totalAmount)} icon={<Wallet className="w-4 h-4" />} />
        <StatCard label="Đã thu" value={formatCurrency(summary.totalPaid)} icon={<TrendingDown className="w-4 h-4" />} variant="success" />
        <StatCard label="Còn nợ" value={formatCurrency(summary.totalDebt)} icon={<TrendingUp className="w-4 h-4" />} variant="warning" />
        <StatCard label="Số nợ" value={summary.debtCount} icon={<AlertCircle className="w-4 h-4" />} variant="danger" />
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <p className="text-sm font-medium">Đã chọn <span className="font-bold">{selectedIds.length}</span> phiếu thu</p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => setShowBulkDeleteConfirm(true)}
            >
              Xóa {selectedIds.length} phiếu
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Table
        columns={columns}
        data={items}
        rowKey="id"
        loading={loading}
        pagination={pagination(page, pageSize, total)}
        onPageChange={setPage}
        emptyMessage="Không có phiếu thu nào"
      />

      {/* Modals */}
      <Modal
        open={showBulkCreateModal}
        onClose={() => setShowBulkCreateModal(false)}
        title="Tạo học phí hàng loạt"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Hệ thống sẽ tạo phiếu thu cho toàn bộ học sinh trong lớp được chọn.</p>
          
          <Select
            label="Lớp học"
            value={bulkClassId}
            onChange={setBulkClassId}
            options={classOptions}
            required
            fullWidth
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tháng"
              value={String(bulkMonth)}
              onChange={(v) => setBulkMonth(Number(v))}
              options={monthOptions.filter(o => o.value !== '')}
              required
              fullWidth
            />
            <Select
              label="Năm học"
              value={bulkSchoolYear}
              onChange={setBulkSchoolYear}
              options={Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                const value = `${year}-${year + 1}`;
                return { value, label: value };
              })}
              required
              fullWidth
            />
          </div>

          <Input
            label="Tên khoản thu"
            value={bulkTitle}
            onChange={(e) => setBulkTitle(e.target.value)}
            placeholder="VD: Học phí tháng"
          />

          <CurrencyInput
            label="Số tiền gốc"
            value={String(bulkBaseAmount)}
            onChange={(v) => setBulkBaseAmount(Number(v))}
            required
          />

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowBulkCreateModal(false)} className="flex-1">Hủy</Button>
            <Button onClick={handleBulkCreate} loading={bulkCreating} className="flex-1">Tạo phiếu</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title={`Xóa ${selectedIds.length} phiếu thu?`}
        message="Hành động này không thể hoàn tác."
        confirmLabel="Xóa tất cả"
        cancelLabel="Hủy"
        variant="danger"
        loading={deleting}
      />

      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => handleDelete(feeToDelete!)}
        title="Xóa phiếu thu?"
        message="Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}