'use client';

import { ChevronRight, GitCompare, History, Loader2, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui';

interface VersionItem {
  id: string;
  version: number;
  change_summary: string | null;
  created_at: string;
}

interface VersionHistoryProps {
  versions: VersionItem[];
  currentVersion: number;
  loading?: boolean;
  onRollback?: (versionId: string, version: number) => Promise<void>;
  onCompare?: (versionId: string) => void;
}

export function VersionHistory({
  versions,
  currentVersion,
  loading = false,
  onRollback,
  onCompare,
}: VersionHistoryProps) {
  const [rollbackTarget, setRollbackTarget] = useState<{ id: string; version: number } | null>(
    null,
  );
  const [rolling, setRolling] = useState(false);

  const handleRollback = async () => {
    if (!rollbackTarget || !onRollback) return;
    setRolling(true);
    try {
      await onRollback(rollbackTarget.id, rollbackTarget.version);
    } finally {
      setRolling(false);
      setRollbackTarget(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="bg-bg1 border border-border rounded-[10px] p-4">
      <div className="flex items-center gap-2 mb-3">
        <History size={14} className="text-accent" />
        <span className="text-[12px] font-semibold text-text2">版本历史</span>
        <span className="text-[10px] font-mono text-text3 ml-auto">当前 v{currentVersion}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={16} className="text-text3 animate-spin" />
        </div>
      ) : versions.length === 0 ? (
        <div className="text-center py-6 text-text3 text-[12px]">暂无历史版本</div>
      ) : (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {versions.map((v) => (
            <div
              key={v.id}
              className="group flex items-center gap-2.5 p-2 rounded-md hover:bg-bg2 transition-colors"
            >
              {/* Version marker */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-accent/50" />
                <div className="w-px h-full bg-border" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-mono font-semibold text-accent">
                    v{v.version}
                  </span>
                  <span className="text-[10.5px] text-text3 font-mono">
                    {formatDate(v.created_at)}
                  </span>
                </div>
                <p className="text-[11.5px] text-text3 truncate mt-0.5">
                  {v.change_summary ?? '版本快照'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {onCompare && (
                  <button
                    type="button"
                    onClick={() => onCompare(v.id)}
                    title="版本对比"
                    className="p-1 rounded text-text3 hover:text-blue hover:bg-blue/10 transition-colors"
                  >
                    <GitCompare size={13} />
                  </button>
                )}
                {onRollback && (
                  <button
                    type="button"
                    onClick={() => setRollbackTarget({ id: v.id, version: v.version })}
                    title="回滚到此版本"
                    className="p-1 rounded text-text3 hover:text-amber hover:bg-amber/10 transition-colors"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
                <ChevronRight size={13} className="text-text3" />
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!rollbackTarget}
        onCancel={() => setRollbackTarget(null)}
        onConfirm={handleRollback}
        title="确认回滚"
        description={
          rollbackTarget ? `将回滚到版本 v${rollbackTarget.version}，当前版本将被保存为快照。` : ''
        }
        confirmText={rolling ? '回滚中...' : '确认回滚'}
        variant="warning"
      />
    </div>
  );
}
