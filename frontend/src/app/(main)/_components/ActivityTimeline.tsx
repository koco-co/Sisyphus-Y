'use client';

import {
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  GitBranch,
  HeartPulse,
  TestTube,
  Wand2,
} from 'lucide-react';
import type { ActivityItem } from '@/stores/dashboard-store';

const RESOURCE_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ size?: number }>; pillClass: string }
> = {
  testcase: { icon: TestTube, pillClass: 'pill pill-green' },
  diagnosis: { icon: HeartPulse, pillClass: 'pill pill-red' },
  scene_map: { icon: GitBranch, pillClass: 'pill pill-amber' },
  requirement: { icon: FileText, pillClass: 'pill pill-blue' },
  knowledge: { icon: BookOpen, pillClass: 'pill pill-purple' },
  export: { icon: Download, pillClass: 'pill pill-gray' },
  iteration: { icon: Clock, pillClass: 'pill pill-blue' },
  generation: { icon: Wand2, pillClass: 'pill pill-green' },
};

function formatTime(raw: string): string {
  if (!raw || raw.length < 5) return raw;
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin} 分钟前`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} 小时前`;

    const isYesterday =
      new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    if (isYesterday) return `昨天 ${time}`;
    return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
  } catch {
    return raw;
  }
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  loading?: boolean;
}

export default function ActivityTimeline({
  activities,
  loading,
}: ActivityTimelineProps) {
  if (loading) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--text3)' }}>加载中...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="sec-header" style={{ marginBottom: 12 }}>
        <Clock size={14} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>最近活动</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {activities.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}>
            <CheckCircle2 size={36} />
            <p>暂无活动记录</p>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {activities.map((activity, idx) => {
              const cfg = RESOURCE_CONFIG[activity.resource] || {
                icon: FileText,
                pillClass: 'pill pill-gray',
              };
              const Icon = cfg.icon;
              const isLast = idx === activities.length - 1;

              return (
                <div
                  key={activity.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 16px',
                    borderBottom: isLast
                      ? 'none'
                      : '1px solid var(--border)',
                    transition: 'background 0.1s',
                  }}
                >
                  {/* Timeline dot */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: 'var(--text3)',
                    }}
                  >
                    <Icon size={13} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--text)', marginBottom: 2 }}>
                      <span style={{ fontWeight: 500 }}>{activity.action}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>{activity.title}</span>
                      {activity.user && (
                        <>
                          <span>·</span>
                          <span>{activity.user}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Time */}
                  <span
                    className="mono"
                    style={{
                      fontSize: 10.5,
                      color: 'var(--text3)',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatTime(activity.time)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
