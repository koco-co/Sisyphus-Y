'use client';

import { AlertTriangle, Bell, CheckCheck, FileText, HeartPulse, Inbox, Wand2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  time: string;
  icon: 'requirement' | 'diagnosis' | 'generation' | 'alert';
}

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

const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    title: '诊断完成',
    message: '需求 REQ-042 的健康诊断已完成，评分 78',
    type: 'success',
    read: false,
    time: '3 分钟前',
    icon: 'diagnosis',
  },
  {
    id: '2',
    title: '用例生成完成',
    message: '「用户登录」场景已生成 12 条测试用例',
    type: 'info',
    read: false,
    time: '15 分钟前',
    icon: 'generation',
  },
  {
    id: '3',
    title: '需求变更',
    message: 'REQ-038 发生变更，可能影响 5 条用例',
    type: 'warning',
    read: false,
    time: '1 小时前',
    icon: 'alert',
  },
  {
    id: '4',
    title: '新需求导入',
    message: '「数据导出」需求文档已解析完成',
    type: 'info',
    read: true,
    time: '2 小时前',
    icon: 'requirement',
  },
  {
    id: '5',
    title: '模型降级',
    message: 'GLM-4-Flash 连续失败，已降级到备用模型',
    type: 'error',
    read: true,
    time: '3 小时前',
    icon: 'alert',
  },
];

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="theme-toggle relative"
        onClick={() => setOpen(!open)}
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
        <div className="absolute right-0 top-10 w-80 bg-bg1 border border-border rounded-lg shadow-lg z-50 overflow-hidden" role="menu" aria-label="通知列表">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-[13px] font-semibold text-text">通知</span>
            {unreadCount > 0 && (
               <button
                type="button"
                className="text-[11px] text-accent hover:text-accent2 transition-colors flex items-center gap-1"
                onClick={markAllRead}
                aria-label="将全部通知标记为已读"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                全部已读
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-text3">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-[12px]">暂无通知</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = iconMap[n.icon];
                return (
                  <button
                    type="button"
                    key={n.id}
                    className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-bg2 transition-colors border-b border-border/50 last:border-b-0 ${
                      !n.read ? 'bg-accent/3' : ''
                    }`}
                    onClick={() => markRead(n.id)}
                  >
                    <div className={`shrink-0 mt-0.5 ${typeColors[n.type]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] font-medium text-text truncate">
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                        )}
                      </div>
                      <p className="text-[11.5px] text-text3 mt-0.5 line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-text3/60 font-mono mt-1 block">
                        {n.time}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-border bg-bg2/50">
            <a
              href="/notifications"
              className="text-[11.5px] text-accent hover:text-accent2 transition-colors"
            >
              查看全部通知 →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
