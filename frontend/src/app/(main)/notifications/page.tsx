'use client';

import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  FileText,
  Filter,
  HeartPulse,
  Inbox,
  Loader2,
  Trash2,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { type NotificationSeverity, useNotifications } from '@/hooks/useNotifications';

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

const typeBg = {
  info: 'bg-blue/5 border-blue/15',
  success: 'bg-accent/5 border-accent/15',
  warning: 'bg-amber/5 border-amber/15',
  error: 'bg-red/5 border-red/15',
};

type FilterType = 'all' | 'unread' | NotificationSeverity;

export default function NotificationsPage() {
  const {
    user,
    hasHydrated,
    isAuthenticated,
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    deleteNotification,
  } = useNotifications();
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (filter === 'unread') return !notification.read;
      if (filter === 'all') return true;
      return notification.type === filter;
    });
  }, [filter, notifications]);

  const groupedNotifications = useMemo(() => {
    return filteredNotifications.reduce<Record<string, typeof filteredNotifications>>(
      (acc, item) => {
        acc[item.date] = acc[item.date] || [];
        acc[item.date].push(item);
        return acc;
      },
      {},
    );
  }, [filteredNotifications]);

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'unread', label: '未读' },
    { value: 'success', label: '成功' },
    { value: 'warning', label: '警告' },
    { value: 'error', label: '错误' },
    { value: 'info', label: '信息' },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-accent" />
          <h1 className="font-display text-lg font-bold text-text">通知中心</h1>
          {unreadCount > 0 && <span className="pill pill-red text-[10px]">{unreadCount} 未读</span>}
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated && unreadCount > 0 && (
            <button type="button" className="btn btn-sm" onClick={() => void markAllRead()}>
              <CheckCheck className="w-3.5 h-3.5" />
              全部已读
            </button>
          )}
        </div>
      </div>

      {!hasHydrated || loading ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16 text-text3">
            <Loader2 className="w-8 h-8 animate-spin text-accent mb-3" />
            <span className="text-[13px]">加载通知数据...</span>
          </div>
        </div>
      ) : !isAuthenticated ? (
        <div className="card py-16 text-center">
          <Bell className="w-10 h-10 text-text3/40 mx-auto mb-3" />
          <p className="text-[13px] text-text mb-2">请先登录后查看个人通知</p>
          <p className="text-[12px] text-text3">
            通知列表会按当前账号实时拉取，支持未读数、已读和删除操作。
          </p>
          <Link href="/login" className="btn btn-primary inline-flex mt-4">
            去登录
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-text3" />
              {filterOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-colors ${
                    filter === option.value
                      ? 'bg-accent/10 text-accent border border-accent/25'
                      : 'text-text3 hover:text-text2 hover:bg-bg2 border border-transparent'
                  }`}
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="text-[12px] text-text3">
              当前账号：<span className="text-text2">{user?.username}</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-md bg-red/8 border border-red/20 text-red text-[12.5px]">
              {error}
            </div>
          )}

          {Object.keys(groupedNotifications).length === 0 ? (
            <div className="py-16 text-center">
              <Inbox className="w-12 h-12 text-text3 mx-auto mb-3 opacity-30" />
              <p className="text-[13px] text-text3">暂无通知</p>
            </div>
          ) : (
            Object.entries(groupedNotifications).map(([date, items]) => (
              <div key={date} className="mb-6">
                <div className="text-[11px] font-semibold text-text3 uppercase tracking-wider mb-3">
                  {date}
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((notification) => {
                    const Icon = iconMap[notification.icon];
                    return (
                      <div
                        key={notification.id}
                        className={`card flex gap-4 items-start ${!notification.read ? 'border-l-2 border-l-accent' : ''}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${typeBg[notification.type]}`}
                        >
                          <Icon className={`w-4 h-4 ${typeColors[notification.type]}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-text">
                              {notification.title}
                            </span>
                            {!notification.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                            )}
                            <span className="ml-auto text-[10px] text-text3 font-mono shrink-0">
                              {notification.time}
                            </span>
                          </div>
                          <p className="text-[12px] text-text3 mt-1 leading-relaxed">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!notification.read && (
                            <button
                              type="button"
                              className="p-1.5 rounded hover:bg-bg2 text-text3 hover:text-accent transition-colors"
                              onClick={() => void markRead(notification.id)}
                              title="标记已读"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="p-1.5 rounded hover:bg-red/5 text-text3 hover:text-red transition-colors"
                            onClick={() => void deleteNotification(notification.id)}
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
