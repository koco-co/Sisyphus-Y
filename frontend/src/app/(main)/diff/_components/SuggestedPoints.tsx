'use client';

import { Check, Lightbulb, X } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { SuggestionItem } from '@/stores/diff-store';

interface SuggestedPointsProps {
  suggestions: SuggestionItem[];
  adoptedIds: Set<number>;
  dismissedIds: Set<number>;
  onAdopt: (index: number) => void;
  onDismiss: (index: number) => void;
  className?: string;
}

const categoryLabel: Record<string, string> = {
  normal: '正常',
  exception: '异常',
  boundary: '边界',
  concurrent: '并发',
  permission: '权限',
};

const priorityVariant: Record<string, 'danger' | 'warning' | 'info'> = {
  P0: 'danger',
  P1: 'warning',
  P2: 'info',
};

export function SuggestedPoints({
  suggestions,
  adoptedIds,
  dismissedIds,
  onAdopt,
  onDismiss,
  className = '',
}: SuggestedPointsProps) {
  const activeItems = suggestions.filter((_, i) => !adoptedIds.has(i) && !dismissedIds.has(i));
  const adoptedCount = adoptedIds.size;

  return (
    <div className={`border border-border rounded-lg overflow-hidden bg-bg1 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg1">
        <Lightbulb className="w-3.5 h-3.5 text-amber" />
        <span className="text-[12px] font-medium text-text2">建议新增测试点</span>
        <span className="ml-auto font-mono text-[10px] text-text3">
          {adoptedCount} 已采纳 / {suggestions.length} 总计
        </span>
      </div>

      <div className="p-2 space-y-1.5 max-h-[360px] overflow-y-auto">
        {suggestions.map((item, index) => {
          const adopted = adoptedIds.has(index);
          const dismissed = dismissedIds.has(index);

          if (dismissed) return null;

          return (
            <div
              key={`${item.category}-${item.priority}-${item.name}-${item.description ?? 'none'}`}
              className={`p-3 rounded-lg border transition-all ${
                adopted
                  ? 'bg-accent/5 border-accent/25 opacity-70'
                  : 'bg-bg2 border-border hover:border-border2'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[12.5px] font-medium text-text">{item.name}</span>
                    <StatusBadge variant={priorityVariant[item.priority] ?? 'info'}>
                      {item.priority}
                    </StatusBadge>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-bg3 text-text3 border border-border">
                      {categoryLabel[item.category] ?? item.category}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-[11.5px] text-text2 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                  {item.reason && (
                    <p className="text-[11px] text-text3 mt-1 italic">理由：{item.reason}</p>
                  )}
                </div>

                {!adopted && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onAdopt(index)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-accent/10 text-accent border border-accent/25 hover:bg-accent/20 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      采纳
                    </button>
                    <button
                      type="button"
                      onClick={() => onDismiss(index)}
                      className="flex items-center justify-center w-6 h-6 rounded-md text-text3 hover:text-red hover:bg-red/10 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {adopted && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-accent">
                    <Check className="w-3 h-3" />
                    已采纳
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {activeItems.length === 0 && suggestions.length > 0 && (
          <p className="text-[12px] text-text3 text-center py-6">所有建议已处理</p>
        )}

        {suggestions.length === 0 && (
          <div className="flex flex-col items-center py-8 text-text3">
            <Lightbulb className="w-8 h-8 opacity-30 mb-2" />
            <span className="text-[12px]">暂无新增建议</span>
            <span className="text-[11px] text-text3/60 mt-0.5">计算 Diff 后将自动生成</span>
          </div>
        )}
      </div>
    </div>
  );
}
