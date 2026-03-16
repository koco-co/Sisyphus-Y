'use client';

import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import type { DuplicateInfo, DuplicateStrategyType } from './types';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface DuplicateStepProps {
  checking: boolean;
  duplicates: DuplicateInfo[];
  perCaseStrategies: Record<number, DuplicateStrategyType>;
  onStrategyChange: (index: number, strategy: DuplicateStrategyType) => void;
  /** TC-10: bulk set all to a strategy */
  onBulkStrategy: (strategy: DuplicateStrategyType) => void;
}

/* ------------------------------------------------------------------ */
/*  Strategy labels                                                    */
/* ------------------------------------------------------------------ */

const STRATEGY_LABELS: Record<DuplicateStrategyType, string> = {
  overwrite: '覆盖',
  skip: '跳过',
  rename: '重命名',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DuplicateStep({
  checking,
  duplicates,
  perCaseStrategies,
  onStrategyChange,
  onBulkStrategy,
}: DuplicateStepProps) {
  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-sy-accent" />
        <p className="text-[12.5px] text-sy-text-2">正在检测重复用例…</p>
      </div>
    );
  }

  if (duplicates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sy-accent/10">
          <Check className="h-6 w-6 text-sy-accent" />
        </div>
        <p className="text-[13px] font-medium text-sy-text">未发现重复用例</p>
        <p className="text-[12px] text-sy-text-3">所有用例均为新增，可直接导入</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-sy-warn/30 bg-sy-warn/5 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-sy-warn" />
            <p className="text-[12.5px] text-sy-warn">
              发现 <span className="font-semibold">{duplicates.length}</span>{' '}
              条重复用例，请为每条选择处理策略
            </p>
          </div>
          {/* TC-10: Bulk actions */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-sy-text-3">批量：</span>
            {(['overwrite', 'skip', 'rename'] as DuplicateStrategyType[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onBulkStrategy(s)}
                className="rounded-md border border-sy-border px-2.5 py-1 text-[11px] text-sy-text-3 transition-colors hover:border-sy-border-2 hover:text-sy-text-2"
              >
                全部{STRATEGY_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {duplicates.map((dup) => {
          const strategy = perCaseStrategies[dup.index];
          return (
            <div
              key={dup.index}
              className="rounded-lg border border-sy-border bg-sy-bg-2 px-4 py-3"
            >
              <div className="mb-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-sy-text">{dup.title}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-sy-text-3">
                    已存在 ID: {dup.existing_case_id}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-sy-warn/10 px-2 py-0.5 font-mono text-[10px] text-sy-warn">
                  第 {dup.index + 1} 行
                </span>
              </div>
              <div className="flex items-center gap-2">
                {(['overwrite', 'skip', 'rename'] as DuplicateStrategyType[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onStrategyChange(dup.index, s)}
                    className={[
                      'rounded-md px-3 py-1 text-[11.5px] font-medium transition-colors',
                      strategy === s
                        ? s === 'overwrite'
                          ? 'bg-sy-danger/15 text-sy-danger ring-1 ring-sy-danger/40'
                          : s === 'rename'
                            ? 'bg-sy-accent/15 text-sy-accent ring-1 ring-sy-accent/40'
                            : 'bg-sy-bg-3 text-sy-text ring-1 ring-sy-border-2'
                        : 'bg-sy-bg-3 text-sy-text-3 hover:text-sy-text-2',
                    ].join(' ')}
                  >
                    {STRATEGY_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
