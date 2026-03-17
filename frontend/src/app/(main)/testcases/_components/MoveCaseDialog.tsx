'use client';

import { Folder, FolderOpen, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { FolderNode } from './FolderTree';

interface MoveCaseDialogProps {
  open: boolean;
  caseIds: string[];
  folders: FolderNode[];
  currentFolderId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FolderOptionProps {
  node: FolderNode;
  depth: number;
  selectedId: string | null;
  excludeId: string | null;
  onSelect: (id: string) => void;
}

function FolderOption({ node, depth, selectedId, excludeId, onSelect }: FolderOptionProps) {
  const isExcluded = node.id === excludeId;
  const isSelected = selectedId === node.id;
  const disabled = isExcluded;

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onSelect(node.id)}
        className={`
          w-full flex items-center gap-1.5 py-1.5 rounded-md text-left text-[12.5px] transition-all
          ${isSelected ? 'bg-sy-accent/15 text-sy-accent' : ''}
          ${
            disabled
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:bg-sy-bg-3 text-sy-text-2 hover:text-sy-text cursor-pointer'
          }
        `}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {isSelected ? (
          <FolderOpen className="w-3.5 h-3.5 shrink-0 text-sy-accent" />
        ) : (
          <Folder className="w-3.5 h-3.5 shrink-0 text-sy-warn/70" />
        )}
        <span className="truncate">{node.name}</span>
        {node.is_system && (
          <span className="ml-auto text-[10.5px] text-sy-text-3 shrink-0 pr-1">未分类</span>
        )}
      </button>
      {node.children.map((child) => (
        <FolderOption
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          excludeId={excludeId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function MoveCaseDialog({
  open,
  caseIds,
  folders,
  currentFolderId,
  onClose,
  onSuccess,
}: MoveCaseDialogProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    if (!selectedTargetId || caseIds.length === 0) return;
    setLoading(true);
    try {
      await api.post('/testcases/folders/move-cases', {
        case_ids: caseIds,
        target_folder_id: selectedTargetId,
      });
      toast.success(`已移动 ${caseIds.length} 条用例`);
      onSuccess();
      onClose();
    } catch {
      toast.error('移动失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const canConfirm = selectedTargetId !== null && selectedTargetId !== currentFolderId;

  return (
    /* biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay pattern */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-sy-bg-1 border border-sy-border rounded-[10px] p-5 max-w-sm w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-[14px] font-semibold text-sy-text mb-1">移动用例</h3>
        <p className="text-[12px] text-sy-text-2 mb-3">
          将 <span className="text-sy-warn font-semibold">{caseIds.length}</span> 条用例移动到：
        </p>

        <div className="h-[240px] overflow-y-auto border border-sy-border rounded-md bg-sy-bg-2 p-1 mb-4">
          {folders.map((node) => (
            <FolderOption
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedTargetId}
              excludeId={currentFolderId}
              onSelect={setSelectedTargetId}
            />
          ))}
          {folders.length === 0 && (
            <p className="text-[12px] text-sy-text-3 px-3 py-4">暂无可选目录</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-[12.5px] text-sy-text-2 border border-sy-border rounded-md hover:bg-sy-bg-2 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!canConfirm || loading}
            onClick={handleConfirm}
            className="px-3 py-1.5 text-[12.5px] text-sy-bg bg-sy-accent hover:bg-sy-accent-2 rounded-md disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loading ? '移动中...' : '确认移动'}
          </button>
        </div>
      </div>
    </div>
  );
}
