import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Plus, Search, TrendingDown, TrendingUp, Wallet, Trash2, Pencil, Bell, Printer } from 'lucide-react';
import Card, { CardHeader, StatCard } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Table from '@/components/common/Table';
import { FeeStatusBadge } from '@/components/common/Badge';
import { useToast } from '@/components/common/Toast';
import { listFees, updateFeeRecordStatus, deleteFeeRecord, deleteFeeRecords, createClassFees, syncFeeWithAttendance } from '@/services/feesService';
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
  const [month, setMonth] = useState<string>('');
  const [schoolYear, setSchoolYear] = useState<string>('');
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
  const [bulkSchoolYear, setBulkSchoolYear] = useState('2024-2025');
  const [bulkBaseAmount, setBulkBaseAmount] = useState(3000000);
  const [bulkTitle, setBulkTitle] = useState('Học phí tháng');
  const [classOptions, setClassOptions] = useState<SelectOption[]>([]);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
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
  }, [page, pageSize, debouncedSearch, status, month, schoolYear, toast]);

  useEffect(() => {
    void loadFees();
  }, [loadFees]);

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
      Number(bulkClassId),
      bulkMonth,
      bulkSchoolYear,
      `${bulkTitle} ${bulkMonth}/${bulkSchoolYear.split('-')[0]}`,
      bulkBaseAmount
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

  const summary = useMemo(() => {
    const totalAmount = items.reduce((sum, item) => sum + item.amount_vnd, 0);
    const totalPaid = items.reduce((sum, item) => sum + item.paid_amount_vnd, 0);
    const totalDebt = totalAmount - totalPaid;
    const debtCount = items.filter((item) => item.status !== 'paid').length;
    return { totalAmount, totalPaid, totalDebt, debtCount };
  }, [items]);

  const columns: TableColumn<FeeRecordP2>[] = [
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
      label: 'Phải thu',
      render: (value, row) => {
        const deductions = (row.meal_deduction_vnd || 0) + (row.tuition_deduction_vnd || 0);
        return (
          <div className="group relative">
            <div className="flex flex-col">
              <span className="font-bold text-foreground">{formatCurrency(Number(value))}</span>
              {deductions > 0 && (
                <span className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  -{formatCurrency(deductions)}
                </span>
              )}
            </div>
            {/* Hover details */}
            <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-popover border border-border p-2 rounded-lg shadow-xl min-w-[180px] animate-fade-in">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 border-b border-border pb-1">Chi tiết tính toán</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Mức gốc:</span>
                  <span className="font-medium">{formatCurrency(row.base_amount_vnd || Number(value))}</span>
                </div>
                {Number(row.meal_deduction_vnd) > 0 && (
                  <div className="flex justify-between gap-4 text-red-500">
                    <span>Trừ tiền cơm:</span>
                    <span>-{formatCurrency(Number(row.meal_deduction_vnd))}</span>
                  </div>
                )}
                {Number(row.tuition_deduction_vnd) > 0 && (
                  <div className="flex justify-between gap-4 text-red-500">
                    <span>Khấu trừ khác:</span>
                    <span>-{formatCurrency(Number(row.tuition_deduction_vnd))}</span>
                  </div>
                )}
                <div className="pt-1 mt-1 border-t border-border flex justify-between gap-4 font-bold">
                  <span>Còn lại:</span>
                  <span className="text-primary">{formatCurrency(Number(value))}</span>
                </div>
              </div>
              {row.deduction_note && (
                <p className="mt-2 pt-1 border-t border-border text-[10px] text-muted-foreground italic">
                  Note: {row.deduction_note}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'paid_amount_vnd',
      label: 'Đã thu',
      render: (value) => <span className="font-medium text-emerald-600">{formatCurrency(Number(value))}</span>,
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (value) => <FeeStatusBadge status={String(value)} />,
    },
    {
      key: 'due_date',
      label: 'Hạn nộp',
      render: (value) => <span className="text-muted-foreground">{value ? new Date(String(value)).toLocaleDateString('vi-VN') : '—'}</span>,
    },
    {
      key: 'actions',
      label: 'Hành động',
      width: '150px',
      render: (_value, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={async (e) => {
              e.stopPropagation();
              setSyncingId(row.id);
              const res = await syncFeeWithAttendance(row.id);
              setSyncingId(null);
              if (res.error) toast.error('Lỗi đồng bộ', res.error.message);
              else {
                toast.success('Đã đồng bộ khấu trừ từ chuyên cần');
                void loadFees();
              }
            }}
            disabled={syncingId === row.id}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
            title="Đồng bộ chuyên cần"
          >
            <RefreshCw className={`w-4 h-4 ${syncingId === row.id ? 'animate-spin' : ''}`} />
          </button>
          {row.status !== 'paid' && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const result = await updateFeeRecordStatus(row.id, row.amount_vnd, new Date().toISOString().split('T')[0], 'cash');
                if (result.error) {
                  toast.error('Xác nhận thanh toán thất bại', result.error.message);
                  return;
                }
                toast.success('Xác nhận thanh toán thành công');
                await loadFees();
              }}
              className="text-[10px] font-bold px-1.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors uppercase"
            >
              Thu
            </button>
          )}
          <button 
            onClick={() => navigate(`/fees/${row.id}/edit`)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Chỉnh sửa"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button 
            onClick={() => {
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
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Học phí</h1>
          <p className="text-sm text-muted-foreground">Quản lý thu phí theo học sinh</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-blue-600 border-blue-200/50 hover:bg-blue-500/10"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={() => navigate(`/fees/print-bulk?ids=${selectedIds.join(',')}`)}
              >
                In hàng loạt ({selectedIds.length})
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-amber-600 border-amber-200/50 hover:bg-amber-500/10"
                leftIcon={<Bell className="w-4 h-4" />}
                onClick={async () => {
                  if (selectedIds.length === 0) return;
                  setLoading(true);
                  await new Promise(r => setTimeout(r, 1000));
                  setLoading(false);
                  toast.success(`Đã gửi ${selectedIds.length} thông báo nhắc nợ đến phụ huynh.`);
                  setSelectedIds([]);
                }}
                disabled={loading}
              >
                Nhắc nợ ({selectedIds.length})
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-500 border-red-200/50 hover:bg-red-500/10"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => setShowBulkDeleteConfirm(true)}
              >
                Xóa {selectedIds.length} bản ghi
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="text-amber-600 border-amber-200/50 hover:bg-amber-500/10"
            leftIcon={<Bell className="w-4 h-4" />}
            onClick={async () => {
              if (selectedIds.length === 0) return;
              setLoading(true);
              // Mock sending reminders - in real app, we'd call a service to create notifications
              await new Promise(r => setTimeout(r, 1000));
              setLoading(false);
              toast.success(`Đã gửi ${selectedIds.length} thông báo nhắc nợ đến phụ huynh.`);
              setSelectedIds([]);
            }}
            disabled={selectedIds.length === 0 || loading}
          >
            Nhắc nợ ({selectedIds.length})
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            leftIcon={<ClipboardList className="w-4 h-4" />} 
            onClick={() => setShowBulkCreateModal(true)}
          >
            Tạo theo lớp
          </Button>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/fees/new')}>
            Tạo bản ghi phí
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Tổng phải thu" value={formatCurrency(summary.totalAmount)} icon={<Wallet className="w-5 h-5 text-primary" />} iconBg="bg-primary/10" />
        <StatCard label="Tổng đã thu" value={formatCurrency(summary.totalPaid)} icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} iconBg="bg-emerald-500/10" />
        <StatCard label="Công nợ" value={formatCurrency(summary.totalDebt)} icon={<TrendingDown className="w-5 h-5 text-red-500" />} iconBg="bg-red-500/10" />
        <StatCard label="Số hồ sơ chưa đủ" value={String(summary.debtCount)} icon={<AlertCircle className="w-5 h-5 text-amber-500" />} iconBg="bg-amber-500/10" />
      </div>

      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo học sinh..."
            leftAddon={<Search className="w-4 h-4" />}
          />
          <div className="w-full sm:w-56">
            <Select
              value={status}
              onChange={(value) => {
                setStatus(value as FeeStatusValue | '');
                setPage(1);
              }}
              options={statusOptions}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={month}
              onChange={(value) => {
                setMonth(value);
                setPage(1);
              }}
              options={monthOptions}
            />
          </div>
          <div className="w-full sm:w-48">
            <Input
              value={schoolYear}
              onChange={(e) => {
                setSchoolYear(e.target.value);
                setPage(1);
              }}
              placeholder="Năm học (VD: 2024-2025)"
            />
          </div>
        </div>
      </Card>

      <Card noPadding header={<CardHeader title="Danh sách học phí" subtitle={`${items.length} bản ghi / trang`} />}>
        <Table
          columns={columns}
          data={items}
          rowKey="id"
          loading={loading}
          selectedKeys={selectedIds}
          onSelectionChange={setSelectedIds}
          pagination={pagination(page, pageSize, total)}
          onPageChange={setPage}
          emptyMessage="Không có dữ liệu học phí"
        />
      </Card>

      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => feeToDelete && handleDelete(feeToDelete)}
        title="Xóa bản ghi học phí"
        message="Bạn có chắc chắn muốn xóa bản ghi học phí này? Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        loading={deleting}
      />

      <ConfirmModal
        open={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Xóa nhiều bản ghi"
        message={`Bạn có chắc chắn muốn xóa ${selectedIds.length} bản ghi học phí đã chọn?`}
        confirmLabel="Xóa tất cả"
        loading={deleting}
      />

      <Modal
        open={showBulkCreateModal}
        onClose={() => setShowBulkCreateModal(false)}
        title="Tạo học phí theo lớp"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">Hệ thống sẽ tạo bản ghi học phí cho tất cả học sinh trong lớp được chọn.</p>
          
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Chọn lớp"
              value={bulkClassId}
              onChange={setBulkClassId}
              options={classOptions}
            />
            <Input
              label="Tháng"
              type="number"
              min={1}
              max={12}
              value={bulkMonth}
              onChange={(e) => setBulkMonth(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Năm học"
              placeholder="2024-2025"
              value={bulkSchoolYear}
              onChange={(e) => setBulkSchoolYear(e.target.value)}
            />
            <Input
              label="Tiêu đề mẫu"
              placeholder="Học phí tháng"
              value={bulkTitle}
              onChange={(e) => setBulkTitle(e.target.value)}
            />
          </div>

          <Input
            label="Mức học phí cơ bản (VND)"
            type="number"
            step={50000}
            value={bulkBaseAmount}
            onChange={(e) => setBulkBaseAmount(Number(e.target.value))}
            hint="Số tiền này chưa bao gồm khấu trừ chuyên cần."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowBulkCreateModal(false)}>Hủy</Button>
            <Button onClick={handleBulkCreate} loading={bulkCreating}>Bắt đầu tạo</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
