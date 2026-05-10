import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Mail, Phone, Search, Trash2, UserPlus } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

import Input from '@/components/common/Input';
import Table, { type SortState } from '@/components/common/Table';
import Badge from '@/components/common/Badge';
import { ConfirmModal } from '@/components/common/Modal';
import { useToast } from '@/components/common/Toast';
import { deleteTeacherProfile, deleteTeacherProfiles, listTeachers } from '@/services/usersService';
import type { TableColumn, PaginationMeta } from '@/types';
import type { UserProfile } from '@/types/domain';

export default function Teachers() {
  const navigate = useNavigate();
  const toast = useToast();
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    const result = await listTeachers();
    setLoading(false);
    if (result.error) {
      toast.error('Không tải được danh sách giáo viên', result.error.message);
      setTeachers([]);
      return;
    }
    setTeachers(result.items);
    setSelectedKeys([]);
  }, [toast]);

  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return teachers;
    return teachers.filter((teacher) => {
      return (
        teacher.full_name.toLowerCase().includes(term) ||
        (teacher.email || '').toLowerCase().includes(term) ||
        (teacher.phone || '').includes(term) ||
        (teacher.teacher_code || '').toLowerCase().includes(term)
      );
    });
  }, [search, teachers]);

  const total = filtered.length;
  const paginated = useMemo(() => {
    const from = (page - 1) * pageSize;
    return filtered.slice(from, from + pageSize);
  }, [filtered, page, pageSize]);

  const paginationMeta: PaginationMeta = {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteTeacherProfile(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      toast.error('Xóa giáo viên thất bại', result.error.message);
      return;
    }
    toast.success('Xóa giáo viên thành công');
    setDeleteTarget(null);
    void loadTeachers();
  };

  const handleBulkDelete = async () => {
    if (!selectedKeys.length) return;
    setBulkDeleting(true);
    const result = await deleteTeacherProfiles(selectedKeys);
    setBulkDeleting(false);
    if (result.error) {
      toast.error('Xóa giáo viên thất bại', result.error.message);
      return;
    }
    toast.success(`Đã xóa ${selectedKeys.length} giáo viên`);
    setConfirmBulkDelete(false);
    setSelectedKeys([]);
    void loadTeachers();
  };

  const columns: TableColumn<UserProfile>[] = [
    {
      key: 'full_name',
      label: 'Giáo viên',
      render: (_value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
            {row.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-foreground">{row.full_name}</p>
            <p className="text-xs text-muted-foreground">Giáo viên</p>
          </div>
        </div>
      ),
    },
    {
      key: 'teacher_code',
      label: 'Mã GV',
      render: (value) => <span className="font-mono text-xs text-muted-foreground">{String(value || '—')}</span>,
    },
    {
      key: 'phone',
      label: 'Điện thoại',
      render: (value) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="w-3.5 h-3.5 shrink-0" />
          <span>{String(value || '—')}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (value) => {
        const s = String(value || 'Active');
        const variant = s === 'Active' ? 'success' : s === 'Inactive' ? 'warning' : 'neutral';
        const label = s === 'Active' ? 'Đang làm việc' : s === 'Inactive' ? 'Tạm nghỉ' : 'Đã nghỉ việc';
        return <Badge variant={variant} size="sm">{label}</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'Thao tác',
      width: '100px',
      render: (_value, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/teachers/${row.id}/edit`);
            }}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Sửa"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
            className="p-2 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
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
          <h1 className="text-xl font-bold text-foreground">Quản lý giáo viên</h1>
          <p className="text-sm text-muted-foreground">{teachers.length} giáo viên</p>
        </div>
        <div className="flex gap-2">
          {selectedKeys.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20 hover:border-red-500/50"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => setConfirmBulkDelete(true)}
            >
              Xóa {selectedKeys.length} đã chọn
            </Button>
          )}
          <Button
            size="sm"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => navigate('/teachers/new')}
          >
            Thêm giáo viên
          </Button>
        </div>
      </div>

      <Card noPadding>
        <div className="p-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên, mã, email, số điện thoại..."
            leftAddon={<Search className="w-4 h-4" />}
          />
        </div>
      </Card>

      <Card noPadding>
        <Table
          columns={columns}
          data={paginated}
          rowKey="id"
          loading={loading}
          pagination={paginationMeta}
          onPageChange={setPage}
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          emptyMessage="Không tìm thấy giáo viên nào"
        />
      </Card>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xóa giáo viên"
        message={deleteTarget ? `Xóa giáo viên "${deleteTarget.full_name}"?` : undefined}
        confirmLabel="Xóa"
        loading={deleting}
      />

      <ConfirmModal
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title="Xóa hàng loạt"
        message={`Bạn có chắc chắn muốn xóa ${selectedKeys.length} giáo viên đã chọn? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        loading={bulkDeleting}
      />
    </div>
  );
}
