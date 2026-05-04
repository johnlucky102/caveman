import { useState } from 'react';
import { UserPlus, Search, Phone, Mail } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Table from '../components/common/Table';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import type { TableColumn } from '../types';

interface ParentRow { id: string; full_name: string; phone: string; email: string; relationship: string; children: number; }

const mockParents: ParentRow[] = [
  { id: '1', full_name: 'Nguyễn Văn Bình', phone: '0912 345 678', email: 'binh@email.com', relationship: 'father', children: 1 },
  { id: '2', full_name: 'Trần Thị Lan', phone: '0923 456 789', email: 'lan@email.com', relationship: 'mother', children: 2 },
  { id: '3', full_name: 'Lê Văn Cường', phone: '0934 567 890', email: 'cuong@email.com', relationship: 'father', children: 1 },
  { id: '4', full_name: 'Phạm Thị Hoa', phone: '0945 678 901', email: 'hoa@email.com', relationship: 'mother', children: 1 },
];

const relLabel: Record<string, string> = { father: 'Bố', mother: 'Mẹ', guardian: 'Người giám hộ', other: 'Khác' };

const columns: TableColumn<ParentRow>[] = [
  {
    key: 'full_name', label: 'Phụ huynh',
    render: (_v, row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.full_name} size="sm" />
        <div>
          <p className="font-medium text-[#1E293B]">{row.full_name}</p>
          <p className="text-xs text-[#64748B]">{relLabel[row.relationship]}</p>
        </div>
      </div>
    ),
  },
  { key: 'phone', label: 'Điện thoại', render: (_v) => <span className="flex items-center gap-1.5 text-[#64748B]"><Phone className="w-3.5 h-3.5" />{String(_v)}</span> },
  { key: 'email', label: 'Email', render: (_v) => <span className="flex items-center gap-1.5 text-[#64748B]"><Mail className="w-3.5 h-3.5" />{String(_v)}</span> },
  { key: 'children', label: 'Số con', render: (_v) => <Badge variant="info" size="sm">{String(_v)} học sinh</Badge> },
];

export default function Parents() {
  const [search, setSearch] = useState('');
  const filtered = mockParents.filter((p) => p.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1E293B]">Phụ huynh</h1>
          <p className="text-sm text-[#64748B]">{mockParents.length} phụ huynh</p>
        </div>
        <Button size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>Thêm phụ huynh</Button>
      </div>

      <Card noPadding>
        <div className="p-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm phụ huynh..." leftAddon={<Search className="w-4 h-4" />} />
        </div>
      </Card>

      <Card noPadding>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Table columns={columns as any} data={filtered as unknown as Record<string, unknown>[]} rowKey="id" emptyMessage="Không tìm thấy phụ huynh nào" />
      </Card>
    </div>
  );
}
