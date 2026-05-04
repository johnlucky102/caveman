import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Plus, Search, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import Card, { CardHeader, StatCard } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Table from '@/components/common/Table';
import { FeeStatusBadge } from '@/components/common/Badge';
import { useToast } from '@/components/common/Toast';
import { listFees, updateFeeRecordStatus } from '@/services/feesService';
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
  const [status, setStatus] = useState<FeeStatusValue | ''>('');
  const [items, setItems] = useState<FeeRecordP2[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;

  const statusOptions: SelectOption[] = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'unpaid', label: 'Chưa thanh toán' },
    { value: 'partial', label: 'Thanh toán 1 phần' },
    { value: 'paid', label: 'Đã thanh toán' },
  ];

  const loadFees = async () => {
    setLoading(true);
    const result = await listFees({ page, pageSize, search, status: status || undefined });
    setLoading(false);
    if (result.error) {
      toast.error('Không tải được danh sách học phí', result.error.message);
      setItems([]);
      setTotal(0);
      return;
    }
    setItems(result.data.items);
    setTotal(result.data.total);
  };

  useEffect(() => {
    void loadFees();
  }, [page, search, status]);

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
            {row.class_name} · {row.fee_type_name}
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
      render: (_value, row) => (
        <div className="flex items-center gap-2">
          {row.status !== 'paid' && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const result = await updateFeeRecordStatus(row.id, row.amount_vnd, new Date().toISOString().split('T')[0], 'cash');
                if (result.error) {
                  toast.error('Cập nhật trạng thái thất bại', result.error.message);
                  return;
                }
                toast.success('Đã đánh dấu thanh toán đủ');
                await loadFees();
              }}
              className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            >
              Mark paid
            </button>
          )}
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
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/fees/new')}>
          Tạo bản ghi phí
        </Button>
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
            placeholder="Tìm theo học sinh hoặc loại phí..."
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
        </div>
      </Card>

      <Card noPadding header={<CardHeader title="Danh sách học phí" subtitle={`${items.length} bản ghi / trang`} />}>
        <Table
          columns={columns}
          data={items}
          rowKey="id"
          loading={loading}
          pagination={pagination(page, pageSize, total)}
          onPageChange={setPage}
          emptyMessage="Không có dữ liệu học phí"
        />
      </Card>
    </div>
  );
}
