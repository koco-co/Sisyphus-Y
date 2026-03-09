'use client';

import { Filter, X } from 'lucide-react';
import type { CaseFilters } from './types';

interface FilterToolbarProps {
  filters: CaseFilters;
  onFilterChange: <K extends keyof CaseFilters>(
    key: K,
    value: CaseFilters[K],
  ) => void;
  onClearAll: () => void;
}

const filterGroups: {
  key: keyof CaseFilters;
  options: { value: string; label: string }[];
}[] = [
  {
    key: 'priority',
    options: [
      { value: '', label: '全部优先级' },
      { value: 'P0', label: 'P0 致命' },
      { value: 'P1', label: 'P1 严重' },
      { value: 'P2', label: 'P2 一般' },
      { value: 'P3', label: 'P3 轻微' },
    ],
  },
  {
    key: 'status',
    options: [
      { value: '', label: '全部状态' },
      { value: 'draft', label: '草稿' },
      { value: 'pending_review', label: '待审' },
      { value: 'active', label: '通过' },
      { value: 'deprecated', label: '废弃' },
    ],
  },
  {
    key: 'caseType',
    options: [
      { value: '', label: '全部类型' },
      { value: 'functional', label: '功能' },
      { value: 'boundary', label: '边界' },
      { value: 'exception', label: '异常' },
      { value: 'performance', label: '性能' },
      { value: 'security', label: '安全' },
    ],
  },
  {
    key: 'source',
    options: [
      { value: '', label: '全部来源' },
      { value: 'ai', label: 'AI 生成' },
      { value: 'manual', label: '手动创建' },
      { value: 'imported', label: '导入' },
    ],
  },
];

export function FilterToolbar({
  filters,
  onFilterChange,
  onClearAll,
}: FilterToolbarProps) {
  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-[12px] text-text3 mr-1">
        <Filter className="w-3.5 h-3.5" />
        <span>筛选</span>
      </div>

      {filterGroups.map(({ key, options }) => (
        <select
          key={key}
          value={filters[key]}
          onChange={(e) => onFilterChange(key, e.target.value)}
          className={`px-2.5 py-1.5 text-[12px] bg-bg2 border rounded-md outline-none focus:border-accent transition-colors cursor-pointer ${
            filters[key]
              ? 'border-accent/40 text-text'
              : 'border-border text-text2'
          }`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="flex items-center gap-1 px-2 py-1.5 text-[11.5px] text-text3 hover:text-text2 transition-colors"
        >
          <X className="w-3 h-3" />
          清除筛选 ({activeCount})
        </button>
      )}
    </div>
  );
}
