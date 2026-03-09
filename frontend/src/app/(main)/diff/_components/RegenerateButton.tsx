'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface RegenerateButtonProps {
  onRegenerate: () => Promise<unknown>;
  regenerating: boolean;
  progress: number;
  affectedCount: number;
  className?: string;
}

export function RegenerateButton({
  onRegenerate,
  regenerating,
  progress,
  affectedCount,
  className = '',
}: RegenerateButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirm = async () => {
    setConfirmOpen(false);
    await onRegenerate();
  };

  return (
    <div className={className}>
      <button
        type="button"
        disabled={regenerating || affectedCount === 0}
        onClick={() => setConfirmOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12.5px] font-semibold transition-colors bg-accent text-white dark:text-black hover:bg-accent2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {regenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            重新生成中...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            一键重新生成 ({affectedCount})
          </>
        )}
      </button>

      {regenerating && (
        <div className="mt-2 space-y-1">
          <ProgressBar value={progress} variant="accent" />
          <p className="text-[10px] text-text3 text-center font-mono">
            {progress}%
          </p>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        title="确认重新生成"
        description={`将对 ${affectedCount} 个受影响用例执行重新生成。原用例会被自动快照保存，此操作可能耗时较长。`}
        confirmText="开始生成"
        cancelText="取消"
        variant="warning"
      />
    </div>
  );
}
