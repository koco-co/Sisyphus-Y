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
  Trash2,
  Wand2,
} from 'lucide-react';
import { useState } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  time: string;
  date: string;
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

const typeBg = {
  info: 'bg-blue/5 border-blue/15',
  success: 'bg-accent/5 border-accent/15',
  warning: 'bg-amber/5 border-amber/15',
  error: 'bg-red/5 border-red/15',
};

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: '诊断完成',
    message: '需求 REQ-042 的健康诊断已完成，综合评分 78，发现 2 个高风险项',
    type: 'success',
    read: false,
    time: '10:32',
    date: '今天',
    icon: 'diagnosis',
  },
  {
    id: '2',
    title: '用例生成完成',
    message: '「用户登录」场景已生成 12 条测试用例，包含 3 条 P0 级冒烟用例',
    type: 'info',
    read: false,
    time: '10:15',
    date: '今天',
    icon: 'generation',
  },
  {
    id: '3',
    title: '需求变更检测',
    message: 'REQ-038 发生变更，Diff 分析显示可能影响 5 条已有用例',
    type: 'warning',
    read: false,
    time: '09:48',
    date: '今天',
    icon: 'alert',
  },
  {
    id: '4',
    title: '新需求导入',
    message: '「数据导出功能」需求文档已成功解析并导入系统',
    type: 'info',
    read: true,
    time: '09:20',
    date: '今天',
    icon: 'requirement',
  },
  {
    id: '5',
    title: '模型降级告警',
    message: 'GLM-4-Flash 连续 3 次调用失败，已自动降级到 Qwen-Max',
    type: 'error',
    read: true,
    time: '08:55',
    date: '今天',
    icon: 'alert',
  },
  {
    id: '6',
    title: '测试计划提醒',
    message: 'Sprint-12 测试计划将于明天到期，当前完成率 75%',
    type: 'warning',
    read: true,
    time: '18:30',
    date: '昨天',
    icon: 'alert',
  },
  {
    id: '7',
    title: '批量用例生成',
    message: '3 个需求的用例批量生成任务已完成，共生成 38 条用例',
    type: 'success',
    read: true,
    time: '16:20',
    date: '昨天',
    icon: 'generation',
  },
  {
    id: '8',
    title: '知识库更新',
    message: '测试规范文档 v2.1 已同步到知识库',
    type: 'info',
    read: true,
    time: '14:10',
    date: '昨天',
    icon: 'requirement',
  },
];

type FilterType = 'all' | 'unread' | 'info' | 'success' | 'warning' | 'error';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState<FilterType>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const grouped = filtered.reduce<Record<string, Notification[]>>((acc, n) => {
    acc[n.date] = acc[n.date] || [];
    acc[n.date].push(n);
    return acc;
  }, {});

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

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
          {unreadCount > 0 && (
            <button type="button" className="btn btn-sm" onClick={markAllRead}>
              <CheckCheck className="w-3.5 h-3.5" />
              全部已读
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-3.5 h-3.5 text-text3" />
        {filterOptions.map((f) => (
          <button
            type="button"
            key={f.value}
            className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-colors ${
              filter === f.value
                ? 'bg-accent/10 text-accent border border-accent/25'
                : 'text-text3 hover:text-text2 hover:bg-bg2 border border-transparent'
            }`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="py-16 text-center">
          <Inbox className="w-12 h-12 text-text3 mx-auto mb-3 opacity-30" />
          <p className="text-[13px] text-text3">暂无通知</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date} className="mb-6">
            <div className="text-[11px] font-semibold text-text3 uppercase tracking-wider mb-3">
              {date}
            </div>
            <div className="flex flex-col gap-2">
              {items.map((n) => {
                const Icon = iconMap[n.icon];
                return (
                  <div
                    key={n.id}
                    className={`card flex gap-4 items-start ${!n.read ? 'border-l-2 border-l-accent' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${typeBg[n.type]}`}
                    >
                      <Icon className={`w-4 h-4 ${typeColors[n.type]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-text">{n.title}</span>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                        )}
                        <span className="ml-auto text-[10px] text-text3 font-mono shrink-0">
                          {n.time}
                        </span>
                      </div>
                      <p className="text-[12px] text-text3 mt-1 leading-relaxed">{n.message}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.read && (
                        <button
                          type="button"
                          className="p-1.5 rounded hover:bg-bg2 text-text3 hover:text-accent transition-colors"
                          onClick={() => markRead(n.id)}
                          title="标记已读"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="p-1.5 rounded hover:bg-red/5 text-text3 hover:text-red transition-colors"
                        onClick={() => deleteNotification(n.id)}
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
    </div>
  );
}
