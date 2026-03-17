'use client';

import { AlertTriangle, ArrowRight, X } from 'lucide-react';

interface ChangeAlertProps {
  count: number;
  onNavigate: () => void;
  onDismiss: () => void;
}

export function ChangeAlert({ count, onNavigate, onDismiss }: ChangeAlertProps) {
  if (count <= 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-lg bg-sy-warn/8 border border-sy-warn/25 text-[12.5px]">
      <AlertTriangle className="w-4 h-4 shrink-0 text-sy-warn" />
      <span className="flex-1 text-sy-warn">
        有 <span className="font-mono font-semibold">{count}</span>{' '}
        个用例受需求变更影响，需要重新审视
      </span>
      <button
        type="button"
        onClick={onNavigate}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-medium text-sy-warn bg-sy-warn/15 hover:bg-sy-warn/25 transition-colors"
      >
        查看变更 <ArrowRight className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="text-sy-warn/60 hover:text-sy-warn transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
