'use client';

import { BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { DistributionItem } from './types';

const CHART_COLORS = [
  'var(--accent)',
  'var(--amber)',
  'var(--red)',
  'var(--purple)',
  'var(--blue)',
];

const PRIORITY_LABELS: Record<string, string> = {
  P0: 'P0 · 阻塞',
  P1: 'P1 · 严重',
  P2: 'P2 · 一般',
  P3: 'P3 · 轻微',
};

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  active: '有效',
  deprecated: '废弃',
  pending_review: '待审核',
};

const SOURCE_LABELS: Record<string, string> = {
  ai: 'AI 生成',
  manual: '手动创建',
};

interface DistributionChartsProps {
  priority: DistributionItem[];
  status: DistributionItem[];
  source: DistributionItem[];
  totalCases: number;
}

function DonutChart({
  data,
  labelKey,
  labelMap,
}: {
  data: DistributionItem[];
  labelKey: string;
  labelMap?: Record<string, string>;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-[12px] text-text3">
        暂无数据
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: labelMap?.[item[labelKey] as string] ?? (item[labelKey] as string),
    value: item.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={70}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {chartData.map((_, i) => (
            <Cell key={chartData[i].name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: 'var(--bg1)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--text)',
          }}
        />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text2)' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function BarList({
  data,
  labelKey,
  labelMap,
  total,
}: {
  data: DistributionItem[];
  labelKey: string;
  labelMap?: Record<string, string>;
  total: number;
}) {
  return (
    <div className="space-y-2.5 mt-1">
      {data.map((item, i) => {
        const pct = total > 0 ? (item.count / total) * 100 : 0;
        const label = labelMap?.[item[labelKey] as string] ?? (item[labelKey] as string);
        return (
          <div key={label}>
            <div className="flex justify-between mb-1">
              <span className="text-[12px] text-text">{label}</span>
              <span className="font-mono text-[11px] text-text3">
                {item.count}
                <span className="text-[10px] ml-1">({pct.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="progress-bar" style={{ height: 4 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${pct}%`,
                  background: CHART_COLORS[i % CHART_COLORS.length],
                }}
              />
            </div>
          </div>
        );
      })}
      {data.length === 0 && <div className="text-center text-[12px] text-text3 py-6">暂无数据</div>}
    </div>
  );
}

export function DistributionCharts({
  priority,
  status,
  source,
  totalCases,
}: DistributionChartsProps) {
  return (
    <div className="grid-3">
      {/* Priority - Donut */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <PieChartIcon className="w-3.5 h-3.5 text-accent" />
          <span className="sec-title text-[13px]">优先级分布</span>
        </div>
        <DonutChart data={priority} labelKey="priority" labelMap={PRIORITY_LABELS} />
        <BarList
          data={priority}
          labelKey="priority"
          labelMap={PRIORITY_LABELS}
          total={totalCases}
        />
      </div>

      {/* Status - Donut */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-accent" />
          <span className="sec-title text-[13px]">状态分布</span>
        </div>
        <DonutChart data={status} labelKey="status" labelMap={STATUS_LABELS} />
        <BarList data={status} labelKey="status" labelMap={STATUS_LABELS} total={totalCases} />
      </div>

      {/* Source - Donut */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-3.5 h-3.5 text-accent" />
          <span className="sec-title text-[13px]">来源分布</span>
        </div>
        <DonutChart data={source} labelKey="source" labelMap={SOURCE_LABELS} />
        <BarList data={source} labelKey="source" labelMap={SOURCE_LABELS} total={totalCases} />
      </div>
    </div>
  );
}
