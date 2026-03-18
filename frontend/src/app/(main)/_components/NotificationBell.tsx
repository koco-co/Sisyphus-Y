'use client';
import { Bell, Check, CheckCheck, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

interface Notification {
  id: string;
  title: string;
  content: string | null;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications/unread-count?user_id=${DEMO_USER_ID}`);
      if (res.ok) {
        const data = (await res.json()) as { count: number };
        setUnread(data.count);
      }
    } catch {}
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/notifications/?user_id=${DEMO_USER_ID}&page=1&page_size=20`,
      );
      if (res.ok) {
        const data = (await res.json()) as { items: Notification[] };
        setNotifications(data.items ?? []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchUnread();
    const t = setInterval(() => void fetchUnread(), 30000);
    return () => clearInterval(t);
  }, [fetchUnread]);

  useEffect(() => {
    if (open) void fetchList();
  }, [open, fetchList]);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnread((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await fetch(`/api/notifications/read-all/${DEMO_USER_ID}`, { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="theme-toggle relative"
        aria-label="通知"
        title="通知"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sy-danger text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-sy-border bg-sy-bg-1 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-sy-border px-4 py-3">
            <span className="text-[13px] font-semibold text-sy-text">通知</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-sy-text-3 hover:text-sy-accent"
                  title="全部标为已读"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  全部已读
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded text-sy-text-3 hover:text-sy-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-sy-text-3" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <Bell className="h-7 w-7 text-sy-text-3/50" />
                <p className="text-[12px] text-sy-text-3">暂无通知</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 border-b border-sy-border/50 px-4 py-3 last:border-0 ${n.is_read ? 'opacity-60' : ''}`}
                >
                  <div className="mt-0.5 flex-1">
                    <p className="text-[12.5px] font-medium leading-tight text-sy-text">{n.title}</p>
                    {n.content && (
                      <p className="mt-1 text-[11px] leading-snug text-sy-text-2">{n.content}</p>
                    )}
                    <p className="mt-1.5 text-[10px] text-sy-text-3">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={() => void markRead(n.id)}
                      className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-sy-text-3 hover:text-sy-accent"
                      title="标为已读"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
