'use client';

import { Collapse, Drawer, Spin, Tooltip } from 'antd';
import { Activity, AlertCircle, CheckCircle2, Circle, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Module {
  id: string;
  name: string;
  status: 'done' | 'in_progress' | 'partial' | 'pending';
}

interface Phase {
  id: string;
  name: string;
  status: string;
  modules: Module[];
}

interface ProgressData {
  version: string;
  lastUpdated: string;
  phases: Phase[];
}

const statusConfig: Record<
  string,
  { icon: React.ReactNode; iconClass: string; pillClass: string; label: string }
> = {
  done: {
    icon: <CheckCircle2 size={14} />,
    iconClass: 'text-accent',
    pillClass: 'pill pill-green',
    label: '已完成',
  },
  in_progress: {
    icon: <Spin size="small" />,
    iconClass: 'text-blue',
    pillClass: 'pill pill-blue',
    label: '进行中',
  },
  partial: {
    icon: <AlertCircle size={14} />,
    iconClass: 'text-amber',
    pillClass: 'pill pill-amber',
    label: '部分完成',
  },
  pending: {
    icon: <Circle size={14} />,
    iconClass: 'text-text3',
    pillClass: 'pill pill-gray',
    label: '待开始',
  },
};

export default function ProgressDashboard() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/progress');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.warn('Failed to fetch progress:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchProgress();
      const interval = setInterval(fetchProgress, 30000);
      return () => clearInterval(interval);
    }
  }, [open, fetchProgress]);

  const getPhaseProgress = (phase: Phase) => {
    const total = phase.modules.length;
    if (total === 0) return 0;
    const done = phase.modules.filter((m) => m.status === 'done').length;
    const partial = phase.modules.filter((m) => m.status === 'partial').length;
    return Math.round(((done + partial * 0.5) / total) * 100);
  };

  const getOverallProgress = () => {
    if (!data) return 0;
    const allModules = data.phases.flatMap((p) => p.modules);
    const total = allModules.length;
    if (total === 0) return 0;
    const done = allModules.filter((m) => m.status === 'done').length;
    const partial = allModules.filter((m) => m.status === 'partial').length;
    return Math.round(((done + partial * 0.5) / total) * 100);
  };

  const collapseItems = data?.phases.map((phase) => {
    const progress = getPhaseProgress(phase);
    const phaseStatus = statusConfig[phase.status] || statusConfig.pending;

    return {
      key: phase.id,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <span className={phaseStatus.iconClass}>{phaseStatus.icon}</span>
          <span style={{ flex: 1, fontWeight: 500, fontSize: 13 }}>{phase.name}</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
            {progress}%
          </span>
        </div>
      ),
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="progress-bar" style={{ marginBottom: 8 }}>
            <div
              className="progress-fill"
              style={{ width: `${progress}%`, transition: 'width 0.5s ease' }}
            />
          </div>
          {phase.modules.map((mod) => {
            const ms = statusConfig[mod.status] || statusConfig.pending;
            return (
              <div
                key={mod.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 0',
                  fontSize: 12.5,
                }}
              >
                <span className={ms.iconClass} style={{ display: 'flex', alignItems: 'center' }}>
                  {ms.icon}
                </span>
                <span style={{ flex: 1 }}>
                  <span className="mono" style={{ color: 'var(--text3)', marginRight: 6 }}>
                    {mod.id}
                  </span>
                  {mod.name}
                </span>
                <Tooltip title={ms.label}>
                  <span className={ms.pillClass} style={{ fontSize: 10, padding: '1px 6px' }}>
                    {ms.label}
                  </span>
                </Tooltip>
              </div>
            );
          })}
        </div>
      ),
    };
  });

  const overall = getOverallProgress();

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="progress-fab"
        title="开发进度大盘"
      >
        <Activity size={22} />
      </button>

      {/* Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} style={{ color: 'var(--accent)' }} />
            <span>开发进度大盘</span>
          </div>
        }
        placement="right"
        width={420}
        open={open}
        onClose={() => setOpen(false)}
        closeIcon={<X size={16} />}
        styles={{
          body: { padding: '16px', background: 'var(--bg1)' },
          header: { background: 'var(--bg)', borderBottom: '1px solid var(--border)' },
        }}
      >
        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : data ? (
          <>
            {/* Overall progress */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>总体进度</span>
                <span
                  className="mono"
                  style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}
                >
                  {overall}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${overall}%`, transition: 'width 0.5s ease' }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                上次更新: {new Date(data.lastUpdated).toLocaleString('zh-CN')}
              </div>
            </div>

            {/* Phase details */}
            <Collapse
              items={collapseItems}
              defaultActiveKey={data.phases
                .filter((p) => p.status === 'in_progress')
                .map((p) => p.id)}
              ghost
              style={{ background: 'transparent' }}
            />
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
            暂无进度数据
          </div>
        )}
      </Drawer>
    </>
  );
}
