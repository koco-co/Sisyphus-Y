'use client';

import { FileText, Layers, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import ActivityTimeline from './_components/ActivityTimeline';
import PendingItems from './_components/PendingItems';
import QuickActions from './_components/QuickActions';

/* ── Page ── */

export default function DashboardPage() {
  const { stats, pendingItems, activities, loading, refresh } = useDashboard();

  return (
    <div className="no-sidebar">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* ── Welcome bar ── */}
        <div className="topbar">
          <div>
            <div className="page-watermark">SISYPHUS · DASHBOARD</div>
            <h1>仪表盘</h1>
            <div className="sub">
              AI 驱动的测试用例生成平台 · {stats.product_count} 个产品 · {stats.iteration_count}{' '}
              个活跃迭代
            </div>
          </div>
          <div className="spacer" />
          <button type="button" className="btn" onClick={refresh}>
            <RefreshCw size={14} />
            刷新
          </button>
        </div>

        {/* ── Welcome banner ── */}
        <div
          className="card fade-in"
          style={{
            marginBottom: 24,
            background: 'linear-gradient(135deg, var(--accent-d), rgba(59, 130, 246, 0.06))',
            borderColor: 'rgba(0, 217, 163, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--accent-d)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                欢迎回到 Sisyphus-Y
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                需求录入 → 健康诊断 → 测试点确认 → 用例生成 → 执行回流，构建完整测试生命周期
              </div>
            </div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card" style={{ borderLeft: '3px solid var(--accent)' }}>
            <div className="stat-val">{loading ? '—' : stats.product_count}</div>
            <div className="stat-label">子产品数</div>
            <div className="stat-delta" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Layers size={12} /> {stats.iteration_count} 个迭代
            </div>
          </div>
          <div className="card" style={{ borderLeft: '3px solid var(--blue)' }}>
            <div className="stat-val">{loading ? '—' : stats.requirement_count}</div>
            <div className="stat-label">需求总数</div>
            <div className="stat-delta" style={{ color: 'var(--blue)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <FileText size={12} /> 进行中
              </span>
            </div>
          </div>
          <div className="card" style={{ borderLeft: '3px solid var(--purple)' }}>
            <div className="stat-val">{loading ? '—' : stats.testcase_count}</div>
            <div className="stat-label">用例总数</div>
            <div className="stat-delta" style={{ color: 'var(--accent)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <TrendingUp size={12} /> 本周 +{stats.weekly_cases}
              </span>
            </div>
          </div>
          <div
            className="card"
            style={{
              borderLeft: `3px solid ${stats.coverage_rate >= 80 ? 'var(--accent)' : 'var(--amber)'}`,
            }}
          >
            <div
              className="stat-val"
              style={{ color: stats.coverage_rate >= 80 ? 'var(--accent)' : 'var(--amber)' }}
            >
              {loading ? '—' : `${stats.coverage_rate}%`}
            </div>
            <div className="stat-label">平均覆盖率</div>
            <div className="progress-bar" style={{ marginTop: 10 }}>
              <div
                className={`progress-fill${stats.coverage_rate < 80 ? ' amber' : ''}`}
                style={{ width: `${Math.min(stats.coverage_rate, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Quick actions ── */}
        <QuickActions />

        {/* ── Two-column: Pending + Activity ── */}
        <div className="grid-2" style={{ marginBottom: 32, alignItems: 'start' }}>
          <PendingItems items={pendingItems} />
          <ActivityTimeline activities={activities} loading={loading} />
        </div>
      </div>
    </div>
  );
}
