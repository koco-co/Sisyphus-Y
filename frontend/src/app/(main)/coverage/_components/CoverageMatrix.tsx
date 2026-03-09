'use client';

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import type { IterationCoverage } from './types';

interface CoverageMatrixProps {
  iterations: IterationCoverage[];
}

const rateColor = (rate: number) =>
  rate >= 80 ? 'var(--accent)' : rate >= 50 ? 'var(--amber)' : 'var(--red)';

const rateFillClass = (rate: number) => (rate >= 80 ? '' : rate >= 50 ? 'amber' : 'red');

function StatusIcon({ rate }: { rate: number }) {
  if (rate >= 80) return <CheckCircle2 className="w-4 h-4 text-accent" />;
  if (rate >= 50) return <AlertCircle className="w-4 h-4 text-amber" />;
  return <XCircle className="w-4 h-4 text-red" />;
}

function CoverageCellBadge({ status }: { status: 'full' | 'partial' | 'none' }) {
  const config = {
    full: { label: '全覆盖', cls: 'bg-accent/10 border-accent/30 text-accent' },
    partial: { label: '部分', cls: 'bg-amber/10 border-amber/30 text-amber' },
    none: { label: '未覆盖', cls: 'bg-red/10 border-red/30 text-red' },
  };
  const c = config[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${c.cls}`}
    >
      {c.label}
    </span>
  );
}

function IterationRow({ iter }: { iter: IterationCoverage }) {
  const [expanded, setExpanded] = useState(false);
  const requirements = iter.requirements ?? [];
  const coveredCount = iter.requirement_count - iter.uncovered_count;

  return (
    <>
      {/* Iteration header row */}
      <tr
        className="cursor-pointer hover:bg-bg2 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-3 py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-text3" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-text3" />
            )}
            <StatusIcon rate={iter.coverage_rate} />
            <span className="text-[13px] font-semibold text-text">{iter.iteration_name}</span>
          </div>
        </td>
        <td className="px-3 py-2.5 border-b border-border text-center">
          <span className="pill pill-blue">{iter.requirement_count}</span>
        </td>
        <td className="px-3 py-2.5 border-b border-border text-center">
          <span className="pill pill-purple">{iter.testcase_count}</span>
        </td>
        <td className="px-3 py-2.5 border-b border-border text-center">
          <span className="pill pill-green">{coveredCount}</span>
        </td>
        <td className="px-3 py-2.5 border-b border-border text-center">
          {iter.uncovered_count > 0 ? (
            <span className="pill pill-red">{iter.uncovered_count}</span>
          ) : (
            <span className="pill pill-gray">0</span>
          )}
        </td>
        <td className="px-3 py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="progress-bar flex-1" style={{ height: 6 }}>
              <div
                className={`progress-fill ${rateFillClass(iter.coverage_rate)}`}
                style={{ width: `${iter.coverage_rate}%` }}
              />
            </div>
            <span
              className="font-mono text-[12px] font-semibold w-10 text-right"
              style={{ color: rateColor(iter.coverage_rate) }}
            >
              {iter.coverage_rate}%
            </span>
          </div>
        </td>
      </tr>

      {/* Expanded requirement rows */}
      {expanded &&
        requirements.length > 0 &&
        requirements.map((req) => (
          <tr key={req.id} className="bg-bg2/50 hover:bg-bg2 transition-colors">
            <td className="px-3 py-2 border-b border-border pl-10">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-accent">{req.req_id}</span>
                <span className="text-[12px] text-text2 truncate max-w-[260px]">{req.title}</span>
              </div>
            </td>
            <td className="px-3 py-2 border-b border-border text-center">
              <span className="font-mono text-[11px] text-text3">
                {req.test_points?.length ?? 0}
              </span>
            </td>
            <td className="px-3 py-2 border-b border-border text-center">
              <span className="font-mono text-[11px] text-text3">
                {req.test_points?.reduce((s, tp) => s + tp.case_count, 0) ?? 0}
              </span>
            </td>
            <td className="px-3 py-2 border-b border-border text-center" colSpan={2}>
              <CoverageCellBadge status={req.coverage_status} />
            </td>
            <td className="px-3 py-2 border-b border-border text-center">
              {req.coverage_status === 'none' && (
                <a
                  href={`/workbench?req=${req.id}`}
                  className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent2 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3 h-3" />
                  生成
                </a>
              )}
            </td>
          </tr>
        ))}

      {expanded && requirements.length === 0 && (
        <tr>
          <td
            colSpan={6}
            className="px-3 py-6 border-b border-border text-center text-[12px] text-text3"
          >
            暂无需求级覆盖详情，请确认后端已提供 requirements 字段
          </td>
        </tr>
      )}
    </>
  );
}

export function CoverageMatrix({ iterations }: CoverageMatrixProps) {
  if (iterations.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="sec-header mb-0 px-1">
        <span className="sec-title">覆盖度矩阵</span>
      </div>

      <div className="overflow-x-auto mt-3">
        <table className="tbl w-full">
          <thead>
            <tr>
              <th className="text-left min-w-[240px]">迭代 / 需求</th>
              <th className="text-center w-[90px]">需求数</th>
              <th className="text-center w-[90px]">用例数</th>
              <th className="text-center w-[90px]">已覆盖</th>
              <th className="text-center w-[90px]">未覆盖</th>
              <th className="w-[180px]">覆盖率</th>
            </tr>
          </thead>
          <tbody>
            {iterations.map((iter) => (
              <IterationRow key={iter.iteration_id} iter={iter} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
