'use client';

import { Folder, FolderOpen, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { FolderNode } from './FolderTree';

interface MoveFolderDialogProps {
  open: boolean;
  folderId: string;
  currentParentId: string | null;
  folders: FolderNode[];
  onClose: () => void;
  onSuccess: () => void;
}

/** Collect all descendant IDs of a given node (inclusive) */
function collectDescendantIds(node: FolderNode): Set<string> {
  const ids = new Set<string>();
  const walk = (n: FolderNode) => {
    ids.add(n.id);
    for (const c of n.children) walk(c);
  };
  walk(node);
  return ids;
}

interface FolderOptionProps {
  node: FolderNode;
  depth: number;
  selectedId: string | null;
  excludeIds: Set<string>;
  onSelect: (id: string) => void;
}

function FolderOption({ node, depth, selectedId, excludeIds, onSelect }: FolderOptionProps) {
  const isExcluded = excludeIds.has(node.id);
  const isSelected = selectedId === node.id;
  const isOverDepth = node.level >= 3;
  const disabled = isExcluded || isOverDepth;

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onSelect(node.id)}
        title={isOverDepth ? '超过3层限制' : undefined}
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
          <Folder className="w-3.5 h-3.5 shrink-0 text-amber-400/70" />
        )}
        <span className="truncate">{node.name}</span>
        {isOverDepth && (
          <span className="ml-auto text-[10.5px] text-sy-text-3 shrink-0 pr-1">超限</span>
        )}
      </button>
      {node.children
        .filter((c) => !c.is_system)
        .map((child) => (
          <FolderOption
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            excludeIds={excludeIds}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

export function MoveFolderDialog({
  open,
  folderId,
  currentParentId,
  folders,
  onClose,
  onSuccess,
}: MoveFolderDialogProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const findNode = (nodes: FolderNode[], id: string): FolderNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  };
  const movingNode = findNode(folders, folderId);

  const excludeIds: Set<string> = movingNode
    ? collectDescendantIds(movingNode)
    : new Set([folderId]);

  const handleConfirm = async () => {
    if (!selectedTargetId) return;
    setLoading(true);
    try {
      await api.patch(`/testcases/folders/${folderId}`, {
        parent_id: selectedTargetId,
      });
      toast.success('目录已移动');
      onSuccess();
      onClose();
    } catch {
      toast.error('移动失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const canConfirm = selectedTargetId !== null && selectedTargetId !== currentParentId;

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
        <h3 className="text-[14px] font-semibold text-sy-text mb-1">
          移动目录：{movingNode?.name ?? ''}
        </h3>
        <p className="text-[12px] text-sy-text-2 mb-3">选择目标目录（最多 3 层）</p>

        <div className="h-[240px] overflow-y-auto border border-sy-border rounded-md bg-sy-bg-2 p-1 mb-4">
          {folders
            .filter((n) => !n.is_system)
            .map((node) => (
              <FolderOption
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedTargetId}
                excludeIds={excludeIds}
                onSelect={setSelectedTargetId}
              />
            ))}
          {folders.filter((n) => !n.is_system).length === 0 && (
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
