'use client';

import { Brain, Pencil, Plus, Shield, Trash2, Wrench } from 'lucide-react';
import type { SemanticChange, SemanticImpact } from '@/stores/diff-store';

interface SemanticAnalysisProps {
  impact: SemanticImpact;
  className?: string;
}

const changeTypeConfig: Record<string, { label: string; icon: typeof Plus; badgeClass: string }> = {
  added: {
    label: '新增功能',
    icon: Plus,
    badgeClass: 'bg-accent/10 text-accent border border-accent/25',
  },
  modified: {
    label: '修改逻辑',
    icon: Pencil,
    badgeClass: 'bg-amber/10 text-amber border border-amber/25',
  },
  deleted: {
    label: '删除功能',
    icon: Trash2,
    badgeClass: 'bg-red/10 text-red border border-red/25',
  },
  fixed: {
    label: '修复缺陷',
    icon: Wrench,
    badgeClass: 'bg-blue/10 text-blue border border-blue/25',
  },
};

const severityConfig: Record<string, { label: string; dotClass: string }> = {
  high: { label: '高', dotClass: 'bg-red' },
  medium: { label: '中', dotClass: 'bg-amber' },
  low: { label: '低', dotClass: 'bg-accent' },
};

function ChangeItem({ change }: { change: SemanticChange }) {
  const config = changeTypeConfig[change.type] ?? changeTypeConfig.modified;
  const severity = severityConfig[change.severity] ?? severityConfig.low;
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 p-3 bg-bg2 border border-border rounded-lg">
      <div
        className={`flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${config.badgeClass}`}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] text-text leading-relaxed">{change.description}</p>
        {change.impact_scope && (
          <p className="text-[11px] text-text3 mt-1">影响范围：{change.impact_scope}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`w-1.5 h-1.5 rounded-full ${severity.dotClass}`} />
        <span className="text-[10px] font-mono text-text3">{severity.label}</span>
      </div>
    </div>
  );
}

export function SemanticAnalysis({ impact, className = '' }: SemanticAnalysisProps) {
  return (
    <div className={`border border-border rounded-lg overflow-hidden bg-bg1 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg1">
        <Brain className="w-3.5 h-3.5 text-purple" />
        <span className="text-[12px] font-medium text-text2">AI 语义分析</span>
        {impact.overall_risk && (
          <span
            className={`ml-auto px-2 py-0.5 rounded-full font-mono text-[10px] font-medium ${
              impact.overall_risk === 'high'
                ? 'bg-red/10 text-red border border-red/25'
                : impact.overall_risk === 'medium'
                  ? 'bg-amber/10 text-amber border border-amber/25'
                  : 'bg-accent/10 text-accent border border-accent/25'
            }`}
          >
            <Shield className="w-2.5 h-2.5 inline mr-1" />
            风险 {impact.overall_risk.toUpperCase()}
          </span>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* Summary */}
        {impact.summary && (
          <p className="text-[12.5px] text-text2 leading-relaxed pb-2 border-b border-border">
            {impact.summary}
          </p>
        )}

        {/* Changes list */}
        {impact.changes.map((change) => (
          <ChangeItem
            key={`${change.type}-${change.severity}-${change.description}-${change.impact_scope ?? 'none'}`}
            change={change}
          />
        ))}

        {impact.changes.length === 0 && (
          <p className="text-[12px] text-text3 text-center py-4">未检测到语义级变更</p>
        )}
      </div>
    </div>
  );
}
