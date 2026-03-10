import { create } from 'zustand';
import type { NotificationViewItem } from '@/hooks/useNotifications';

interface NotificationsState {
  notifications: NotificationViewItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  setNotifications: (notifications: NotificationViewItem[], unreadCount: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  markReadLocal: (notificationId: string) => void;
  markAllReadLocal: () => void;
  removeLocal: (notificationId: string) => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: true,
  error: null,
  setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({ notifications: [], unreadCount: 0, loading: false, error: null }),
  markReadLocal: (notificationId) =>
    set((state) => {
      const target = state.notifications.find((item) => item.id === notificationId);
      return {
        notifications: state.notifications.map((item) =>
          item.id === notificationId ? { ...item, read: true } : item,
        ),
        unreadCount:
          target && !target.read ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    }),
  markAllReadLocal: () =>
    set((state) => ({
      notifications: state.notifications.map((item) => ({ ...item, read: true })),
      unreadCount: 0,
    })),
  removeLocal: (notificationId) =>
    set((state) => {
      const target = state.notifications.find((item) => item.id === notificationId);
      return {
        notifications: state.notifications.filter((item) => item.id !== notificationId),
        unreadCount:
          target && !target.read ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    }),
}));
