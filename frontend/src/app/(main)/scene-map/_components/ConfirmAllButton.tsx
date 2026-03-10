'use client';

import { AlertTriangle, CheckCircle, Loader2, Lock } from 'lucide-react';
import { useState } from 'react';

interface ConfirmAllButtonProps {
  total: number;
  confirmed: number;
  unhandledMissing: number;
  isLocked: boolean;
  onConfirmAll: () => Promise<void>;
}

export function ConfirmAllButton({
  total,
  confirmed,
  unhandledMissing,
  isLocked,
  onConfirmAll,
}: ConfirmAllButtonProps) {
  const [loading, setLoading] = useState(false);

  if (total === 0) return null;

  const allConfirmed = confirmed === total;
  const hasBlockers = unhandledMissing > 0;
  const disabled = isLocked || hasBlockers || loading;

  const handleClick = async () => {
    setLoading(true);
    try {
      await onConfirmAll();
    } finally {
      setLoading(false);
    }
  };

  if (isLocked) {
    return (
      <div className="border-t border-sy-border bg-sy-bg-1 px-4 py-3">
        <div className="flex items-center justify-center gap-2 text-[12px] text-sy-accent">
          <Lock size={14} />
          <span className="font-medium">场景地图已锁定确认</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-sy-border bg-sy-bg-1 px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Progress info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 text-[11px] text-sy-text-3">
            <span className="font-mono">
              {confirmed}/{total} 已确认
            </span>
            {hasBlockers && (
              <span className="flex items-center gap-1 text-sy-danger">
                <AlertTriangle size={10} />
                {unhandledMissing} 个缺失项未处理
              </span>
            )}
          </div>
          <div className="h-1 rounded-full bg-sy-bg-3 overflow-hidden mt-1.5">
            <div
              className="h-full bg-sy-accent rounded-full transition-all"
              style={{ width: `${total ? (confirmed / total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Button */}
        <div className="relative group">
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-[12.5px] font-semibold transition-all ${
              disabled
                ? 'bg-sy-bg-3 text-sy-text-3 cursor-not-allowed'
                : 'bg-sy-accent text-black hover:bg-sy-accent-2'
            }`}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : allConfirmed ? (
              <Lock size={14} />
            ) : (
              <CheckCircle size={14} />
            )}
            {loading
              ? '确认中...'
              : allConfirmed
                ? '锁定场景地图'
                : `确认全部 (${total - confirmed} 待确认)`}
          </button>

          {/* Tooltip for disabled state */}
          {hasBlockers && !loading && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-md bg-sy-bg-3 border border-sy-border text-[11px] text-sy-danger whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              请先处理 {unhandledMissing} 个缺失测试点
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-sy-bg-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
