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
import { listFees, getFeeSummary, updateFeeRecordStatus, deleteFeeRecord, deleteFeeRecords, createClassFees, syncFeeWithAttendance, bulkSyncFeesByFilter } from '@/services/feesService';
import { listClasses } from '@/services/classesService';
import { listStudents } from '@/services/studentsService';
import { getFinanceConfigByClassId } from '@/services/financeConfigService';
import Modal, { ConfirmModal } from '@/components/common/Modal';
import { RefreshCw, ClipboardList } from 'lucide-react';
import type { PaginationMeta, SelectOption, TableColumn } from '@/types';
import type { FeeRecordP2, FeeStatusValue } from '@/types/domain';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value) + ' d';
}

function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + ' ty';
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(0) + ' tr';
  return formatCurrency(value);
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
  const [bulkTitle, setBulkTitle] = useState(`Học phí tháng ${new Date().getMonth() + 1}`);
  const [classOptions, setClassOptions] = useState<SelectOption[]>([]);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [summary, setSummary] = useState({ totalAmount: 0, totalPaid: 0, totalDebt: 0, debtCount: 0 });
  const [bulkFinanceConfig, setBulkFinanceConfig] = useState<any>(null);
  const [bulkStudentCount, setBulkStudentCount] = useState(0);
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
      label: 'Tháng ' + (i + 1),
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

  // Trigger background sync when month/class changes (on enter screen or change filters)
  useEffect(() => {
    if (month || classId) {
      void bulkSyncFeesByFilter({
        month: month ? Number(month) : undefined,
        class_id: classId ? Number(classId) : undefined,
        school_year: schoolYear || undefined,
      });
    }
  }, [month, classId, schoolYear]);

  // Load finance config + student count when class changes in bulk modal
  useEffect(() => {
    if (!bulkClassId || !showBulkCreateModal) return;
    const loadConfig = async () => {
      const configResult = await getFinanceConfigByClassId(Number(bulkClassId));
      if (configResult.item) {
        setBulkFinanceConfig(configResult.item);
      } else {
        setBulkFinanceConfig(null);
      }
      const studentsResult = await listStudents({ page: 1, pageSize: 1, classId: Number(bulkClassId) });
      if (studentsResult.data) {
        setBulkStudentCount(studentsResult.data.total);
      }
    };
    void loadConfig();
  }, [bulkClassId, showBulkCreateModal]);

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
      toast.success('Đã xóa ' + selectedIds.length + ' bản ghi học phí');
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

    // Load students in the class
    const studentsResult = await listStudents({
      page: 1, pageSize: 500, classId: Number(bulkClassId),
    });
    if (studentsResult.error || !studentsResult.data?.items.length) {
      toast.error('Không tìm thấy học sinh nào trong lớp');
      setBulkCreating(false);
      return;
    }
    const studentsList = studentsResult.data.items.map(s => ({ studentId: s.id }));

    const result = await createClassFees(
      { classId: Number(bulkClassId), month: bulkMonth, schoolYear: bulkSchoolYear },
      1,
      bulkBaseAmount,
      studentsList,
      bulkTitle || `Học phí tháng ${bulkMonth}`,
    );
    setBulkCreating(false);
    if (result.error) {
      toast.error('Lỗi khi tạo hàng loạt', result.error.message);
    } else {
      toast.success('Đã tạo học phí cho ' + studentsList.length + ' học sinh');
      // Trigger sync for the entire class/month immediately
      void bulkSyncFeesByFilter({
        class_id: Number(bulkClassId),
        month: bulkMonth,
        school_year: bulkSchoolYear
      });
      setShowBulkCreateModal(false);
      void loadFees();
    }
  };

  const handleBulkSync = async () => {
    setBulkSyncing(true);
    const result = await bulkSyncFeesByFilter({
      class_id: classId ? Number(classId) : undefined,
      month: month ? Number(month) : undefined,
      school_year: schoolYear || undefined,
      fee_ids: selectedIds.length > 0 ? selectedIds : undefined,
    });
    setBulkSyncing(false);
    if (result.error) {
      toast.error('Lỗi đồng bộ', result.error.message);
    } else {
      const msg = selectedIds.length > 0
        ? `Đã đồng bộ ${result.synced} phiếu đã chọn${result.failed > 0 ? `, ${result.failed} lỗi` : ''}`
        : `Đã đồng bộ ${result.synced} phiếu${result.failed > 0 ? `, ${result.failed} lỗi` : ''}`;
      toast.success(msg);
      void loadFees();
    }
  };


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
          {Number(value) > 0 ? '-' + formatCurrency(Number(value)) : '\u2014'}
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
              Con {formatCurrency(row.amount_vnd - row.paid_amount_vnd)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (value) => <FeeStatusBadge status={value as FeeStatusValue} />,
    },
    {
      key: 'actions',
      label: '',
      width: '100px',
      render: (_value, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); navigate('/fees/' + row.id + '/edit'); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Sửa"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate('/fees/print-bulk?ids=' + row.id); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
            title="In biên lai"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setFeeToDelete(row.id); setShowDeleteConfirm(true); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const currentSchoolYear = getCurrentSchoolYear();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Học phí</h1>
          <p className="text-sm text-muted-foreground">{total} phiếu thu tổng cộng</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={async () => {
                  setBulkSyncing(true);
                  await bulkSyncFeesByFilter({ fee_ids: selectedIds });
                  setBulkSyncing(false);
                  navigate('/fees/print-bulk?ids=' + selectedIds.join(','));
                }}
                loading={bulkSyncing}
              >
                In {selectedIds.length} biên lai
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20 hover:border-red-500/50"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => setShowBulkDeleteConfirm(true)}
              >
                Xóa {selectedIds.length} đã chọn
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={handleBulkSync}
                loading={bulkSyncing}
              >
                Đồng bộ đã chọn
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={handleBulkSync}
            loading={bulkSyncing}
          >
            Đồng bộ tất cả
          </Button>
          <Button
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
              placeholder="Tìm kiếm học sinh..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftAddon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Select
              value={status}
              onChange={(v) => { setStatus(v as FeeStatusValue | ''); setPage(1); }}
              options={[{ value: '', label: 'Tất cả trạng thái' }, ...statusOptions.slice(1)]}
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
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Tổng" value={formatCompactCurrency(summary.totalAmount)} icon={<Wallet className="w-4 h-4" />} />
        <StatCard label="Đã thu" value={formatCompactCurrency(summary.totalPaid)} icon={<TrendingDown className="w-4 h-4" />} variant="success" />
        <StatCard label="Còn nợ" value={formatCompactCurrency(summary.totalDebt)} icon={<TrendingUp className="w-4 h-4" />} variant="warning" />
        <StatCard label="Số nợ" value={summary.debtCount} icon={<AlertCircle className="w-4 h-4" />} variant="danger" />
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={items}
        rowKey="id"
        loading={loading}
        pagination={pagination(page, pageSize, total)}
        onPageChange={setPage}
        selectedKeys={selectedIds}
        onSelectionChange={(keys) => setSelectedIds(keys.map(String))}
        emptyMessage="Không có phiếu thu nào"
        renderMobileCard={(row) => {
          const f = row as FeeRecordP2;
          const statusColor = f.status === 'paid' ? 'text-emerald-500' : f.status === 'partial' ? 'text-amber-500' : 'text-red-500';
          return (
            <div className="bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{f.student_name}</p>
                  <p className="text-xs text-muted-foreground">{f.class_name} · {f.title || 'Học phí'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-medium">{formatCurrency(Number(f.amount_vnd))}</p>
                  <span className={'text-xs font-medium ' + statusColor}>
                    {f.status === 'paid' ? 'Hoàn tất' : f.status === 'partial' ? 'Còn nợ' : 'Chưa đóng'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Đã thu: {formatCurrency(Number(f.paid_amount_vnd))}</span>
                {Number(f.attendance_deduction_vnd) > 0 && (
                  <span className="text-red-500">-Điều chỉnh: {formatCurrency(Number(f.attendance_deduction_vnd))}</span>
                )}
              </div>
            </div>
          );
        }}
      />

      {/* Modals */}
      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setFeeToDelete(null); }}
        onConfirm={() => feeToDelete ? handleDelete(feeToDelete) : Promise.resolve()}
        title="Xóa phiếu thu"
        message="Bạn có chắc chắn muốn xóa phiếu thu này?"
        confirmLabel="Xóa"
        loading={deleting}
      />

      <ConfirmModal
        open={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Xóa hàng loạt"
        message={'Bạn có chắc chắn muốn xóa ' + selectedIds.length + ' phiếu thu đã chọn?'}
        confirmLabel="Xóa"
        loading={deleting}
      />

      <Modal
        open={showBulkCreateModal}
        onClose={() => { setShowBulkCreateModal(false); setBulkFinanceConfig(null); setBulkStudentCount(0); }}
        title="Tạo hàng loạt phiếu thu"
      >
        <div className="space-y-4">
          <Select
            label="Lớp học"
            value={bulkClassId}
            onChange={(v) => setBulkClassId(v)}
            options={classOptions}
            placeholder="Chọn lớp..."
            required
            fullWidth
          />

          {bulkFinanceConfig && (
            <div className="bg-muted/30 rounded-xl p-3 space-y-1">
              <p className="text-xs font-medium">Cấu hình lớp:</p>
              <p className="text-xs text-muted-foreground">
                Loại: {bulkFinanceConfig.class_type === 'Daycare' ? 'Bán trú' : 'Tối'}
              </p>
              {(bulkFinanceConfig.deduction_rules || []).map((r: { id: string; name: string; amount: number }) => (
                <p key={r.id} className="text-xs">&bull; {r.name}: {formatCurrency(r.amount)}/ngay vang</p>
              ))}
              <p className="text-xs font-medium mt-2">Sẽ tạo {bulkStudentCount} phiếu thu</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <Select
              label="Tháng"
              value={String(bulkMonth)}
              onChange={(v) => { setBulkMonth(Number(v)); setBulkTitle(`Học phí tháng ${v}`); }}
              options={monthOptions.filter(o => o.value !== '')}
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
    </div>
  );
}