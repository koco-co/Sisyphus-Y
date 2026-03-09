'use client';

import {
  GitBranch,
  List,
  Network,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import type { TestPointItem, TestPointSource } from '@/stores/scene-map-store';
import { ExportButtons } from './ExportButtons';

const sourceNodeStyles: Record<TestPointSource, string> = {
  document:
    'bg-sy-accent/10 border border-sy-accent/35 text-sy-accent',
  supplemented:
    'bg-sy-warn/10 border border-sy-warn/35 text-sy-warn',
  missing:
    'bg-sy-danger/10 border-[1.5px] border-sy-danger text-sy-danger font-semibold',
  pending:
    'bg-sy-bg-3 border border-dashed border-sy-border-2 text-sy-text-3',
};

const sourceDotColor: Record<TestPointSource, string> = {
  document: 'bg-sy-accent',
  supplemented: 'bg-sy-warn',
  missing: 'bg-sy-danger',
  pending: 'bg-sy-text-3',
};

interface SceneMapViewProps {
  testPoints: TestPointItem[];
  selectedPointId: string | null;
  onSelectPoint: (id: string) => void;
  requirementId?: string | null;
  stats: {
    total: number;
    confirmed: number;
    document: number;
    supplemented: number;
    missing: number;
    pending: number;
  };
}

type ViewMode = 'tree' | 'list';

export function SceneMapView({
  testPoints,
  selectedPointId,
  onSelectPoint,
  requirementId,
  stats,
}: SceneMapViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['__all__']),
  );

  const grouped: Record<string, TestPointItem[]> = {};
  for (const tp of testPoints) {
    const group = tp.group_name || '未分组';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(tp);
  }
  const groupEntries = Object.entries(grouped);

  const toggleGroupExpand = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const isGroupExpanded = (group: string) =>
    expandedGroups.has('__all__') || expandedGroups.has(group);

  const totalEstimated = testPoints.reduce(
    (sum, tp) => sum + tp.estimated_cases,
    0,
  );

  return (
    <div className="flex flex-col h-full" data-scene-map-view>
      {/* Header with view toggle */}
      <div className="col-header">
        <GitBranch size={14} className="text-sy-accent" />
        <span>场景地图</span>
        <div className="ml-auto flex items-center gap-0.5 bg-sy-bg-2 rounded-md p-0.5 border border-sy-border">
          <button
            type="button"
            onClick={() => setViewMode('tree')}
            className={`p-1 rounded transition-colors ${
              viewMode === 'tree'
                ? 'bg-sy-accent/15 text-sy-accent'
                : 'text-sy-text-3 hover:text-sy-text-2'
            }`}
            title="树形视图"
          >
            <Network size={12} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1 rounded transition-colors ${
              viewMode === 'list'
                ? 'bg-sy-accent/15 text-sy-accent'
                : 'text-sy-text-3 hover:text-sy-text-2'
            }`}
            title="列表视图"
          >
            <List size={12} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-3 border-b border-sy-border">
        <div className="flex justify-between text-[11px] text-sy-text-3 mb-1.5">
          <span>确认进度</span>
          <span className="font-mono">
            {stats.confirmed}/{stats.total}
          </span>
        </div>
        <div className="h-1 rounded-full bg-sy-bg-3 overflow-hidden">
          <div
            className="h-full bg-sy-accent rounded-full transition-all"
            style={{
              width: `${stats.total ? (stats.confirmed / stats.total) * 100 : 0}%`,
            }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-sy-bg-2 rounded-md p-2 border border-sy-border text-center">
            <div className="font-mono text-[16px] font-semibold text-sy-accent">
              {stats.total}
            </div>
            <div className="text-[10px] text-sy-text-3">测试点</div>
          </div>
          <div className="bg-sy-bg-2 rounded-md p-2 border border-sy-border text-center">
            <div className="font-mono text-[16px] font-semibold text-sy-text">
              {totalEstimated}
            </div>
            <div className="text-[10px] text-sy-text-3">预计用例</div>
          </div>
          <div className="bg-sy-bg-2 rounded-md p-2 border border-sy-border text-center">
            <div className="font-mono text-[16px] font-semibold text-sy-warn">
              {stats.missing}
            </div>
            <div className="text-[10px] text-sy-text-3">缺失</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-3 py-2 border-b border-sy-border flex flex-wrap gap-x-3 gap-y-1">
        {(
          [
            { source: 'document', label: '已覆盖' },
            { source: 'supplemented', label: 'AI 补全' },
            { source: 'missing', label: '缺失' },
            { source: 'pending', label: '待确认' },
          ] as const
        ).map((item) => (
          <div key={item.source} className="flex items-center gap-1.5 text-[10px] text-sy-text-3">
            <div
              className={`w-2 h-2 rounded-full ${sourceDotColor[item.source]}`}
            />
            {item.label}
          </div>
        ))}
      </div>

      {/* Export Buttons */}
      <ExportButtons requirementId={requirementId ?? null} disabled={testPoints.length === 0} />

      {/* Tree / List view */}
      <div className="flex-1 overflow-y-auto p-3">
        {testPoints.length === 0 ? (
          <div className="text-center py-8 text-sy-text-3 text-[12px]">
            暂无测试点数据
          </div>
        ) : viewMode === 'tree' ? (
          /* Tree View */
          <div className="space-y-1">
            {groupEntries.map(([group, points]) => {
              const isExpanded = isGroupExpanded(group);
              return (
                <div key={group}>
                  <button
                    type="button"
                    onClick={() => toggleGroupExpand(group)}
                    className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-[11px] font-semibold text-sy-text-2 hover:bg-sy-bg-2 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown size={12} />
                    ) : (
                      <ChevronRight size={12} />
                    )}
                    <GitBranch size={11} className="text-sy-accent" />
                    <span>{group}</span>
                    <span className="ml-auto font-mono text-sy-text-3">
                      {points.length}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="ml-3 pl-3 border-l border-sy-border">
                      {points.map((tp, i) => {
                        const nodeStyle =
                          sourceNodeStyles[tp.source] ??
                          sourceNodeStyles.pending;
                        const isSelected = selectedPointId === tp.id;
                        const isLast = i === points.length - 1;

                        return (
                          <div key={tp.id} className="relative">
                            {/* Tree connector */}
                            <div className="absolute left-[-12px] top-1/2 w-3 border-t border-sy-border" />
                            {!isLast && (
                              <div className="absolute left-[-12px] top-1/2 bottom-0 border-l border-sy-border" />
                            )}

                            <button
                              type="button"
                              onClick={() => onSelectPoint(tp.id)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] mb-1 transition-all ${nodeStyle} ${
                                isSelected
                                  ? 'ring-1 ring-sy-accent/40 shadow-sm'
                                  : 'hover:opacity-80'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <div
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${sourceDotColor[tp.source] ?? sourceDotColor.pending}`}
                                />
                                <span className="truncate">{tp.title}</span>
                                <span className="ml-auto font-mono opacity-70 shrink-0">
                                  {tp.priority}
                                </span>
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-1">
            {testPoints.map((tp) => {
              const nodeStyle =
                sourceNodeStyles[tp.source] ?? sourceNodeStyles.pending;
              const isSelected = selectedPointId === tp.id;

              return (
                <button
                  key={tp.id}
                  type="button"
                  onClick={() => onSelectPoint(tp.id)}
                  className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-md text-[11px] transition-all ${nodeStyle} ${
                    isSelected
                      ? 'ring-1 ring-sy-accent/40 shadow-sm'
                      : 'hover:opacity-80'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${sourceDotColor[tp.source] ?? sourceDotColor.pending}`}
                  />
                  <span className="flex-1 truncate">{tp.title}</span>
                  <span className="font-mono text-[10px] opacity-60 shrink-0">
                    {tp.group_name}
                  </span>
                  <span className="font-mono text-[10px] opacity-70 shrink-0">
                    {tp.priority}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
