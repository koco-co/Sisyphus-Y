'use client';

import {
  BarChart3,
  ClipboardList,
  FileText,
  Layers,
  Package,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const COLORS = ['var(--accent)', 'var(--amber)', 'var(--red)', 'var(--purple)', 'var(--blue)'];

function DistributionCard({
  title,
  icon,
  items,
  total,
  labelKey,
  labelMap,
}: {
  title: string;
  icon: React.ReactNode;
  items: any[];
  total: number;
  labelKey: string;
  labelMap?: Record<string, string>;
}) {
  return (
    <div className="card">
      <div className="sec-header" style={{ marginBottom: 14 }}>
        {icon}
        <span className="sec-title">{title}</span>
      </div>
      {items.map((item, i) => {
        const pct = total > 0 ? (item.count / total) * 100 : 0;
        const label = labelMap?.[item[labelKey]] ?? item[labelKey];
        return (
          <div key={item[labelKey]} style={{ marginBottom: 10 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 12.5, color: 'var(--text)' }}>{label}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
                {item.count} <span style={{ fontSize: 10 }}>({pct.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${pct}%`,
                  background: COLORS[i % COLORS.length],
                }}
              />
            </div>
          </div>
        );
      })}
      {items.length === 0 && (
        <div style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'center', padding: 16 }}>
          暂无数据
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any>({});
  const [priority, setPriority] = useState<any[]>([]);
  const [status, setStatus] = useState<any[]>([]);
  const [source, setSource] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/analytics/overview`)
        .then((r) => r.json())
        .catch(() => ({})),
      fetch(`${API}/analytics/priority-distribution`)
        .then((r) => r.json())
        .catch(() => []),
      fetch(`${API}/analytics/status-distribution`)
        .then((r) => r.json())
        .catch(() => []),
      fetch(`${API}/analytics/source-distribution`)
        .then((r) => r.json())
        .catch(() => []),
    ]).then(([ov, pr, st, sr]) => {
      setOverview(ov);
      setPriority(pr);
      setStatus(st);
      setSource(sr);
    });
  }, []);

  const totalCases = priority.reduce((s, p) => s + p.count, 0) || 1;

  const kpis = [
    {
      label: '子产品',
      value: overview.product_count,
      color: 'var(--blue)',
      icon: <Package size={16} />,
    },
    {
      label: '迭代',
      value: overview.iteration_count,
      color: 'var(--purple)',
      icon: <Layers size={16} />,
    },
    {
      label: '需求',
      value: overview.requirement_count,
      color: 'var(--amber)',
      icon: <FileText size={16} />,
    },
    {
      label: '测试用例',
      value: overview.testcase_count,
      color: 'var(--accent)',
      icon: <ClipboardList size={16} />,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="topbar">
        <BarChart3 size={20} style={{ color: 'var(--accent)' }} />
        <h1>质量分析看板</h1>
        <span className="sub">Quality Analytics</span>
        <div className="spacer" />
        <span className="page-watermark">M14 · ANALYTICS</span>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {kpis.map((kpi) => (
          <div className="card card-hover" key={kpi.label}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `color-mix(in srgb, ${kpi.color} 12%, transparent)`,
                  color: kpi.color,
                }}
              >
                {kpi.icon}
              </div>
              <span className="stat-label" style={{ marginTop: 0 }}>
                {kpi.label}
              </span>
            </div>
            <div className="stat-val" style={{ color: kpi.color }}>
              {kpi.value || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Distribution Charts */}
      <div className="grid-3">
        <DistributionCard
          title="优先级分布"
          icon={<PieChart size={14} style={{ color: 'var(--accent)' }} />}
          items={priority}
          total={totalCases}
          labelKey="priority"
        />
        <DistributionCard
          title="状态分布"
          icon={<TrendingUp size={14} style={{ color: 'var(--accent)' }} />}
          items={status}
          total={totalCases}
          labelKey="status"
          labelMap={{
            draft: '草稿',
            active: '有效',
            deprecated: '废弃',
          }}
        />
        <DistributionCard
          title="来源分布"
          icon={<BarChart3 size={14} style={{ color: 'var(--accent)' }} />}
          items={source}
          total={totalCases}
          labelKey="source"
          labelMap={{ ai: 'AI 生成', manual: '手动创建' }}
        />
      </div>
    </div>
  );
}
