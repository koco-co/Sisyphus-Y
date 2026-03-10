'use client';

import { CheckCircle, ChevronDown, ChevronRight, FileText, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { SearchInput } from '@/components/ui';
import { CustomSelect } from '@/components/ui/CustomSelect';
import type { TestPointItem, TestPointSource } from '@/stores/scene-map-store';

const sourceConfig: Record<
  TestPointSource,
  { label: string; dotClass: string; itemClass: string }
> = {
  document: {
    label: '已覆盖',
    dotClass: 'bg-sy-accent',
    itemClass: 'bg-sy-accent/10 border border-sy-accent/35 text-sy-accent',
  },
  supplemented: {
    label: 'AI 补全',
    dotClass: 'bg-sy-warn',
    itemClass: 'bg-sy-warn/10 border border-sy-warn/35 text-sy-warn',
  },
  missing: {
    label: '缺失',
    dotClass: 'bg-sy-danger',
    itemClass: 'bg-sy-danger/10 border-[1.5px] border-sy-danger text-sy-danger font-semibold',
  },
  pending: {
    label: '待确认',
    dotClass: 'bg-sy-text-3',
    itemClass: 'bg-sy-bg-3 border border-dashed border-sy-border-2 text-sy-text-3',
  },
};

const priorityConfig: Record<string, { class: string }> = {
  P0: { class: 'bg-sy-danger/10 text-sy-danger border border-sy-danger/25' },
  P1: { class: 'bg-sy-warn/10 text-sy-warn border border-sy-warn/25' },
  P2: { class: 'bg-sy-info/10 text-sy-info border border-sy-info/25' },
  P3: { class: 'bg-sy-bg-3 text-sy-text-3 border border-sy-border' },
};

interface TestPointListProps {
  testPoints: TestPointItem[];
  selectedPointId: string | null;
  checkedPointIds: Set<string>;
  searchQuery: string;
  isLocked: boolean;
  stats: {
    total: number;
    document: number;
    supplemented: number;
    missing: number;
    pending: number;
    confirmed: number;
  };
  onSelectPoint: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onSearchChange: (q: string) => void;
  onAddPoint: (point: Omit<TestPointItem, 'id'>) => void;
}

export function TestPointList({
  testPoints,
  selectedPointId,
  checkedPointIds,
  searchQuery,
  isLocked,
  stats,
  onSelectPoint,
  onToggleCheck,
  onSearchChange,
  onAddPoint,
}: TestPointListProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newPriority, setNewPriority] = useState('P2');

  const filtered = searchQuery
    ? testPoints.filter(
        (tp) =>
          tp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tp.group_name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : testPoints;

  const grouped: Record<string, TestPointItem[]> = {};
  for (const tp of filtered) {
    const group = tp.group_name || '未分组';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(tp);
  }

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const handleAddPoint = () => {
    if (!newTitle.trim()) return;
    onAddPoint({
      group_name: newGroup || '自定义',
      title: newTitle.trim(),
      description: null,
      priority: newPriority,
      status: 'pending',
      estimated_cases: 1,
      source: 'document',
    });
    setNewTitle('');
    setNewGroup('');
    setNewPriority('P2');
    setShowAddForm(false);
  };

  const totalForBar = stats.total || 1;

  return (
    <div className="flex flex-col h-full">
      {/* Stats Cards */}
      <div className="p-3 border-b border-sy-border">
        <div className="grid grid-cols-4 gap-1.5">
          {(
            [
              { key: 'document', label: '已覆盖', color: 'text-sy-accent' },
              { key: 'supplemented', label: 'AI 补全', color: 'text-sy-warn' },
              { key: 'missing', label: '缺失', color: 'text-sy-danger' },
              { key: 'pending', label: '待确认', color: 'text-sy-text-3' },
            ] as const
          ).map((item) => (
            <div
              key={item.key}
              className="bg-sy-bg-2 rounded-md p-2 text-center border border-sy-border"
            >
              <div className={`font-mono text-[16px] font-semibold ${item.color}`}>
                {stats[item.key]}
              </div>
              <div className="text-[10px] text-sy-text-3 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Segmented progress bar */}
        <div className="flex h-1.5 rounded-full overflow-hidden mt-2.5 bg-sy-bg-3">
          {stats.document > 0 && (
            <div
              className="bg-sy-accent transition-all"
              style={{ width: `${(stats.document / totalForBar) * 100}%` }}
            />
          )}
          {stats.supplemented > 0 && (
            <div
              className="bg-sy-warn transition-all"
              style={{ width: `${(stats.supplemented / totalForBar) * 100}%` }}
            />
          )}
          {stats.missing > 0 && (
            <div
              className="bg-sy-danger transition-all"
              style={{ width: `${(stats.missing / totalForBar) * 100}%` }}
            />
          )}
          {stats.pending > 0 && (
            <div
              className="bg-sy-text-3 transition-all"
              style={{ width: `${(stats.pending / totalForBar) * 100}%` }}
            />
          )}
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[10px] text-sy-text-3 font-mono">
          <span>
            {stats.confirmed}/{stats.total} 已确认
          </span>
          <span>{stats.total} 总计</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-2.5 pb-1">
        <SearchInput value={searchQuery} onChange={onSearchChange} placeholder="搜索测试点..." />
      </div>

      {/* Grouped test points */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {Object.entries(grouped).map(([group, points]) => (
          <div key={group} className="mb-2">
            <button
              type="button"
              onClick={() => toggleGroup(group)}
              className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[11px] font-semibold text-sy-text-2 uppercase tracking-wide hover:text-sy-text transition-colors"
            >
              {collapsedGroups.has(group) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span className="flex-1 text-left">{group}</span>
              <span className="font-mono text-sy-text-3">{points.length}</span>
            </button>

            {!collapsedGroups.has(group) &&
              points.map((tp) => {
                const src = sourceConfig[tp.source] ?? sourceConfig.pending;
                const pri = priorityConfig[tp.priority] ?? priorityConfig.P3;
                const isSelected = selectedPointId === tp.id;
                const isChecked = checkedPointIds.has(tp.id);

                return (
                  <div
                    key={tp.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-[12px] mb-0.5 transition-all border ${
                      isSelected
                        ? 'bg-sy-accent/8 border-sy-accent/25'
                        : 'border-transparent hover:bg-sy-bg-2'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isLocked) onToggleCheck(tp.id);
                      }}
                      disabled={isLocked}
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                        isChecked
                          ? 'bg-sy-accent border-sy-accent text-black'
                          : 'border-sy-border-2 bg-sy-bg-2'
                      }`}
                    >
                      {isChecked && <CheckCircle size={10} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectPoint(tp.id)}
                      className="flex flex-1 items-center gap-2 min-w-0 text-left"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${src.dotClass}`} />
                      <span className="flex-1 truncate text-sy-text">{tp.title}</span>
                      <span
                        className={`inline-flex px-1.5 py-0 rounded-full text-[10px] font-mono font-medium ${pri.class}`}
                      >
                        {tp.priority}
                      </span>
                    </button>
                  </div>
                );
              })}
          </div>
        ))}

        {filtered.length === 0 && testPoints.length > 0 && (
          <div className="text-center py-6 text-sy-text-3 text-[12px]">无匹配结果</div>
        )}

        {testPoints.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-sy-text-3">
            <FileText size={32} className="opacity-30 mb-2" />
            <p className="text-[12px]">暂无测试点</p>
            <p className="text-[11px] opacity-70">点击 AI 生成 或手动添加</p>
          </div>
        )}
      </div>

      {/* Add button / form */}
      {!isLocked && (
        <div className="border-t border-sy-border p-2.5">
          {showAddForm ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="测试点名称"
                className="w-full px-2.5 py-1.5 text-[12px] bg-sy-bg-2 border border-sy-border rounded-md text-sy-text placeholder:text-sy-text-3 outline-none focus:border-sy-accent transition-colors"
              />
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  placeholder="分类（可选）"
                  className="flex-1 px-2.5 py-1.5 text-[12px] bg-sy-bg-2 border border-sy-border rounded-md text-sy-text placeholder:text-sy-text-3 outline-none focus:border-sy-accent transition-colors"
                />
                <CustomSelect
                  value={newPriority}
                  onChange={(value) => setNewPriority(value)}
                  options={[
                    { value: 'P0', label: 'P0' },
                    { value: 'P1', label: 'P1' },
                    { value: 'P2', label: 'P2' },
                    { value: 'P3', label: 'P3' },
                  ]}
                  size="sm"
                  className="w-[72px]"
                />
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleAddPoint}
                  disabled={!newTitle.trim()}
                  className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium bg-sy-accent text-black disabled:opacity-40 transition-opacity"
                >
                  <Plus size={12} />
                  添加
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-2.5 py-1.5 rounded-md text-[12px] text-sy-text-3 bg-sy-bg-2 border border-sy-border hover:text-sy-text transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 w-full px-3 py-2 rounded-md text-[12px] font-medium text-sy-accent border border-dashed border-sy-accent/30 hover:bg-sy-accent/5 transition-colors"
            >
              <Plus size={14} />
              手动添加测试点
            </button>
          )}
        </div>
      )}
    </div>
  );
}
