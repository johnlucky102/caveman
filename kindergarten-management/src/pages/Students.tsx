import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Eye, Pencil, Search, Trash2, UserPlus } from 'lucide-react';
import Card, { CardHeader } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Table, { type SortState } from '@/components/common/Table';

import { ConfirmModal } from '@/components/common/Modal';
import { useToast } from '@/components/common/Toast';
import { useAuthStore } from '@/stores/authStore';
import { canManageStudentOrClass, canAddOrDeleteStudent, isTeacher } from '@/lib/rbac';
import { listClasses } from '@/services/classesService';
import { deleteStudent, deleteStudents, listStudents } from '@/services/studentsService';
import type { PaginationMeta, SelectOption, TableColumn } from '@/types';
import type { StudentRecord } from '@/types/domain';

function calculatePagination(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export default function Students() {
  const navigate = useNavigate();
  const toast = useToast();
  const { role, user } = useAuthStore();
  const canManage = canManageStudentOrClass(role);
  const canAddDelete = canAddOrDeleteStudent(role);

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classOptions, setClassOptions] = useState<SelectOption[]>([{ label: 'Tất cả lớp', value: '' }]);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null);
  const [sortState, setSortState] = useState<SortState>({ key: 'created_at', direction: 'desc' });
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const pageSize = 10;


  useEffect(() => {
    const loadOptions = async () => {
      const classesResult = await listClasses({ 
        page: 1, 
        pageSize: 200, 
        teacherId: role === 'Teacher' ? user?.id : undefined 
      });

      if (classesResult.error) toast.error('Không tải được lớp học', classesResult.error.message);

      const classItems = classesResult.data.items.map((item) => ({
        label: item.name,
        value: String(item.id),
      }));

      const options = classItems.length > 1 || role === 'Admin' 
        ? [{ label: 'Tất cả lớp', value: '' }, ...classItems]
        : classItems;

      setClassOptions(options);
      if (classItems.length === 1 && !filterClass) {
        setFilterClass(classItems[0].value);
      }
    };
    void loadOptions();
  }, [toast, role, user?.id]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    const result = await listStudents({
      page,
      pageSize,
      search,
      classId: filterClass ? Number(filterClass) : undefined,
      teacherId: role === 'Teacher' ? user?.id : undefined,
      sortBy: sortState.key as 'full_name' | 'student_code' | 'created_at',
      sortDirection: sortState.direction,
    });
    setLoading(false);

    if (result.error) {
      toast.error('Không tải được danh sách học sinh', result.error.message);
      setStudents([]);
      setTotal(0);
      return;
    }

    setStudents(result.data.items);
    setTotal(result.data.total);
    setSelectedKeys([]);
  }, [filterClass, page, pageSize, search, sortState.direction, sortState.key, toast]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const paginationMeta = useMemo(() => calculatePagination(page, pageSize, total), [page, pageSize, total]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteStudent(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      toast.error('Xóa học sinh thất bại', result.error.message);
      return;
    }
    toast.success('Xóa học sinh thành công');
    setDeleteTarget(null);
    if (students.length === 1 && page > 1) setPage((prev) => prev - 1);
    else void loadStudents();
  };

  const handleBulkDelete = async () => {
    if (!selectedKeys.length) return;
    setBulkDeleting(true);
    const result = await deleteStudents(selectedKeys);
    setBulkDeleting(false);
    if (result.error) {
      toast.error('Xóa học sinh thất bại', result.error.message);
      return;
    }
    toast.success(`Đã xóa ${selectedKeys.length} học sinh`);
    setConfirmBulkDelete(false);
    setSelectedKeys([]);
    if (students.length === selectedKeys.length && page > 1) setPage((prev) => prev - 1);
    else void loadStudents();
  };

  const handleExport = () => {
    if (!students.length) return;
    
    const headers = ['Mã HS', 'Họ tên', 'Lớp', 'Ngày sinh', 'Giới tính', 'Địa chỉ'];
    const rows = students.map(s => [
      s.student_code,
      s.full_name,
      s.class_name,
      s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('vi-VN') : '',
      s.gender === 'Male' ? 'Nam' : 'Nữ',
      s.address || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_hoc_sinh_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã tải xuống danh sách học sinh');
  };

  const columns: TableColumn<StudentRecord>[] = [
    {
      key: 'full_name',
      label: 'Họ tên',
      sortable: true,
      render: (_value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
            {row.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-foreground">{row.full_name}</p>
            <p className="text-xs text-muted-foreground">{row.class_name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'student_code',
      label: 'Mã HS',
      sortable: true,
      render: (value) => <span className="font-mono text-xs text-muted-foreground">{String(value)}</span>,
    },
    {
      key: 'date_of_birth',
      label: 'Ngày sinh',
      render: (value) => <span className="text-muted-foreground">{value ? new Date(String(value)).toLocaleDateString('vi-VN') : '—'}</span>,
    },
    {
      key: 'actions',
      label: 'Hành động',
      width: '120px',
      render: (_value, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/students/${row.id}`);
            }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Xem chi tiết"
          >
            <Eye className="w-4 h-4" />
          </button>
          {canManage && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/students/${row.id}/edit`);
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Chỉnh sửa"
              >
                <Pencil className="w-4 h-4" />
              </button>
              {canAddDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(row);
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Xóa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Quản lý học sinh</h1>
          <p className="text-sm text-muted-foreground">{total} học sinh tổng cộng</p>
        </div>
        <div className="flex gap-2">
          {!isTeacher(role) && (
            <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport}>
              Xuất dữ liệu
            </Button>
          )}
          {canAddDelete && selectedKeys.length > 0 && (
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
          {canAddDelete && (
            <Button size="sm" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => navigate('/students/new')}>
              Thêm mới
            </Button>
          )}
        </div>
      </div>

      <Card noPadding>
        <div className="flex flex-col sm:flex-row gap-3 p-4">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm kiếm theo tên hoặc mã học sinh..."
              leftAddon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={filterClass}
              onChange={(v) => {
                setFilterClass(v);
                setPage(1);
              }}
              options={classOptions}
            />
          </div>
        </div>
      </Card>

      <Card noPadding header={<CardHeader title="Danh sách học sinh" subtitle={`${students.length} kết quả / trang`} />}>
        <Table
          columns={columns}
          data={students}
          rowKey="id"
          loading={loading}
          pagination={paginationMeta}
          onPageChange={setPage}
          sortState={sortState}
          onSort={(key) => {
            setPage(1);
            setSortState((prev) => ({
              key,
              direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
            }));
          }}
          onRowClick={(row) => navigate(`/students/${(row as unknown as StudentRecord).id}`)}
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          emptyMessage="Không tìm thấy học sinh nào"
        />
      </Card>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xóa học sinh"
        message={deleteTarget ? `Xóa học sinh "${deleteTarget.full_name}"?` : undefined}
        confirmLabel="Xóa"
        loading={deleting}
      />

      <ConfirmModal
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title="Xóa hàng loạt"
        message={`Bạn có chắc chắn muốn xóa ${selectedKeys.length} học sinh đã chọn? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        loading={bulkDeleting}
      />
    </div>
  );
}
