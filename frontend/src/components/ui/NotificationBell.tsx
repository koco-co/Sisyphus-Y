'use client';

import {
  AlertTriangle,
  Bell,
  CheckCheck,
  FileText,
  HeartPulse,
  Inbox,
  Loader2,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

const iconMap = {
  requirement: FileText,
  diagnosis: HeartPulse,
  generation: Wand2,
  alert: AlertTriangle,
};

const typeColors = {
  info: 'text-blue',
  success: 'text-accent',
  warning: 'text-amber',
  error: 'text-red',
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, loading, error, isAuthenticated, markAllRead, markRead } =
    useNotifications(8);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="theme-toggle relative"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`通知${unreadCount > 0 ? `（${unreadCount} 条未读）` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red text-white text-[10px] font-mono font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 w-80 bg-bg1 border border-border rounded-lg shadow-lg z-50 overflow-hidden"
          role="menu"
          aria-label="通知列表"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-[13px] font-semibold text-text">通知</span>
            {isAuthenticated && unreadCount > 0 && (
              <button
                type="button"
                className="text-[11px] text-accent hover:text-accent2 transition-colors flex items-center gap-1"
                onClick={() => {
                  void markAllRead();
                }}
                aria-label="将全部通知标记为已读"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                全部已读
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {!isAuthenticated ? (
              <div className="py-10 px-4 text-center text-text3">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-[12px]">登录后查看通知中心与未读提醒</p>
                <Link
                  href="/login"
                  className="inline-flex mt-3 text-[11.5px] text-accent hover:text-accent2 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  去登录 →
                </Link>
              </div>
            ) : loading ? (
              <div className="py-10 text-center text-text3">
                <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin" />
                <p className="text-[12px]">加载通知中...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-text3">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-[12px]">暂无通知</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = iconMap[notification.icon];
                return (
                  <button
                    type="button"
                    key={notification.id}
                    className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-bg2 transition-colors border-b border-border/50 last:border-b-0 ${
                      !notification.read ? 'bg-accent/3' : ''
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        void markRead(notification.id);
                      }
                    }}
                  >
                    <div className={`shrink-0 mt-0.5 ${typeColors[notification.type]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] font-medium text-text truncate">
                          {notification.title}
                        </span>
                        {!notification.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                        )}
                      </div>
                      <p className="text-[11.5px] text-text3 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <span className="text-[10px] text-text3/60 font-mono mt-1 block">
                        {notification.time}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-border bg-bg2/50">
            {error ? (
              <span className="text-[11px] text-red">{error}</span>
            ) : (
              <Link
                href="/notifications"
                className="text-[11.5px] text-accent hover:text-accent2 transition-colors"
                onClick={() => setOpen(false)}
              >
                查看全部通知 →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
