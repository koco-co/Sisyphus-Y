'use client';

import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import type { CoverageRequirement, IterationCoverage } from './types';

interface UncoveredListProps {
  iterations: IterationCoverage[];
}

interface UncoveredItem {
  iterationName: string;
  req: CoverageRequirement;
}

export function UncoveredList({ iterations }: UncoveredListProps) {
  const uncovered: UncoveredItem[] = [];

  for (const iter of iterations) {
    if (!iter.requirements) continue;
    for (const req of iter.requirements) {
      if (req.coverage_status === 'none') {
        uncovered.push({ iterationName: iter.iteration_name, req });
      }
    }
  }

  if (uncovered.length === 0) {
    return (
      <div className="card mt-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-accent" />
          <span className="sec-title text-[13px]">未覆盖需求</span>
        </div>
        <div className="flex flex-col items-center py-8 text-text3">
          <ShieldAlert className="w-8 h-8 opacity-30 mb-2" />
          <span className="text-[12px]">所有需求均已覆盖</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red" />
          <span className="sec-title text-[13px]">未覆盖需求</span>
        </div>
        <span className="pill pill-red">{uncovered.length} 个</span>
      </div>

      <div className="space-y-2">
        {uncovered.map(({ iterationName, req }) => (
          <div
            key={req.id}
            className="flex items-center justify-between gap-3 p-3 bg-bg2 border border-border rounded-lg hover:border-border2 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[11px] text-red font-medium">{req.req_id}</span>
                <span className="text-[10px] text-text3 bg-bg3 rounded px-1.5 py-0.5">
                  {iterationName}
                </span>
              </div>
              <p className="text-[12px] text-text2 truncate">{req.title}</p>
            </div>
            <a
              href={`/workbench?req=${req.id}`}
              className="btn btn-sm btn-primary flex items-center gap-1 whitespace-nowrap"
            >
              生成用例
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
