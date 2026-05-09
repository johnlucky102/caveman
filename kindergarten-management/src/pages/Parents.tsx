import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Phone, Mail, Pencil, Trash2 } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Table from '../components/common/Table';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import { useToast } from '../components/common/Toast';
import { listParents, deleteParentBulk } from '@/services/usersService';
import { useAuthStore } from '@/stores/authStore';
import { canManageStudentOrClass } from '@/lib/rbac';
import type { TableColumn } from '../types';

const relLabel: Record<string, string> = { 
  Father: 'Bố', 
  Mother: 'Mẹ', 
  Guardian: 'Người giám hộ', 
  Other: 'Khác' 
};

const columns: TableColumn<any>[] = [
  {
    key: 'full_name', label: 'Phụ huynh',
    render: (_v, row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.full_name} size="sm" />
        <div>
          <p className="font-medium text-foreground">{row.full_name}</p>
          <p className="text-xs text-muted-foreground">{relLabel[row.relationship] || row.relationship}</p>
        </div>
      </div>
    ),
  },
  { key: 'phone', label: 'Điện thoại', render: (_v) => <span className="flex items-center gap-1.5 text-muted-foreground"><Phone className="w-3.5 h-3.5" />{String(_v)}</span> },
  { key: 'email', label: 'Email', render: (_v) => <span className="flex items-center gap-1.5 text-muted-foreground"><Mail className="w-3.5 h-3.5" />{String(_v) || '—'}</span> },
  { 
    key: 'students', 
    label: 'Học sinh', 
    render: (_v, row) => (
      <div className="flex flex-wrap gap-1">
        {row.students?.map((s: any) => (
          <Badge key={s.id} variant="info" size="sm">
            {s.full_name} ({s.class_name || 'N/A'})
          </Badge>
        )) || <span className="text-muted-foreground/50">—</span>}
      </div>
    ) 
  },
  {
    key: 'actions',
    label: 'Hành động',
    width: '80px',
    render: (_v, row) => (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          row.onEdit(row.id);
        }}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        title="Chỉnh sửa"
      >
        <Pencil className="w-4 h-4" />
      </button>
    )
  }
];

export default function Parents() {
  const [search, setSearch] = useState('');
  const [parents, setParents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const { role } = useAuthStore();
  const canManage = canManageStudentOrClass(role);
  const toast = useToast();
  const navigate = useNavigate();

  const loadParents = async () => {
    setLoading(true);
    const { items, error } = await listParents();
    setLoading(false);
    if (error) {
      toast.error('Lỗi', error.message);
    } else {
      setParents(items.map(p => ({ ...p, onEdit: (id: string) => navigate(`/parents/${id}/edit`) })));
    }
  };

  useEffect(() => {
    void loadParents();
  }, []);

  const handleBulkDelete = async () => {
    if (!window.confirm(`Xóa ${selectedKeys.length} phụ huynh đã chọn?`)) return;
    setLoading(true);
    const { error } = await deleteParentBulk(selectedKeys);
    setLoading(false);
    if (error) {
      toast.error('Lỗi', error.message);
    } else {
      toast.success('Thành công', `Đã xóa ${selectedKeys.length} phụ huynh`);
      setSelectedKeys([]);
      void loadParents();
    }
  };

  const filtered = parents.filter((p) => 
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Phụ huynh</h1>
          <p className="text-sm text-muted-foreground">{parents.length} phụ huynh</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && selectedKeys.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={handleBulkDelete}
            >
              Xóa {selectedKeys.length} đã chọn
            </Button>
          )}
          <Button size="sm" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => navigate('/parents/new')}>
            Thêm phụ huynh
          </Button>
        </div>
      </div>

      <Card noPadding>
        <div className="p-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm phụ huynh..." leftAddon={<Search className="w-4 h-4" />} />
        </div>
      </Card>

      <Card noPadding>
        <Table 
          columns={columns} 
          data={filtered} 
          rowKey="id" 
          loading={loading}
          emptyMessage="Không tìm thấy phụ huynh nào" 
        />
      </Card>
    </div>
  );
}
