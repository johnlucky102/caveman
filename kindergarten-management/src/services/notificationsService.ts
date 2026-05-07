import { supabase } from '@/lib/supabase';
import { withSupabaseTimeout } from '@/lib/timeout';
import { toAppError } from './supabaseErrors';
import type { AppError } from '@/types/domain';

// ─── DB → UI type mapping ───────────────────────────────────────────────────

export type NotificationKind = 'general' | 'event' | 'holiday' | 'request' | 'absence';
export type UINotificationType = 'info' | 'announcement' | 'success' | 'warning' | 'error';

const kindToUIType: Record<NotificationKind, UINotificationType> = {
  general: 'info',
  event: 'announcement',
  holiday: 'warning',
  request: 'info',
  absence: 'error',
};

const uiTypeToKind: Record<UINotificationType, NotificationKind> = {
  info: 'general',
  announcement: 'event',
  success: 'general',
  warning: 'holiday',
  error: 'absence',
};

export function mapKindToUI(kind: string): UINotificationType {
  return kindToUIType[kind as NotificationKind] || 'info';
}

export function mapUIToKind(type: UINotificationType): NotificationKind {
  return uiTypeToKind[type] || 'general';
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: UINotificationType;
  kind: NotificationKind;
  target_type: string | null;
  sent_by: string | null;
  sent_at: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListQuery {
  page: number;
  pageSize: number;
  search?: string;
  kind?: NotificationKind;
}

export interface CreateNotificationInput {
  title: string;
  body: string;
  kind: NotificationKind;
  target_type?: string;
  recipient_user_id?: string | null;
  recipient_parent_id?: string | null;
  student_id?: string | null;
  sent_at?: string | null;
}

export interface UpdateNotificationInput {
  title?: string;
  body?: string;
  kind?: NotificationKind;
  target_type?: string;
}

// ─── Service functions ───────────────────────────────────────────────────────

export async function listNotifications(
  query: NotificationListQuery
): Promise<{ items: NotificationRecord[]; total: number; error: AppError | null }> {
  const { page, pageSize, search, kind } = query;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    // Get current user for is_read check
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    let statement = supabase
      .from('notifications')
      .select('id, title, body, kind, target_type, sent_by, sent_at, created_at', { count: 'exact' })
      .eq('del_yn', false);

    if (kind) {
      statement = statement.eq('kind', kind);
    }

    if (search?.trim()) {
      const q = `%${search.trim()}%`;
      statement = statement.or(`title.ilike.${q},body.ilike.${q}`);
    }

    statement = statement
      .order('created_at', { ascending: false })
      .range(from, to);

    const result = await withSupabaseTimeout(
      statement,
      8000,
      { data: null, error: { message: 'Timeout loading notifications', details: '', hint: '', code: 'TIMEOUT' } } as any
    );

    if (result.error) throw result.error;

    // Get read status for current user
    let readSet = new Set<string>();
    if (userId && result.data?.length) {
      const ids = (result.data as any[]).map((n: any) => n.id);
      const { data: reads } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', userId)
        .in('notification_id', ids);

      readSet = new Set((reads || []).map((r: any) => r.notification_id));
    }

    const items: NotificationRecord[] = ((result.data || []) as any[]).map((row: any) => ({
      id: row.id,
      title: row.title,
      message: row.body,
      type: mapKindToUI(row.kind),
      kind: row.kind,
      target_type: row.target_type,
      sent_by: row.sent_by,
      sent_at: row.sent_at,
      is_read: readSet.has(row.id),
      created_at: row.created_at,
    }));

    return { items, total: result.count || 0, error: null };
  } catch (err) {
    return { items: [], total: 0, error: toAppError(err, 'Không tải được danh sách thông báo.') };
  }
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<{ item: NotificationRecord | null; error: AppError | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        title: input.title,
        body: input.body,
        kind: input.kind,
        target_type: input.target_type || 'specific',
        recipient_user_id: input.recipient_user_id || null,
        recipient_parent_id: input.recipient_parent_id || null,
        student_id: input.student_id || null,
        sent_by: user?.id || null,
        sent_at: input.sent_at || new Date().toISOString(),
      })
      .select('id, title, body, kind, target_type, sent_by, sent_at, created_at')
      .single();

    if (error) throw error;

    const item: NotificationRecord = {
      id: data.id,
      title: data.title,
      message: data.body,
      type: mapKindToUI(data.kind),
      kind: data.kind,
      target_type: data.target_type,
      sent_by: data.sent_by,
      sent_at: data.sent_at,
      is_read: false,
      created_at: data.created_at,
    };

    return { item, error: null };
  } catch (err) {
    return { item: null, error: toAppError(err, 'Không tạo được thông báo.') };
  }
}

export async function updateNotification(
  id: string,
  input: UpdateNotificationInput
): Promise<{ error: AppError | null }> {
  try {
    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.body !== undefined) updateData.body = input.body;
    if (input.kind !== undefined) updateData.kind = input.kind;
    if (input.target_type !== undefined) updateData.target_type = input.target_type;

    const { error } = await supabase
      .from('notifications')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: toAppError(err, 'Không cập nhật được thông báo.') };
  }
}

export async function deleteNotification(id: string): Promise<{ error: AppError | null }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ del_yn: true })
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: toAppError(err, 'Không xóa được thông báo.') };
  }
}

export async function markAsRead(notificationId: string): Promise<{ error: AppError | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { code: 'AUTH', message: 'Chưa đăng nhập.' } };

    const { error } = await supabase
      .from('notification_reads')
      .upsert(
        {
          notification_id: notificationId,
          user_id: user.id,
        },
        { onConflict: 'notification_id,user_id' }
      );

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: toAppError(err, 'Không đánh dấu đã đọc được.') };
  }
}

export async function markAllAsRead(): Promise<{ error: AppError | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { code: 'AUTH', message: 'Chưa đăng nhập.' } };

    // Get all unread notification IDs
    const { data: allNotifs, error: fetchErr } = await supabase
      .from('notifications')
      .select('id')
      .eq('del_yn', false);

    if (fetchErr) throw fetchErr;
    if (!allNotifs?.length) return { error: null };

    // Get already-read IDs
    const { data: reads } = await supabase
      .from('notification_reads')
      .select('notification_id')
      .eq('user_id', user.id);

    const readSet = new Set((reads || []).map((r: any) => r.notification_id));
    const unreadIds = allNotifs
      .filter((n: any) => !readSet.has(n.id))
      .map((n: any) => n.id);

    if (unreadIds.length === 0) return { error: null };

    // Bulk insert reads
    const rows = unreadIds.map((nId: string) => ({
      notification_id: nId,
      user_id: user.id,
    }));

    const { error } = await supabase
      .from('notification_reads')
      .upsert(rows, { onConflict: 'notification_id,user_id' });

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: toAppError(err, 'Không đánh dấu tất cả đã đọc được.') };
  }
}
