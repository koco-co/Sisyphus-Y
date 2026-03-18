'use client';

import {
  Bug,
  CheckCircle,
  ClipboardList,
  FileText,
  Layers,
  Package,
  Target,
  Zap,
} from 'lucide-react';
import type { AnalyticsOverview } from './types';
import { getGrade, getGradeBg, getGradeColor } from './types';

interface DashboardOverviewProps {
  overview: AnalyticsOverview;
}

const COLOR_BG_CLASS: Record<string, string> = {
  'text-sy-accent': 'bg-sy-accent/10',
  'text-sy-info': 'bg-sy-info/10',
  'text-purple': 'bg-purple/10',
  'text-sy-warn': 'bg-sy-warn/10',
  'text-sy-danger': 'bg-sy-danger/10',
};

function ScoreCard({ overview }: { overview: AnalyticsOverview }) {
  const grade = getGrade(overview.quality_score);
  const gradeColor = getGradeColor(grade);
  const gradeBg = getGradeBg(grade);

  return (
    <div className={`rounded-xl border p-5 flex items-center gap-5 ${gradeBg}`}>
      <div className="flex flex-col items-center">
        <span className={`font-display text-[48px] font-bold leading-none ${gradeColor}`}>
          {grade}
        </span>
        <span className="text-[10px] text-text3 mt-1 uppercase tracking-wider">评级</span>
      </div>
      <div className="h-12 w-px bg-border2/50" />
      <div>
        <div className={`font-mono text-[32px] font-bold leading-none ${gradeColor}`}>
          {overview.quality_score}
        </div>
        <span className="text-[11px] text-text3 mt-1 block">质量评分（满分 100）</span>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: typeof CheckCircle;
  colorClass: string;
}) {
  return (
    <div className="card card-hover">
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${COLOR_BG_CLASS[colorClass] ?? 'bg-sy-accent/10'}`}
        >
          <Icon className={`w-4 h-4 ${colorClass}`} />
        </div>
        <span className="text-[11.5px] text-text3">{label}</span>
      </div>
      <div className={`font-mono text-[24px] font-semibold leading-none ${colorClass}`}>
        {value}
        {suffix}
      </div>
    </div>
  );
}

export function DashboardOverview({ overview }: DashboardOverviewProps) {
  const kpis = [
    { label: '子产品', value: overview.product_count, icon: Package, color: 'text-sy-info' },
    { label: '迭代', value: overview.iteration_count, icon: Layers, color: 'text-purple' },
    { label: '需求', value: overview.requirement_count, icon: FileText, color: 'text-sy-warn' },
    {
      label: '测试用例',
      value: overview.testcase_count,
      icon: ClipboardList,
      color: 'text-sy-accent',
    },
  ];

  const metrics = [
    {
      label: '通过率',
      value: overview.pass_rate,
      suffix: '%',
      icon: CheckCircle,
      color: 'text-sy-accent',
    },
    {
      label: '覆盖率',
      value: overview.coverage_rate,
      suffix: '%',
      icon: Target,
      color: 'text-sy-info',
    },
    { label: '缺陷密度', value: overview.defect_density, icon: Bug, color: 'text-sy-danger' },
    {
      label: '自动化率',
      value: overview.automation_rate,
      suffix: '%',
      icon: Zap,
      color: 'text-purple',
    },
  ];

  return (
    <div className="space-y-4 mb-5">
      {/* Score + KPI row */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-1">
          <ScoreCard overview={overview} />
        </div>
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card card-hover">
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${COLOR_BG_CLASS[kpi.color] ?? 'bg-sy-accent/10'}`}
              >
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <span className="text-[11.5px] text-text3">{kpi.label}</span>
            </div>
            <div className={`font-mono text-[24px] font-semibold leading-none ${kpi.color}`}>
              {kpi.value || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Metrics row */}
      <div className="grid-4">
        {metrics.map((m) => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={m.value || 0}
            suffix={m.suffix}
            icon={m.icon}
            colorClass={m.color}
          />
        ))}
      </div>
    </div>
  );
}
