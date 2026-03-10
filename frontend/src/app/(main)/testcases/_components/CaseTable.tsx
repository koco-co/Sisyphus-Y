'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, Check, Minus } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { SortDirection, SortField, TestCaseDetail } from './types';
import {
  formatRelativeTime,
  priorityVariant,
  sourceLabel,
  statusLabel,
  statusVariant,
  typeLabel,
} from './types';

interface CaseTableProps {
  cases: TestCaseDetail[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onRowClick: (tc: TestCaseDetail) => void;
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  loading: boolean;
}

function SortIcon({
  field,
  currentField,
  direction,
}: {
  field: SortField;
  currentField: SortField | null;
  direction: SortDirection;
}) {
  if (field !== currentField)
    return (
      <ArrowUpDown className="w-3 h-3 opacity-0 group-hover/th:opacity-50 transition-opacity" />
    );
  return direction === 'asc' ? (
    <ArrowUp className="w-3 h-3 text-accent" />
  ) : (
    <ArrowDown className="w-3 h-3 text-accent" />
  );
}

const columns: { key: SortField; label: string; className?: string }[] = [
  { key: 'title', label: '用例' },
  { key: 'priority', label: '优先级', className: 'w-20' },
  { key: 'status', label: '状态', className: 'w-20' },
  { key: 'case_type', label: '类型', className: 'w-20' },
  { key: 'source', label: '来源', className: 'w-24' },
  { key: 'updated_at', label: '更新时间', className: 'w-24' },
];

export function CaseTable({
  cases,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  sortField,
  sortDirection,
  onSort,
  loading,
}: CaseTableProps) {
  const allSelected = cases.length > 0 && cases.every((c) => selectedIds.has(c.id));
  const someSelected = cases.some((c) => selectedIds.has(c.id));

  return (
    <div className="bg-bg1 border border-border rounded-[10px] overflow-hidden shadow-[var(--shadow)]">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {/* checkbox header */}
            <th className="w-10 px-3 py-2.5 border-b border-border">
              <button
                type="button"
                onClick={onToggleSelectAll}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  allSelected
                    ? 'bg-accent border-accent text-white'
                    : someSelected
                      ? 'bg-bg3 border-accent text-accent'
                      : 'bg-bg2 border-border2 hover:border-accent'
                }`}
              >
                {allSelected ? (
                  <Check className="w-2.5 h-2.5" />
                ) : someSelected ? (
                  <Minus className="w-2.5 h-2.5" />
                ) : null}
              </button>
            </th>

            {columns.map((col) => (
              <th
                key={col.key}
                className={`group/th text-left text-[11px] font-semibold text-text3 uppercase tracking-wider px-3 py-2.5 border-b border-border cursor-pointer select-none ${col.className ?? ''}`}
                onClick={() => onSort(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  <SortIcon field={col.key} currentField={sortField} direction={sortDirection} />
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="py-16 text-center text-[12.5px] text-text3"
              >
                加载中...
              </td>
            </tr>
          ) : (
            cases.map((tc) => (
              <tr
                key={tc.id}
                className="group/row cursor-pointer transition-colors hover:bg-bg2/60"
                onClick={() => onRowClick(tc)}
              >
                {/* checkbox */}
                <td className="px-3 py-2.5 border-b border-border/50">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(tc.id);
                    }}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      selectedIds.has(tc.id)
                        ? 'bg-accent border-accent text-white'
                        : 'bg-bg2 border-border2 group-hover/row:border-accent/50'
                    }`}
                  >
                    {selectedIds.has(tc.id) && <Check className="w-2.5 h-2.5" />}
                  </button>
                </td>

                {/* case id + title */}
                <td className="px-3 py-2.5 border-b border-border/50">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[11px] text-accent">{tc.case_id}</span>
                    <span className="text-[12.5px] text-text2 group-hover/row:text-text truncate max-w-[360px]">
                      {tc.title}
                    </span>
                  </div>
                </td>

                {/* priority */}
                <td className="px-3 py-2.5 border-b border-border/50">
                  <StatusBadge variant={priorityVariant[tc.priority] ?? 'gray'}>
                    {tc.priority}
                  </StatusBadge>
                </td>

                {/* status */}
                <td className="px-3 py-2.5 border-b border-border/50">
                  <StatusBadge variant={statusVariant[tc.status] ?? 'gray'}>
                    {statusLabel[tc.status] ?? tc.status}
                  </StatusBadge>
                </td>

                {/* type */}
                <td className="px-3 py-2.5 border-b border-border/50">
                  <span className="text-[12px] text-text3">
                    {typeLabel[tc.case_type] ?? tc.case_type}
                  </span>
                </td>

                {/* source */}
                <td className="px-3 py-2.5 border-b border-border/50">
                  <StatusBadge
                    variant={
                      tc.source === 'ai_generated' || tc.source === 'ai'
                        ? 'info'
                        : tc.source === 'imported'
                          ? 'purple'
                          : 'gray'
                    }
                  >
                    {sourceLabel[tc.source] ?? tc.source}
                  </StatusBadge>
                </td>

                {/* updated_at */}
                <td className="px-3 py-2.5 border-b border-border/50">
                  <span className="font-mono text-[11px] text-text3">
                    {formatRelativeTime(tc.updated_at)}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
