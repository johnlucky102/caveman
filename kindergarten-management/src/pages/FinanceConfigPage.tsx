import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calculator, Pencil, Save, Search, Plus, X, Trash2 } from 'lucide-react';
import Card, { CardHeader, StatCard } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import CurrencyInput from '@/components/common/CurrencyInput';
import Table, { type SortState } from '@/components/common/Table';
import Badge from '@/components/common/Badge';
import Modal, { ConfirmModal } from '@/components/common/Modal';
import { useToast } from '@/components/common/Toast';
import { listFinanceConfigs, createFinanceConfig, updateFinanceConfig, deleteFinanceConfig } from '@/services/financeConfigService';
import { listClasses } from '@/services/classesService';
import { useAuthStore } from '@/stores/authStore';
import { canManageFinance } from '@/lib/rbac';
import type { PaginationMeta, SelectOption, TableColumn } from '@/types';
import type { ClassFinanceConfig, CreateFinanceConfigInput, UpdateFinanceConfigInput, DeductionRule } from '@/types/domain';

function paginate(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

interface EditFormState {
  class_id?: number;
  class_type: 'Daycare' | 'Evening';
  deduction_rules: { id: string; name: string; amount: string }[];
}

let ruleIdCounter = 0;
function newRuleId() {
  ruleIdCounter++;
  return `rule_${Date.now()}_${ruleIdCounter}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
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
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    class_type: 'Daycare',
    deduction_rules: [],
  });
  const [classOptions, setClassOptions] = useState<SelectOption[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClassFinanceConfig | null>(null);
  const pageSize = 15;

  useEffect(() => {
    async function loadClasses() {
      const result = await listClasses({ page: 1, pageSize: 200 });
      if (!result.error) {
        setClassOptions(
          result.data.items.map(c => ({ value: String(c.id), label: c.name }))
        );
      }
    }
    void loadClasses();
  }, []);

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

  const availableClassOptions = useMemo(() => {
    const usedClassIds = new Set(items.map(i => i.class_id));
    return classOptions.filter(o => !usedClassIds.has(Number(o.value)));
  }, [classOptions, items]);

  const openEdit = (config: ClassFinanceConfig) => {
    setIsCreating(false);
    setEditTarget(config);
    setEditForm({
      class_type: config.class_type,
      deduction_rules: (config.deduction_rules || []).map(r => ({
        id: r.id,
        name: r.name,
        amount: String(r.amount),
      })),
    });
  };

  const openCreate = () => {
    setIsCreating(true);
    setEditTarget(null);
    setEditForm({ class_id: undefined, class_type: 'Daycare', deduction_rules: [] });
  };

  const addRule = () => {
    setEditForm(prev => ({
      ...prev,
      deduction_rules: [...prev.deduction_rules, { id: newRuleId(), name: '', amount: '' }],
    }));
  };

  const removeRule = (id: string) => {
    setEditForm(prev => ({
      ...prev,
      deduction_rules: prev.deduction_rules.filter(r => r.id !== id),
    }));
  };

  const updateRule = (id: string, field: 'name' | 'amount', value: string) => {
    setEditForm(prev => ({
      ...prev,
      deduction_rules: prev.deduction_rules.map(r => r.id === id ? { ...r, [field]: value } : r),
    }));
  };

  const handleSave = async () => {
    if (!isCreating && !editTarget) return;
    setSaving(true);

    const rules: DeductionRule[] = editForm.deduction_rules
      .filter(r => r.name.trim() && Number(r.amount) > 0)
      .map(r => ({ id: r.id, name: r.name.trim(), amount: Number(r.amount) }));

    if (isCreating) {
      if (editForm.class_id === undefined) {
        toast.error('Vui lòng chọn lớp học');
        setSaving(false);
        return;
      }
      const payload: CreateFinanceConfigInput = {
        class_id: editForm.class_id,
        class_type: editForm.class_type,
        deduction_rules: rules,
      };
      const result = await createFinanceConfig(payload);
      setSaving(false);
      if (result.error) {
        toast.error('Tạo cấu hình thất bại', result.error.message);
        return;
      }
      toast.success('Đã tạo cấu hình tài chính mới');
      setIsCreating(false);
      void loadConfigs();
    } else {
      if (!editTarget) return;
      const payload: UpdateFinanceConfigInput = {
        class_type: editForm.class_type,
        deduction_rules: rules,
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
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const result = await deleteFinanceConfig(deleteTarget.class_id);
    setSaving(false);
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
    if (result.error) {
      toast.error('Xóa cấu hình thất bại', result.error.message);
      return;
    }
    toast.success(`Đã xóa cấu hình của lớp ${deleteTarget.class_name || deleteTarget.class_id}`);
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
      key: 'deduction_rules',
      label: 'Khoản khấu trừ',
      wrap: true,
      render: (_value, row) => (
        <div className="flex flex-wrap gap-1">
          {(row.deduction_rules || []).length === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            (row.deduction_rules || []).map(rule => (
              <Badge key={rule.id} variant="neutral" size="sm">
                {rule.name}: {formatCurrency(rule.amount)}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '90px',
      render: (_value, row) => (
        <div className="flex items-center gap-1">
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
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
      <div className="flex flex-col md:flex-row justify-between gap-3">
        <CardHeader title="Cấu hình Tài chính" subtitle="Quản lý các khoản khấu trừ theo lớp" />
        <div className="flex items-center gap-2">
          <Input
            placeholder="Tìm lớp..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            leftAddon={<Search className="w-4 h-4" />}
            className="max-w-xs"
          />
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Thêm cấu hình
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Lớp Bán trú" value={daycareCount} icon={<Calculator className="w-4 h-4" />} />
        <StatCard label="Lớp Tối" value={eveningCount} icon={<Calculator className="w-4 h-4" />} />
      </div>

      <Table
        columns={columns}
        data={items}
        rowKey="class_id"
        loading={loading}
        sortState={sortState}
        onSort={(key) => setSortState({ key, direction: 'asc' })}
        pagination={meta}
        onPageChange={setPage}
        renderMobileCard={(row) => (
          <div className="bg-card border-b border-border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-primary/10 text-primary">
                <Calculator className="w-4 h-4" />
              </div>
              <span className="font-medium text-foreground">{row.class_name || `Lớp #${row.class_id}`}</span>
              <Badge variant={row.class_type === 'Daycare' ? 'primary' : 'secondary'} size="sm">
                {row.class_type === 'Daycare' ? 'Bán trú' : 'Tối'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {(row.deduction_rules || []).length === 0 ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                (row.deduction_rules || []).map(rule => (
                  <Badge key={rule.id} variant="neutral" size="sm">
                    {rule.name}: {formatCurrency(rule.amount)}
                  </Badge>
                ))
              )}
            </div>
          </div>
        )}
      />

      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title="Xóa cấu hình tài chính"
        message={`Bạn có chắc chắn muốn xóa cấu hình của lớp "${deleteTarget?.class_name || deleteTarget?.class_id}"?`}
        confirmLabel="Xóa"
        variant="danger"
        loading={saving}
      />

      <Modal
        open={isCreating || !!editTarget}
        onClose={() => { setEditTarget(null); setIsCreating(false); }}
        title={isCreating ? 'Thêm cấu hình mới' : `Chỉnh sửa: ${editTarget?.class_name || editTarget?.class_id || ''}`}
      >
        <div className="space-y-4">
          {isCreating && (
            <Select
              label="Lớp học"
              value={editForm.class_id !== undefined ? String(editForm.class_id) : ''}
              onChange={(v) => setEditForm(prev => ({ ...prev, class_id: Number(v) }))}
              options={availableClassOptions}
              placeholder="Chọn lớp học..."
              fullWidth
              required
            />
          )}

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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Khoản khấu trừ</label>
              <Button variant="ghost" size="sm" leftIcon={<Plus className="w-3 h-3" />} onClick={addRule}>
                Thêm khoản
              </Button>
            </div>
            <div className="space-y-2">
              {editForm.deduction_rules.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">Chưa có khoản khấu trừ nào. Bấm "Thêm khoản" để tạo.</p>
              )}
              {editForm.deduction_rules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-2">
                  <Input
                    placeholder="Tên khoản (VD: Tiền cơm)"
                    value={rule.name}
                    onChange={(e) => updateRule(rule.id, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <CurrencyInput
                    placeholder="Số tiền"
                    value={rule.amount}
                    onChange={(v) => updateRule(rule.id, 'amount', v)}
                    suffix="đ"
                    className="w-36"
                  />
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />} fullWidth>
            {isCreating ? 'Tạo mới' : 'Lưu thay đổi'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
