'use client';

import { Check, X } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { ImportResult } from './types';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ResultStepProps {
  result: ImportResult;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ResultStep({ result, onClose }: ResultStepProps) {
  /* TC-11: show toast on mount */
  useEffect(() => {
    const successCount = result.imported + result.renamed;
    toast.success(
      `成功导入 ${successCount} 条，跳过 ${result.skipped} 条，覆盖 ${result.overwritten} 条`,
    );
  }, [result]);

  const successCount = result.imported + result.renamed;

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sy-accent/10">
        <Check className="h-8 w-8 text-sy-accent" />
      </div>

      {/* Headline */}
      <div className="text-center">
        <p className="text-base font-semibold text-sy-text">导入完成</p>
        <p className="mt-1 text-[12.5px] text-sy-text-3">以下为本次导入汇总</p>
      </div>

      {/* Summary table — TC-11: in-dialog counts */}
      <div className="w-full overflow-hidden rounded-lg border border-sy-border">
        <table className="w-full text-[12.5px]">
          <tbody>
            {[
              {
                label: '成功导入',
                value: `${successCount} 条`,
                colorClass: 'text-sy-accent font-semibold',
              },
              { label: '覆盖更新', value: `${result.overwritten} 条`, colorClass: 'text-sy-text' },
              { label: '跳过', value: `${result.skipped} 条`, colorClass: 'text-sy-text-2' },
            ].map(({ label, value, colorClass }) => (
              <tr key={label} className="border-b border-sy-border last:border-0">
                <td className="w-40 bg-sy-bg-2 px-4 py-2.5 text-sy-text-2">{label}</td>
                <td className={`px-4 py-2.5 font-mono ${colorClass}`}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="flex items-center gap-2 rounded-lg bg-sy-accent px-5 py-2 text-[13px] font-medium text-sy-bg transition-colors hover:bg-sy-accent-2"
      >
        <X className="h-4 w-4" />
        关闭
      </button>
    </div>
  );
}
