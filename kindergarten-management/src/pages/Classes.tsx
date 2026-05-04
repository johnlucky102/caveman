import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, Users } from 'lucide-react';
import Card, { CardHeader, StatCard } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Table, { type SortState } from '@/components/common/Table';
import Badge from '@/components/common/Badge';
import Avatar from '@/components/common/Avatar';
import { useToast } from '@/components/common/Toast';
import { listClasses, listGrades } from '@/services/classesService';
import { useAuthStore } from '@/stores/authStore';
import { canManageStudentOrClass } from '@/lib/rbac';
import type { PaginationMeta, SelectOption, TableColumn } from '@/types';
import type { ClassRecord } from '@/types/domain';

function paginate(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export default function Classes() {
  const navigate = useNavigate();
  const toast = useToast();
  const { role } = useAuthStore();
  const canManage = canManageStudentOrClass(role);

  const [items, setItems] = useState<ClassRecord[]>([]);
  const [grades, setGrades] = useState<SelectOption[]>([{ label: 'Tất cả khối', value: '' }]);
  const [search, setSearch] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortState, setSortState] = useState<SortState>({ key: 'name', direction: 'asc' });
  const pageSize = 10;

  useEffect(() => {
    const loadGrades = async () => {
      const result = await listGrades();
      if (result.error) {
        toast.error('Không tải được danh sách khối', result.error.message);
        return;
      }
      setGrades([{ label: 'Tất cả khối', value: '' }, ...result.items.map((g) => ({ value: String(g.id), label: g.name }))]);
    };
    void loadGrades();
  }, [toast]);

  useEffect(() => {
    const loadClasses = async () => {
      setLoading(true);
      const result = await listClasses({
        page,
        pageSize,
        search,
        gradeId: gradeId ? Number(gradeId) : undefined,
        sortBy: sortState.key as 'name' | 'created_at' | 'max_students',
        sortDirection: sortState.direction,
      });
      setLoading(false);
      if (result.error) {
        toast.error('Không tải được danh sách lớp', result.error.message);
        setItems([]);
        setTotal(0);
        return;
      }
      setItems(result.data.items);
      setTotal(result.data.total);
    };
    void loadClasses();
  }, [gradeId, page, pageSize, search, sortState.direction, sortState.key, toast]);

  const meta = useMemo(() => paginate(page, pageSize, total), [page, pageSize, total]);
  const totalStudents = useMemo(() => items.reduce((sum, item) => sum + item.student_count, 0), [items]);
  const fullClasses = useMemo(() => items.filter((item) => item.student_count >= item.max_students).length, [items]);

  const columns: TableColumn<ClassRecord>[] = [
    {
      key: 'name',
      label: 'Lớp học',
      sortable: true,
      render: (_value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-[#1E293B]">{row.name}</p>
            <p className="text-xs text-[#64748B]">{row.grade_name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'teacher_name',
      label: 'Giáo viên',
      render: (_value, row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.teacher_name || 'Chưa phân công'} size="xs" />
          <span className="text-[#64748B]">{row.teacher_name || 'Chưa phân công'}</span>
        </div>
      ),
    },
    {
      key: 'room',
      label: 'Phòng',
      render: (value) => <span className="text-[#64748B]">{String(value || '—')}</span>,
    },
    {
      key: 'max_students',
      label: 'Sĩ số',
      sortable: true,
      render: (_value, row) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#94A3B8]" />
          <span className="text-[#1E293B]">
            {row.student_count}/{row.max_students}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (_value, row) => (
        <Badge variant={row.student_count >= row.max_students ? 'warning' : 'success'} size="sm">
          {row.student_count >= row.max_students ? 'Đầy lớp' : 'Còn chỗ'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1E293B]">Quản lý lớp học</h1>
          <p className="text-sm text-[#64748B]">{total} lớp học</p>
        </div>
        {canManage && (
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/classes/new')}>
            Thêm lớp
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Tổng lớp" value={String(total)} icon={<Building2 className="w-5 h-5 text-primary" />} iconBg="bg-primary/10" />
        <StatCard label="Tổng học sinh (trang hiện tại)" value={String(totalStudents)} icon={<Users className="w-5 h-5 text-emerald-500" />} iconBg="bg-emerald-50" />
        <StatCard label="Lớp đầy" value={String(fullClasses)} icon={<Users className="w-5 h-5 text-amber-500" />} iconBg="bg-amber-50" />
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
              placeholder="Tìm theo tên lớp..."
              leftAddon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={gradeId}
              onChange={(v) => {
                setGradeId(v);
                setPage(1);
              }}
              options={grades}
            />
          </div>
        </div>
      </Card>

      <Card noPadding header={<CardHeader title="Danh sách lớp học" subtitle={`${items.length} kết quả / trang`} />}>
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
          onRowClick={(row) => navigate(`/classes/${(row as unknown as ClassRecord).id}`)}
          emptyMessage="Không tìm thấy lớp học nào"
        />
      </Card>
    </div>
  );
}
