import { useState } from 'react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import type { NotificationType, UserRole } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationFormProps {
  notification?: {
    title: string;
    message: string;
    type: NotificationType;
    target_role?: UserRole;
    target_user_id?: string;
  };
  onSubmit: (data: {
    title: string;
    message: string;
    type: NotificationType;
    target_role?: UserRole;
    target_user_id?: string;
  }) => void;
  onCancel: () => void;
}

type ScheduleType = 'now' | 'schedule';

// ─── Component ─────────────────────────────────────────────────────────────

export default function NotificationForm({
  notification,
  onSubmit,
  onCancel,
}: NotificationFormProps) {
  const [title, setTitle] = useState(notification?.title || '');
  const [message, setMessage] = useState(notification?.message || '');
  const [type, setType] = useState<NotificationType>(notification?.type || 'info');
  const [targetRole, setTargetRole] = useState<UserRole | ''>(notification?.target_role || '');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; message?: string }>({});

  const notificationTypes: { value: NotificationType; label: string }[] = [
    { value: 'info', label: 'Thông tin' },
    { value: 'announcement', label: 'Thông báo' },
    { value: 'success', label: 'Thành công' },
    { value: 'warning', label: 'Cảnh báo' },
    { value: 'error', label: 'Lỗi' },
  ];

  const targetRoles: { value: UserRole; label: string }[] = [
    { value: 'parent', label: 'Phụ huynh' },
    { value: 'teacher', label: 'Giáo viên' },
    { value: 'admin', label: 'Quản trị viên' },
    { value: 'staff', label: 'Nhân viên' },
  ];

  const validate = (): boolean => {
    const newErrors: { title?: string; message?: string } = {};
    if (!title.trim()) {
      newErrors.title = 'Vui lòng nhập tiêu đề';
    }
    if (!message.trim()) {
      newErrors.message = 'Vui lòng nhập nội dung';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));

    onSubmit({
      title: title.trim(),
      message: message.trim(),
      type,
      target_role: targetRole || undefined,
      target_user_id: undefined,
    });

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <Input
        label="Tiêu đề"
        placeholder="Nhập tiêu đề thông báo..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        required
      />

      {/* Content */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#1E293B]">
          Nội dung <span className="text-red-500">*</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nhập nội dung thông báo..."
          rows={4}
          className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#1E293B] placeholder:text-[#94A3B8] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors resize-none"
        />
        {errors.message && (
          <p className="text-xs text-red-500">{errors.message}</p>
        )}
      </div>

      {/* Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#1E293B]">
          Loại thông báo <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {notificationTypes.map((t) => (
            <label
              key={t.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors text-sm font-medium ${
                type === t.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
              }`}
            >
              <input
                type="radio"
                name="notificationType"
                value={t.value}
                checked={type === t.value}
                onChange={() => setType(t.value)}
                className="sr-only"
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      {/* Target */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#1E293B]">Gửi đến</label>
        <div className="flex flex-wrap gap-2">
          {targetRoles.map((r) => (
            <label
              key={r.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors text-sm font-medium ${
                targetRole === r.value
                  ? 'border-secondary bg-secondary/10 text-secondary'
                  : 'border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
              }`}
            >
              <input
                type="radio"
                name="targetRole"
                value={r.value}
                checked={targetRole === r.value}
                onChange={() => setTargetRole(r.value)}
                className="sr-only"
              />
              {r.label}
            </label>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#1E293B]">Thời gian gửi</label>
          <div className="flex gap-3">
            <label
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors text-sm font-medium ${
                scheduleType === 'now'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
              }`}
            >
              <input
                type="radio"
                name="scheduleType"
                value="now"
                checked={scheduleType === 'now'}
                onChange={() => setScheduleType('now')}
                className="sr-only"
              />
              Gửi ngay
            </label>
            <label
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors text-sm font-medium ${
                scheduleType === 'schedule'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
              }`}
            >
              <input
                type="radio"
                name="scheduleType"
                value="schedule"
                checked={scheduleType === 'schedule'}
                onChange={() => setScheduleType('schedule')}
                className="sr-only"
              />
              Hẹn lịch
            </label>
          </div>
        </div>

        {scheduleType === 'schedule' && (
          <div className="flex gap-3">
            <Input
              label="Ngày gửi"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required={scheduleType === 'schedule'}
            />
            <Input
              label="Giờ gửi"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              required={scheduleType === 'schedule'}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E2E8F0]">
        <Button variant="outline" onClick={onCancel} type="button">
          Hủy
        </Button>
        <Button
          type="submit"
          loading={loading}
          disabled={scheduleType === 'schedule' && (!scheduledDate || !scheduledTime)}
        >
          {notification ? 'Cập nhật' : 'Tạo thông báo'}
        </Button>
      </div>
    </form>
  );
}
