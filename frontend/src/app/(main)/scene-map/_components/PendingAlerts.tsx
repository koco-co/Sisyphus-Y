'use client';

import {
  AlertOctagon,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Edit3,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { TestPointItem } from '@/stores/scene-map-store';

interface PendingAlertsProps {
  testPoints: TestPointItem[];
  isLocked: boolean;
  onConfirm: (id: string) => void;
  onIgnore: (id: string) => void;
  onSelect: (id: string) => void;
  onBatchConfirm?: () => Promise<void>;
}

export function PendingAlerts({
  testPoints,
  isLocked,
  onConfirm,
  onIgnore,
  onSelect,
  onBatchConfirm,
}: PendingAlertsProps) {
  const [expanded, setExpanded] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const missingPoints = testPoints.filter(
    (p) => p.source === 'missing' && p.status !== 'confirmed' && p.status !== 'ignored',
  );

  if (missingPoints.length === 0) return null;

  const handleBatchConfirm = async () => {
    setDialogOpen(false);
    if (!onBatchConfirm) return;
    setBatchLoading(true);
    try {
      await onBatchConfirm();
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <>
      <div className="mx-4 mt-3 rounded-lg border border-sy-danger/30 bg-sy-danger/5 overflow-hidden">
        <div className="flex items-center gap-2.5 w-full px-4 py-2.5">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2.5 flex-1 text-left"
          >
            <AlertOctagon size={14} className="text-sy-danger shrink-0" />
            <span className="flex-1 text-[12.5px] font-semibold text-sy-danger">
              {missingPoints.length} 个缺失测试点需要处理
            </span>
            {expanded ? (
              <ChevronUp size={14} className="text-sy-danger" />
            ) : (
              <ChevronDown size={14} className="text-sy-danger" />
            )}
          </button>

          {!isLocked && onBatchConfirm && (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              disabled={batchLoading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-sy-accent/10 border border-sy-accent/25 text-sy-accent hover:bg-sy-accent/20 transition-colors disabled:opacity-50"
            >
              {batchLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <CheckCheck size={12} />
              )}
              批量确认 ({missingPoints.length})
            </button>
          )}
        </div>

        {expanded && (
          <div className="px-4 pb-3 space-y-1.5">
            {missingPoints.map((tp) => (
              <div
                key={tp.id}
                className="flex items-center gap-2 p-2.5 rounded-md bg-sy-bg-1/60 border border-sy-danger/15"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-sy-danger shrink-0" />
                <span className="flex-1 text-[12px] text-sy-text truncate">{tp.title}</span>
                {!isLocked && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onConfirm(tp.id)}
                      className="p-1 rounded text-sy-accent hover:bg-sy-accent/10 transition-colors"
                      title="确认"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onIgnore(tp.id)}
                      className="p-1 rounded text-sy-text-3 hover:bg-sy-bg-3 transition-colors"
                      title="忽略"
                    >
                      <EyeOff size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelect(tp.id)}
                      className="p-1 rounded text-sy-info hover:bg-sy-info/10 transition-colors"
                      title="编辑"
                    >
                      <Edit3 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={dialogOpen}
        onConfirm={handleBatchConfirm}
        onCancel={() => setDialogOpen(false)}
        title="批量确认缺失测试点"
        description={`确定将 ${missingPoints.length} 个缺失测试点全部标记为已确认？确认后这些测试点将纳入用例生成范围。`}
        confirmText={`确认全部 (${missingPoints.length})`}
        variant="warning"
      />
    </>
  );
}
