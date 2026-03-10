import { useCallback, useEffect } from 'react';
import { getApiErrorMessage, type NotificationRecord, notificationsApi } from '@/lib/api';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useAuthSession } from './useAuthSession';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';
export type NotificationIcon = 'requirement' | 'diagnosis' | 'generation' | 'alert';

export interface NotificationViewItem {
  id: string;
  title: string;
  message: string;
  type: NotificationSeverity;
  read: boolean;
  time: string;
  date: string;
  icon: NotificationIcon;
  createdAt: string;
  notificationType: string;
  relatedType: string | null;
}

function formatRelativeTime(value: string): string {
  const created = new Date(value);
  const diff = Date.now() - created.getTime();

  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} 分钟前`;
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))} 小时前`;

  return created.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDateGroup(value: string): string {
  const created = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const createdDay = created.toDateString();
  if (createdDay === today.toDateString()) return '今天';
  if (createdDay === yesterday.toDateString()) return '昨天';

  return created.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });
}

function resolveType(item: NotificationRecord): NotificationSeverity {
  const raw = item.notification_type.toLowerCase();
  if (raw === 'info' || raw === 'success' || raw === 'warning' || raw === 'error') {
    return raw;
  }

  const content = `${item.title} ${item.content ?? ''}`;
  if (content.includes('失败') || content.includes('异常') || content.includes('告警'))
    return 'error';
  if (content.includes('提醒') || content.includes('变更') || content.includes('风险'))
    return 'warning';
  if (content.includes('完成') || content.includes('成功') || content.includes('就绪'))
    return 'success';
  return 'info';
}

function resolveIcon(item: NotificationRecord): NotificationIcon {
  const relatedType = item.related_type?.toLowerCase() ?? '';
  if (relatedType.includes('diagnosis')) return 'diagnosis';
  if (
    relatedType.includes('generation') ||
    relatedType.includes('scene') ||
    relatedType.includes('case')
  ) {
    return 'generation';
  }
  if (relatedType.includes('requirement') || relatedType.includes('knowledge')) {
    return 'requirement';
  }
  return 'alert';
}

function normalizeNotification(item: NotificationRecord): NotificationViewItem {
  return {
    id: item.id,
    title: item.title,
    message: item.content ?? '暂无详细内容',
    type: resolveType(item),
    read: item.is_read,
    time: formatRelativeTime(item.created_at),
    date: formatDateGroup(item.created_at),
    icon: resolveIcon(item),
    createdAt: item.created_at,
    notificationType: item.notification_type,
    relatedType: item.related_type,
  };
}

export function useNotifications(pageSize = 100) {
  const { user, hasHydrated } = useAuthSession();
  const notifications = useNotificationsStore((state) => state.notifications);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const loading = useNotificationsStore((state) => state.loading);
  const error = useNotificationsStore((state) => state.error);
  const setNotifications = useNotificationsStore((state) => state.setNotifications);
  const setLoading = useNotificationsStore((state) => state.setLoading);
  const setError = useNotificationsStore((state) => state.setError);
  const reset = useNotificationsStore((state) => state.reset);
  const markReadLocal = useNotificationsStore((state) => state.markReadLocal);
  const markAllReadLocal = useNotificationsStore((state) => state.markAllReadLocal);
  const removeLocal = useNotificationsStore((state) => state.removeLocal);

  const fetchNotifications = useCallback(async () => {
    if (!hasHydrated) return;
    if (!user?.id) {
      reset();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [list, unread] = await Promise.all([
        notificationsApi.list({ userId: user.id, pageSize }),
        notificationsApi.unreadCount(user.id),
      ]);
      const items = list.items.map(normalizeNotification);
      setNotifications(items, unread.count ?? items.filter((item) => !item.read).length);
    } catch (err) {
      setError(getApiErrorMessage(err, '加载通知失败'));
    } finally {
      setLoading(false);
    }
  }, [hasHydrated, pageSize, reset, setError, setLoading, setNotifications, user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = useCallback(
    async (notificationId: string) => {
      setError(null);
      try {
        await notificationsApi.markRead(notificationId);
        markReadLocal(notificationId);
      } catch (err) {
        setError(getApiErrorMessage(err, '标记已读失败'));
      }
    },
    [markReadLocal, setError],
  );

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;

    setError(null);
    try {
      await notificationsApi.markAllRead(user.id);
      markAllReadLocal();
    } catch (err) {
      setError(getApiErrorMessage(err, '全部已读失败'));
    }
  }, [markAllReadLocal, setError, user?.id]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      setError(null);
      try {
        await notificationsApi.delete(notificationId);
        removeLocal(notificationId);
      } catch (err) {
        setError(getApiErrorMessage(err, '删除通知失败'));
      }
    },
    [removeLocal, setError],
  );

  return {
    user,
    hasHydrated,
    isAuthenticated: Boolean(user),
    notifications,
    unreadCount,
    loading,
    error,
    refresh: fetchNotifications,
    markRead,
    markAllRead,
    deleteNotification,
  };
}
