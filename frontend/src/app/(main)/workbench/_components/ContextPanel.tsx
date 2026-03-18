'use client';

import { BookOpen, FileText, Plus, Target, X } from 'lucide-react';
import type { ContextItem } from '@/stores/workspace-store';

interface ContextPanelProps {
  items: ContextItem[];
  onAdd: (item: ContextItem) => void;
  onRemove: (id: string) => void;
}

const TYPE_CONFIG: Record<
  ContextItem['type'],
  { icon: typeof BookOpen; label: string; color: string }
> = {
  knowledge: {
    icon: BookOpen,
    label: '知识库',
    color: 'text-purple bg-purple/10 border-purple/25',
  },
  requirement: {
    icon: FileText,
    label: '需求',
    color: 'text-sy-info bg-sy-info/10 border-sy-info/25',
  },
  test_point: {
    icon: Target,
    label: '测试点',
    color: 'text-sy-accent bg-sy-accent/10 border-sy-accent/25',
  },
  document: {
    icon: FileText,
    label: '文档',
    color: 'text-sy-warn bg-sy-warn/10 border-sy-warn/25',
  },
};

export function ContextPanel({ items, onAdd, onRemove }: ContextPanelProps) {
  const handleAddContext = () => {
    const id = `ctx-${Date.now()}`;
    onAdd({ id, type: 'knowledge', label: '新增上下文' });
  };

  return (
    <div className="px-3 py-2 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-text2 uppercase tracking-wider">
          上下文注入
        </span>
        <button
          type="button"
          onClick={handleAddContext}
          className="inline-flex items-center gap-0.5 text-[10px] text-sy-accent hover:text-sy-accent-2 transition-colors"
        >
          <Plus className="w-3 h-3" />
          添加
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-3 text-[11px] text-text3">暂无注入上下文</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => {
            const config = TYPE_CONFIG[item.type];
            const Icon = config.icon;
            return (
              <span
                key={item.id}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.color}`}
              >
                <Icon className="w-2.5 h-2.5" />
                {item.label}
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="ml-0.5 hover:opacity-70 transition-opacity"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
