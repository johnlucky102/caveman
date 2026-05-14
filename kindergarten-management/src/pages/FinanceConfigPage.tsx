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
  hospital_deduction_type: 'Fixed' | 'Daily';
  hospital_deduction_value: string;
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
    hospital_deduction_type: 'Fixed',
    hospital_deduction_value: '0',
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
      hospital_deduction_type: config.hospital_deduction_type,
      hospital_deduction_value: String(config.hospital_deduction_value),
    });
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    const payload: UpdateFinanceConfigInput = {
      class_type: editForm.class_type,
      meal_rate: Number(editForm.meal_rate),
      cancel_rate: Number(editForm.cancel_rate),
      hospital_deduction_type: editForm.hospital_deduction_type,
      hospital_deduction_value: Number(editForm.hospital_deduction_value),
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
      key: 'hospital_deduction_type',
      label: 'Khấu trừ viện',
      render: (_value, row) => (
        <div className="text-sm">
          <span className="text-muted-foreground">
            {row.hospital_deduction_type === 'Fixed' ? 'Cố định' : 'Tỷ lệ ngày'}
          </span>
          <span className="text-red-500 ml-1">
            {row.hospital_deduction_type === 'Fixed'
              ? `- ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(row.hospital_deduction_value)}`
              : `- ${row.hospital_deduction_value}%`}
          </span>
        </div>
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
        <h2 className="text-lg font-semibold text-foreground">Không có quyền truy cập</h2>
        <p className="text-sm text-muted-foreground max-w-[320px] mt-2">
          Chỉ Admin và Kế toán mới có quyền quản lý cấu hình tài chính.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Cấu hình Tài chính (Khấu trừ)</h1>
          <p className="text-sm text-muted-foreground">{total} lớp học</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Tổng lớp" value={String(total)} icon={<Calculator className="w-5 h-5 text-primary" />} iconBg="bg-primary/10" />
        <StatCard label="Lớp Bán trú" value={String(daycareCount)} icon={<Calculator className="w-5 h-5 text-emerald-500" />} iconBg="bg-emerald-500/10" />
        <StatCard label="Lớp Tối" value={String(eveningCount)} icon={<Calculator className="w-5 h-5 text-amber-500" />} iconBg="bg-amber-500/10" />
      </div>

      <Card noPadding>
        <div className="p-4">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên lớp..."
            leftAddon={<Search className="w-4 h-4" />}
          />
        </div>
      </Card>

      <Card noPadding header={<CardHeader title="Danh sách cấu hình" subtitle={`${items.length} bản ghi / trang`} />}>
        <Table
          columns={columns}
          data={items}
          rowKey="id"
          loading={loading}
          pagination={meta}
          onPageChange={setPage}
          sortState={sortState}
          onSort={(key) => {
            setPage(1);
            setSortState((prev) => ({
              key,
              direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
            }));
          }}
          emptyMessage="Không tìm thấy cấu hình nào"
        />
      </Card>

      <Modal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={`Cấu hình tài chính: ${editTarget?.class_name || ''}`}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              <X className="w-4 h-4" />
              Hủy
            </Button>
            <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />}>
              Lưu thay đổi
            </Button>
          </div>
        }
      >
        {editTarget && (
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Loại lớp học"
                value={editForm.class_type}
                onChange={(v) => setEditForm((prev) => ({ ...prev, class_type: v as 'Daycare' | 'Evening' }))}
                options={[
                  { value: 'Daycare', label: 'Lớp Bán trú' },
                  { value: 'Evening', label: 'Lớp Tối' },
                ]}
                fullWidth
              />

              {editForm.class_type === 'Daycare' ? (
                <CurrencyInput
                  label="Tiền cơm/ngày"
                  value={editForm.meal_rate}
                  onChange={(val) => setEditForm((prev) => ({ ...prev, meal_rate: val }))}
                  hint="Trừ tiền cơm khi vắng mặt"
                  fullWidth
                />
              ) : (
                <CurrencyInput
                  label="Tiền nghỉ/buổi"
                  value={editForm.cancel_rate}
                  onChange={(val) => setEditForm((prev) => ({ ...prev, cancel_rate: val }))}
                  hint="Trừ tiền khi trung tâm cho nghỉ"
                  fullWidth
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Kiểu khấu trừ nằm viện"
                value={editForm.hospital_deduction_type}
                onChange={(v) => setEditForm((prev) => ({ ...prev, hospital_deduction_type: v as 'Fixed' | 'Daily' }))}
                options={[
                  { value: 'Fixed', label: 'Số tiền cố định' },
                  { value: 'Daily', label: 'Tỷ lệ theo ngày công' },
                ]}
                fullWidth
              />
              {editForm.hospital_deduction_type === 'Fixed' ? (
                <CurrencyInput
                  label="Số tiền trừ/ngày"
                  value={editForm.hospital_deduction_value}
                  onChange={(val) => setEditForm((prev) => ({ ...prev, hospital_deduction_value: val }))}
                  hint="VD: 100.000"
                  fullWidth
                />
              ) : (
                <Input
                  label="Tỷ lệ trừ (%)"
                  type="number"
                  value={editForm.hospital_deduction_value}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, hospital_deduction_value: e.target.value }))}
                  hint="VD: 100 (trừ 100%)"
                  fullWidth
                />
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
