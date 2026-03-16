'use client';

import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import type { ColumnMapping } from './types';
import { TARGET_FIELDS } from './types';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface PreviewStepProps {
  columns: string[];
  previewRows: string[][];
  mappings: ColumnMapping[];
  totalRows: number;
  /** TC-09: called when user clicks "确认导入" — parent triggers POST /testcases/import */
  onConfirm: () => void;
  onBack: () => void;
  isImporting: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PreviewStep({
  columns,
  previewRows,
  mappings,
  totalRows,
  onConfirm,
  onBack,
  isImporting,
}: PreviewStepProps) {
  /* Only show columns that are mapped */
  const visibleCols = columns
    .map((col, i) => ({ col, target: mappings[i]?.target }))
    .filter((c) => c.target);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-sy-text-2">
          共 <span className="font-mono font-semibold text-sy-text">{totalRows}</span>{' '}
          条数据，下方显示前{' '}
          <span className="font-mono font-semibold text-sy-text">{previewRows.length}</span> 条预览
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-sy-border">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-sy-border bg-sy-bg-2">
              <th className="px-3 py-2 text-left font-mono font-medium text-sy-text-3">#</th>
              {visibleCols.map(({ col, target }) => (
                <th key={col} className="px-3 py-2 text-left font-medium text-sy-text-2">
                  <div>{col}</div>
                  <div className="font-mono text-[10px] text-sy-accent">
                    → {TARGET_FIELDS.find((f) => f.value === target)?.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, ri) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: preview rows are stable
              <tr key={ri} className="border-b border-sy-border last:border-0 hover:bg-sy-bg-2/50">
                <td className="px-3 py-2 font-mono text-sy-text-3">{ri + 1}</td>
                {visibleCols.map(({ col }) => {
                  const colIdx = columns.indexOf(col);
                  return (
                    <td key={col} className="max-w-[180px] truncate px-3 py-2 text-sy-text">
                      {row[colIdx] ?? ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TC-09: Confirm action — parent handles actual API call */}
      <div className="mt-2 flex items-center justify-between rounded-lg border border-sy-accent/25 bg-sy-accent/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-sy-accent" />
          <p className="text-[12.5px] text-sy-accent">数据预览确认后开始检测重复并导入</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={isImporting}
            className="flex items-center gap-1.5 rounded-lg border border-sy-border px-3 py-1.5 text-[12px] text-sy-text-2 transition-colors hover:border-sy-border-2 hover:text-sy-text disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回修改
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isImporting}
            className="flex items-center gap-1.5 rounded-lg bg-sy-accent px-4 py-1.5 text-[12px] font-medium text-sy-bg transition-colors hover:bg-sy-accent-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isImporting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            确认导入
          </button>
        </div>
      </div>
    </div>
  );
}
