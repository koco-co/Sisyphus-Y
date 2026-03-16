'use client';

import { Brain, Pencil, Plus, Trash2 } from 'lucide-react';
import type { SemanticChange, SemanticImpact } from '@/stores/diff-store';

// Backend compute_diff result may also return change_summary list format
interface ChangeSummaryItem {
  change_type: 'added' | 'removed' | 'modified';
  summary: string;
  business_impact: string;
}

interface SemanticAnalysisProps {
  /** Legacy format: SemanticImpact from diff-store (changes/summary/overall_risk) */
  impact?: SemanticImpact | null;
  /** New format: change_summary from compute_diff semantic analysis result */
  changeSummary?: ChangeSummaryItem[] | null;
  className?: string;
}

// ── Legacy change item (type/description/impact_scope/severity) ──

const changeTypeConfig: Record<string, { label: string; icon: typeof Plus; badgeClass: string }> = {
  added: {
    label: '新增功能',
    icon: Plus,
    badgeClass: 'bg-sy-accent/10 text-sy-accent border border-sy-accent/25',
  },
  modified: {
    label: '修改逻辑',
    icon: Pencil,
    badgeClass: 'bg-sy-warn/10 text-sy-warn border border-sy-warn/25',
  },
  deleted: {
    label: '删除功能',
    icon: Trash2,
    badgeClass: 'bg-sy-danger/10 text-sy-danger border border-sy-danger/25',
  },
};

const severityConfig: Record<string, { label: string; dotClass: string }> = {
  high: { label: '高', dotClass: 'bg-sy-danger' },
  medium: { label: '中', dotClass: 'bg-sy-warn' },
  low: { label: '低', dotClass: 'bg-sy-accent' },
};

function LegacyChangeItem({ change }: { change: SemanticChange }) {
  const config = changeTypeConfig[change.type] ?? changeTypeConfig.modified;
  const severity = severityConfig[change.severity] ?? severityConfig.low;
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 p-3 bg-sy-bg-2 border border-sy-border rounded-lg">
      <div
        className={`flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${config.badgeClass}`}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] text-sy-text leading-relaxed">{change.description}</p>
        {change.impact_scope && (
          <p className="text-[11px] text-sy-text-3 mt-1">影响范围：{change.impact_scope}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`w-1.5 h-1.5 rounded-full ${severity.dotClass}`} />
        <span className="text-[10px] font-mono text-sy-text-3">{severity.label}</span>
      </div>
    </div>
  );
}

// ── New format: change_summary item ──

const changeSummaryTypeConfig: Record<string, { label: string; icon: typeof Plus; badgeClass: string }> = {
  added: {
    label: '新增',
    icon: Plus,
    badgeClass: 'bg-sy-accent/10 text-sy-accent border border-sy-accent/25',
  },
  modified: {
    label: '修改',
    icon: Pencil,
    badgeClass: 'bg-sy-warn/10 text-sy-warn border border-sy-warn/25',
  },
  removed: {
    label: '删除',
    icon: Trash2,
    badgeClass: 'bg-sy-danger/10 text-sy-danger border border-sy-danger/25',
  },
};

function ChangeSummaryCard({ item }: { item: ChangeSummaryItem }) {
  const config = changeSummaryTypeConfig[item.change_type] ?? changeSummaryTypeConfig.modified;
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 p-3 bg-sy-bg-2 border border-sy-border rounded-lg">
      <div
        className={`flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${config.badgeClass}`}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] text-sy-text leading-relaxed">{item.summary}</p>
        {item.business_impact && (
          <p className="text-[11px] text-sy-text-2 mt-1">
            <span className="text-sy-text-3">业务影响：</span>
            {item.business_impact}
          </p>
        )}
      </div>
    </div>
  );
}

export function SemanticAnalysis({ impact, changeSummary, className = '' }: SemanticAnalysisProps) {
  const hasChangeSummary = changeSummary && changeSummary.length > 0;
  const hasLegacyChanges = impact && impact.changes.length > 0;
  const isEmpty = !hasChangeSummary && !hasLegacyChanges;

  return (
    <div className={`border border-sy-border rounded-lg overflow-hidden bg-sy-bg-1 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-sy-border bg-sy-bg-1">
        <Brain className="w-3.5 h-3.5 text-sy-purple" />
        <span className="text-[12px] font-medium text-sy-text-2">AI 语义分析</span>
        {impact?.overall_risk && (
          <span
            className={`ml-auto px-2 py-0.5 rounded-full font-mono text-[10px] font-medium ${
              impact.overall_risk === 'high'
                ? 'bg-sy-danger/10 text-sy-danger border border-sy-danger/25'
                : impact.overall_risk === 'medium'
                  ? 'bg-sy-warn/10 text-sy-warn border border-sy-warn/25'
                  : 'bg-sy-accent/10 text-sy-accent border border-sy-accent/25'
            }`}
          >
            风险 {impact.overall_risk.toUpperCase()}
          </span>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* Overall summary (legacy format) */}
        {impact?.summary && (
          <p className="text-[12.5px] text-sy-text-2 leading-relaxed pb-2 border-b border-sy-border">
            {impact.summary}
          </p>
        )}

        {/* New format: change_summary cards */}
        {hasChangeSummary &&
          changeSummary.map((item, i) => (
            <ChangeSummaryCard
              key={`cs-${item.change_type}-${i}`}
              item={item}
            />
          ))}

        {/* Legacy format: SemanticChange cards */}
        {!hasChangeSummary &&
          impact?.changes.map((change) => (
            <LegacyChangeItem
              key={`${change.type}-${change.severity}-${change.description}-${change.impact_scope ?? 'none'}`}
              change={change}
            />
          ))}

        {isEmpty && (
          <p className="text-[12px] text-sy-text-3 text-center py-4">
            暂无语义分析结果，Diff 计算完成后自动更新
          </p>
        )}
      </div>
    </div>
  );
}
