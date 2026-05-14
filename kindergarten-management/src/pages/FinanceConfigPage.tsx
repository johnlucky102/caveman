import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calculator, Pencil, Save, Search, X } from 'lucide-react';
import Card, { CardHeader, StatCard } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import CurrencyInput from '@/components/common/CurrencyInput';
import Table, { type SortState } from '@/components/common/Table';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import { useToast } from '@/components/common/Toast';
import { listFinanceConfigs, updateFinanceConfig } from '@/services/financeConfigService';
import { useAuthStore } from '@/stores/authStore';
import { canManageFinance } from '@/lib/rbac';
import type { PaginationMeta, TableColumn } from '@/types';
import type { ClassFinanceConfig, UpdateFinanceConfigInput } from '@/types/domain';

function paginate(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

interface EditFormState {
  class_type: 'Daycare' | 'Evening';
  meal_rate: string;
  cancel_rate: string;
}

export default function FinanceConfigPage() {
  const toast = useToast();
  const { role } = useAuthStore();
  const hasAccess = canManageFinance(role);

  const [items, setItems] = useState<ClassFinanceConfig[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortState, setSortState] = useState<SortState>({ key: 'class_name', direction: 'asc' });
  const [editTarget, setEditTarget] = useState<ClassFinanceConfig | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    class_type: 'Daycare',
    meal_rate: '20000',
    cancel_rate: '50000',
  });
  const pageSize = 15;

  const loadConfigs = useCallback(async () => {
    if (!hasAccess) return;
    setLoading(true);
    const result = await listFinanceConfigs({
      page,
      pageSize,
      search,
      sortBy: sortState.key as 'class_name' | 'class_type' | 'created_at',
      sortDirection: sortState.direction,
    });
    setLoading(false);
    if (result.error) {
      toast.error('Không tải được cấu hình tài chính', result.error.message);
      setItems([]);
      setTotal(0);
      return;
    }
    setItems(result.data.items);
    setTotal(result.data.total);
  }, [page, pageSize, search, sortState.direction, sortState.key, toast, hasAccess]);

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const meta = useMemo(() => paginate(page, pageSize, total), [page, pageSize, total]);

  const daycareCount = useMemo(() => items.filter((i) => i.class_type === 'Daycare').length, [items]);
  const eveningCount = useMemo(() => items.filter((i) => i.class_type === 'Evening').length, [items]);

  const openEdit = (config: ClassFinanceConfig) => {
    setEditTarget(config);
    setEditForm({
      class_type: config.class_type,
      meal_rate: String(config.meal_rate),
      cancel_rate: String(config.cancel_rate),
    });
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    const payload: UpdateFinanceConfigInput = {
      class_type: editForm.class_type,
      meal_rate: Number(editForm.meal_rate),
      cancel_rate: Number(editForm.cancel_rate),
    };
    const result = await updateFinanceConfig(editTarget.class_id, payload);
    setSaving(false);
    if (result.error) {
      toast.error('Cập nhật thất bại', result.error.message);
      return;
    }
    toast.success(`Đã cập nhật cấu hình cho lớp ${editTarget.class_name || editTarget.class_id}`);
    setEditTarget(null);
    void loadConfigs();
  };

  const columns: TableColumn<ClassFinanceConfig>[] = [
    {
      key: 'class_name',
      label: 'Lớp học',
      sortable: true,
      render: (_value, row) => (
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Calculator className="w-4 h-4" />
          </div>
          <span className="font-medium text-foreground">{row.class_name || `Lớp #${row.class_id}`}</span>
        </div>
      ),
    },
    {
      key: 'class_type',
      label: 'Loại lớp',
      sortable: true,
      render: (_value, row) => (
        <Badge variant={row.class_type === 'Daycare' ? 'primary' : 'secondary'} size="sm">
          {row.class_type === 'Daycare' ? 'Bán trú' : 'Tối'}
        </Badge>
      ),
    },
    {
      key: 'meal_rate',
      label: 'Tiền cơm/ngày (Bán trú)',
      render: (_value, row) => (
        <span className="text-muted-foreground">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(row.meal_rate)}
        </span>
      ),
    },
    {
      key: 'cancel_rate',
      label: 'Tiền nghỉ/buổi (Tối)',
      render: (_value, row) => (
        <span className="text-muted-foreground">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(row.cancel_rate)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '60px',
      render: (_value, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openEdit(row);
          }}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="Chỉnh sửa"
        >
          <Pencil className="w-4 h-4" />
        </button>
      ),
    },
  ];

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Calculator className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Không có quyền truy cập</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Bạn cần quyền Admin hoặc Kế toán để xem và quản lý cấu hình tài chính.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-3">
        <CardHeader title="Cấu hình Tài chính" subtitle="Quản lý tiền ăn, tiền nghỉ theo lớp" />
        <div className="flex items-center gap-2">
          <Input
            placeholder="Tìm lớp..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            leftAddon={<Search className="w-4 h-4" />}
            className="max-w-xs"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Lớp Bán trú" value={daycareCount} icon={<Calculator className="w-4 h-4" />} />
        <StatCard label="Lớp Tối" value={eveningCount} icon={<Calculator className="w-4 h-4" />} />
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={items}
        rowKey="class_id"
        loading={loading}
        sortable
        sortState={sortState}
        onSortChange={setSortState}
        pagination={meta}
        onPageChange={setPage}
      />

      {/* Edit Modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Chỉnh sửa: ${editTarget?.class_name || editTarget?.class_id || ''}`}
      >
        <div className="space-y-4">
          <Select
            label="Loại lớp"
            value={editForm.class_type}
            onChange={(v) => setEditForm(prev => ({ ...prev, class_type: v as 'Daycare' | 'Evening' }))}
            options={[
              { value: 'Daycare', label: 'Bán trú' },
              { value: 'Evening', label: 'Tối' },
            ]}
            fullWidth
          />
          <CurrencyInput
            label="Tiền cơm/ngày (Bán trú)"
            value={editForm.meal_rate}
            onChange={(v) => setEditForm(prev => ({ ...prev, meal_rate: v }))}
            suffix="VNĐ / ngày"
            hint="VD: 20000 = 20.000 VNĐ / ngày"
            fullWidth
          />
          <CurrencyInput
            label="Tiền nghỉ/buổi (Tối)"
            value={editForm.cancel_rate}
            onChange={(v) => setEditForm(prev => ({ ...prev, cancel_rate: v }))}
            suffix="VNĐ / buổi"
            hint="VD: 50000 = 50.000 VNĐ / buổi"
            fullWidth
          />
          <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />} fullWidth>
            Lưu thay đổi
          </Button>
        </div>
      </Modal>
    </div>
  );
}
