'use client';

import { AlertTriangle, CheckCircle2, FileText, XCircle } from 'lucide-react';
import type { CoverageSummary } from './types';

interface CoverageStatsProps {
  summary: CoverageSummary;
}

function CoverageRing({ rate }: { rate: number }) {
  const radius = 54;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;

  const rateColor = rate >= 80 ? '#00d9a3' : rate >= 50 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={140}
        height={140}
        className="-rotate-90"
        role="img"
        aria-label={`覆盖率 ${rate}%`}
      >
        <circle cx={70} cy={70} r={radius} stroke="#212730" strokeWidth={stroke} fill="none" />
        <circle
          cx={70}
          cy={70}
          r={radius}
          stroke={rateColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[28px] font-bold leading-none" style={{ color: rateColor }}>
          {rate}%
        </span>
        <span className="text-[11px] text-text3 mt-1">总覆盖率</span>
      </div>
    </div>
  );
}

export function CoverageStats({ summary }: CoverageStatsProps) {
  const stats = [
    {
      label: '已覆盖',
      value: summary.totalCovered,
      icon: CheckCircle2,
      color: 'text-sy-accent',
      bgColor: 'bg-sy-accent/10',
      borderColor: 'border-sy-accent/25',
    },
    {
      label: '部分覆盖',
      value: summary.totalPartial,
      icon: AlertTriangle,
      color: 'text-sy-warn',
      bgColor: 'bg-sy-warn/10',
      borderColor: 'border-sy-warn/25',
    },
    {
      label: '未覆盖',
      value: summary.totalUncovered,
      icon: XCircle,
      color: 'text-sy-danger',
      bgColor: 'bg-sy-danger/10',
      borderColor: 'border-sy-danger/25',
    },
    {
      label: '总需求数',
      value: summary.totalReqs,
      icon: FileText,
      color: 'text-sy-info',
      bgColor: 'bg-sy-info/10',
      borderColor: 'border-sy-info/25',
    },
  ];

  return (
    <div className="card mb-5">
      <div className="flex items-center gap-8">
        {/* Ring chart */}
        <div className="flex-shrink-0">
          <CoverageRing rate={summary.avgRate} />
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-4 gap-3 flex-1">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-lg border p-3 ${s.bgColor} ${s.borderColor}`}>
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                <span className="text-[11px] text-text3">{s.label}</span>
              </div>
              <div className={`font-mono text-[22px] font-semibold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
