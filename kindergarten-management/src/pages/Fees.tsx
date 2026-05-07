import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Plus, Search, TrendingDown, TrendingUp, Wallet, Trash2, Pencil } from 'lucide-react';
import Card, { CardHeader, StatCard } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Table from '@/components/common/Table';
import { FeeStatusBadge } from '@/components/common/Badge';
import { useToast } from '@/components/common/Toast';
import { listFees, updateFeeRecordStatus, deleteFeeRecord, deleteFeeRecords } from '@/services/feesService';
import { ConfirmModal } from '@/components/common/Modal';
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
          <p className="font-medium text-[#1E293B]">{String(value)}</p>
          <p className="text-xs text-[#64748B]">
            {row.class_name} · {row.title || 'Học phí'}
          </p>
        </div>
      ),
    },
    {
      key: 'amount_vnd',
      label: 'Phải thu',
      render: (value) => <span className="font-medium text-[#1E293B]">{formatCurrency(Number(value))}</span>,
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
      render: (value) => <span className="text-[#64748B]">{value ? new Date(String(value)).toLocaleDateString('vi-VN') : '—'}</span>,
    },
    {
      key: 'actions',
      label: 'Hành động',
      width: '120px',
      render: (_value, row) => (
        <div className="flex items-center gap-1">
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
              className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            >
              Xác nhận
            </button>
          )}
          <button 
            onClick={() => navigate(`/fees/${row.id}/edit`)}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-primary hover:bg-primary/10 transition-colors"
            title="Chỉnh sửa"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button 
            onClick={() => {
              setFeeToDelete(row.id);
              setShowDeleteConfirm(true);
            }}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-500 hover:bg-red-50 transition-colors"
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
          <h1 className="text-xl font-bold text-[#1E293B]">Học phí</h1>
          <p className="text-sm text-[#64748B]">Quản lý thu phí theo học sinh</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-red-500 border-red-200 hover:bg-red-50"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => setShowBulkDeleteConfirm(true)}
            >
              Xóa {selectedIds.length} bản ghi
            </Button>
          )}
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/fees/new')}>
            Tạo bản ghi phí
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Tổng phải thu" value={formatCurrency(summary.totalAmount)} icon={<Wallet className="w-5 h-5 text-primary" />} iconBg="bg-primary/10" />
        <StatCard label="Tổng đã thu" value={formatCurrency(summary.totalPaid)} icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} iconBg="bg-emerald-50" />
        <StatCard label="Công nợ" value={formatCurrency(summary.totalDebt)} icon={<TrendingDown className="w-5 h-5 text-red-500" />} iconBg="bg-red-50" />
        <StatCard label="Số hồ sơ chưa đủ" value={String(summary.debtCount)} icon={<AlertCircle className="w-5 h-5 text-amber-500" />} iconBg="bg-amber-50" />
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
    </div>
  );
}
