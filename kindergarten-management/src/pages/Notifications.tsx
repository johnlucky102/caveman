import { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, CheckCheck, Search, Filter, Trash2, Edit2 } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import type { BadgeVariant } from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import NotificationForm from './NotificationForm';
import {
  listNotifications,
  deleteNotification as deleteNotificationApi,
  markAsRead as markAsReadApi,
  markAllAsRead as markAllAsReadApi,
  type NotificationRecord,
  type NotificationKind,
  type UINotificationType,
} from '@/services/notificationsService';

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterType = NotificationKind | 'all';

// ─── Config ──────────────────────────────────────────────────────────────────

const typeConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  info: { label: 'Thông tin', variant: 'neutral' },
  announcement: { label: 'Thông báo', variant: 'info' },
  success: { label: 'Thành công', variant: 'success' },
  warning: { label: 'Cảnh báo', variant: 'warning' },
  error: { label: 'Lỗi', variant: 'danger' },
};

const kindFilterOptions: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Tất cả loại' },
  { value: 'general', label: 'Chung' },
  { value: 'event', label: 'Sự kiện' },
  { value: 'holiday', label: 'Nghỉ lễ' },
  { value: 'request', label: 'Yêu cầu' },
  { value: 'absence', label: 'Vắng mặt' },
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNotification, setEditingNotification] = useState<NotificationRecord | null>(null);
  const toast = useToast();

  const pageSize = 20;

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const { items, total: t, error } = await listNotifications({
      page,
      pageSize,
      search: searchQuery || undefined,
      kind: filterType === 'all' ? undefined : filterType,
    });
    setLoading(false);
    if (error) {
      toast.error('Lỗi', error.message);
    } else {
      setNotifications(items);
      setTotal(t);
    }
  }, [page, pageSize, searchQuery, filterType, toast]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // Reset page when filter/search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterType]);

  const unread = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    const { error } = await markAllAsReadApi();
    if (error) {
      toast.error('Lỗi', error.message);
    } else {
      setNotifications((ns) => ns.map((n) => ({ ...n, is_read: true })));
      toast.success('Thành công', 'Đã đánh dấu tất cả đã đọc');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    const { error } = await markAsReadApi(id);
    if (error) {
      toast.error('Lỗi', error.message);
    } else {
      setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteNotificationApi(id);
    if (error) {
      toast.error('Lỗi', error.message);
    } else {
      setNotifications((ns) => ns.filter((n) => n.id !== id));
      setTotal((t) => t - 1);
      toast.success('Đã xóa', 'Thông báo đã được xóa');
    }
  };

  const handleNotificationSaved = () => {
    setShowCreateModal(false);
    setEditingNotification(null);
    void loadNotifications();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Thông báo</h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `${unread} thông báo chưa đọc` : 'Không có thông báo mới'}
            {total > 0 && ` · Tổng ${total}`}
          </p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCheck className="w-4 h-4" />}
              onClick={handleMarkAllRead}
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm thông báo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full pl-9 pr-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="h-10 pl-9 pr-9 rounded-xl border border-border bg-card text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 appearance-none cursor-pointer transition-colors"
          >
            {kindFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {loading ? (
          <Card className="py-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Đang tải...</p>
            </div>
          </Card>
        ) : notifications.length === 0 ? (
          <Card className="py-10">
            <div className="flex flex-col items-center gap-2">
              <Bell className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Không có thông báo nào</p>
            </div>
          </Card>
        ) : (
          notifications.map((n) => {
            const cfg = typeConfig[n.type] || typeConfig.info;
            return (
              <Card
                key={n.id}
                className={!n.is_read ? 'border-primary/30 bg-primary/5' : ''}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      n.is_read ? 'bg-muted' : 'bg-primary/10'
                    }`}
                  >
                    <Bell className={`w-5 h-5 ${n.is_read ? 'text-muted-foreground' : 'text-primary'}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={`text-sm font-medium ${
                            n.is_read ? 'text-muted-foreground' : 'text-foreground'
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
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                      <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                        <span>{new Date(n.created_at).toLocaleString('vi-VN')}</span>
                        {n.target_type && n.target_type !== 'specific' && (
                          <span>
                            Gửi: {n.target_type === 'all' ? 'Tất cả' : n.target_type}
                          </span>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {!n.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(n.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page}/{totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau →
          </Button>
        </div>
      )}

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
          onSaved={handleNotificationSaved}
          onCancel={() => {
            setShowCreateModal(false);
            setEditingNotification(null);
          }}
        />
      </Modal>
    </div>
  );
}
