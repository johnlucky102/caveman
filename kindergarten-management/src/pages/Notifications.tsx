import { useState } from 'react';
import { Bell, Plus, CheckCheck, Search, Filter, Trash2, Edit2 } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import type { BadgeVariant } from '../components/common/Badge';
import Modal from '../components/common/Modal';
import NotificationForm from './NotificationForm';
import type { Notification, NotificationType, UserRole } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationItem extends Omit<Notification, 'type'> {
  type: NotificationType;
  target_role?: UserRole;
  target_user_id?: string;
}

type FilterType = NotificationType | 'all';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    title: 'Thông báo nghỉ lễ 30/4',
    message: 'Trường sẽ nghỉ học từ ngày 27/4 đến 1/5/2024. Học sinh quay lại trường vào ngày 2/5/2024.',
    type: 'announcement',
    is_read: false,
    created_at: '2024-04-19T08:00:00',
  },
  {
    id: '2',
    title: 'Phụ huynh Nguyễn Văn Bình đã đóng học phí',
    message: 'Học phí tháng 4 của học sinh Nguyễn Minh Khoa đã được thanh toán.',
    type: 'success',
    is_read: false,
    created_at: '2024-04-19T10:30:00',
  },
  {
    id: '3',
    title: 'Nhắc nhở họp phụ huynh',
    message: 'Cuộc họp phụ huynh lớp Chồi B sẽ diễn ra vào 17:00 hôm nay tại phòng hội trường.',
    type: 'warning',
    is_read: true,
    created_at: '2024-04-19T07:00:00',
  },
  {
    id: '4',
    title: 'Học sinh vắng mặt nhiều ngày',
    message: 'Học sinh Lê Văn An đã vắng mặt 3 ngày liên tiếp. Vui lòng liên hệ phụ huynh.',
    type: 'warning',
    is_read: true,
    created_at: '2024-04-18T09:00:00',
  },
  {
    id: '5',
    title: 'Cập nhật lịch sinh hoạt tháng 5',
    message: 'Lịch sinh hoạt ngoại khóa tháng 5 đã được cập nhật. Vui lòng kiểm tra chi tiết.',
    type: 'info',
    is_read: true,
    created_at: '2024-04-17T14:00:00',
  },
  {
    id: '6',
    title: 'Lỗi kết nối máy chấm công',
    message: 'Hệ thống máy chấm công lớp Chồi A đang gặp sự cố. Kỹ thuật đang xử lý.',
    type: 'error',
    is_read: false,
    created_at: '2024-04-20T06:30:00',
  },
];

const typeConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  announcement: { label: 'Thông báo', variant: 'info' },
  success: { label: 'Thành công', variant: 'success' },
  warning: { label: 'Cảnh báo', variant: 'warning' },
  error: { label: 'Lỗi', variant: 'danger' },
  info: { label: 'Thông tin', variant: 'neutral' },
};

const targetLabels: Record<string, string> = {
  admin: 'Quản trị viên',
  teacher: 'Giáo viên',
  parent: 'Phụ huynh',
  staff: 'Nhân viên',
  all: 'Tất cả',
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNotification, setEditingNotification] = useState<NotificationItem | null>(null);

  const unread = notifications.filter((n) => !n.is_read).length;

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    const matchesType = filterType === 'all' || n.type === filterType;
    const matchesSearch =
      searchQuery === '' ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const markAllRead = () =>
    setNotifications((ns) => ns.map((n) => ({ ...n, is_read: true })));

  const markAsRead = (id: string) =>
    setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, is_read: true } : n)));

  const deleteNotification = (id: string) =>
    setNotifications((ns) => ns.filter((n) => n.id !== id));

  const handleNotificationCreated = (notification: Omit<NotificationItem, 'id' | 'created_at' | 'is_read'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: String(Date.now()),
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((ns) => [newNotification, ...ns]);
    setShowCreateModal(false);
  };

  const handleNotificationUpdated = (updated: Omit<NotificationItem, 'id' | 'created_at' | 'is_read'>) => {
    if (!editingNotification) return;
    setNotifications((ns) =>
      ns.map((n) =>
        n.id === editingNotification.id
          ? { ...n, ...updated }
          : n
      )
    );
    setEditingNotification(null);
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1E293B]">Thông báo</h1>
          <p className="text-sm text-[#64748B]">
            {unread > 0 ? `${unread} thông báo chưa đọc` : 'Không có thông báo mới'}
          </p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCheck className="w-4 h-4" />}
              onClick={markAllRead}
            >
              Đánh dấu tất cả đã đọc
            </Button>
          )}
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Tạo thông báo
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Tìm kiếm thông báo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full pl-9 pr-4 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#1E293B] placeholder:text-[#94A3B8] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="h-10 pl-9 pr-9 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#1E293B] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 appearance-none cursor-pointer transition-colors"
          >
            <option value="all">Tất cả loại</option>
            {Object.entries(typeConfig).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="py-10">
            <div className="flex flex-col items-center gap-2">
              <Bell className="w-10 h-10 text-[#CBD5E1]" />
              <p className="text-sm text-[#64748B]">Không có thông báo nào</p>
            </div>
          </Card>
        ) : (
          filteredNotifications.map((n) => {
            const cfg = typeConfig[n.type] || typeConfig.info;
            return (
              <Card
                key={n.id}
                className={!n.is_read ? 'border-primary/30 bg-primary/[0.02]' : ''}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      n.is_read ? 'bg-[#F1F5F9]' : 'bg-primary/10'
                    }`}
                  >
                    <Bell className={`w-5 h-5 ${n.is_read ? 'text-[#94A3B8]' : 'text-primary'}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={`text-sm font-medium ${
                            n.is_read ? 'text-[#64748B]' : 'text-[#1E293B]'
                          }`}
                        >
                          {n.title}
                        </p>
                        <Badge variant={cfg.variant} size="sm">
                          {cfg.label}
                        </Badge>
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{n.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
                        <span>{new Date(n.created_at).toLocaleString('vi-VN')}</span>
                        {n.target_role && (
                          <span className="text-[#94A3B8]">
                            Gửi: {targetLabels[n.target_role] || n.target_role}
                          </span>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {!n.is_read && (
                          <button
                            onClick={() => markAsRead(n.id)}
                            className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B] transition-colors"
                            title="Đánh dấu đã đọc"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingNotification(n);
                            setShowCreateModal(true);
                          }}
                          className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B] transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteNotification(n.id)}
                          className="p-1.5 rounded-lg text-[#64748B] hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingNotification(null);
        }}
        title={editingNotification ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới'}
        description={
          editingNotification
            ? 'Cập nhật nội dung thông báo'
            : 'Tạo thông báo mới gửi đến phụ huynh hoặc giáo viên'
        }
        size="lg"
      >
        <NotificationForm
          notification={editingNotification}
          onSubmit={editingNotification ? handleNotificationUpdated : handleNotificationCreated}
          onCancel={() => {
            setShowCreateModal(false);
            setEditingNotification(null);
          }}
        />
      </Modal>
    </div>
  );
}
