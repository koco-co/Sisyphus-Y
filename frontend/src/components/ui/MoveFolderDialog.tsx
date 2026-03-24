'use client';

import { FolderOpen, FolderX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Folder } from '@/lib/api';

interface MoveFolderDialogProps {
  open: boolean;
  folders: Folder[];
  currentFolderId?: string | null;
  onConfirm: (folderId: string | null) => void;
  onCancel: () => void;
}

/** 将嵌套 Folder 树展平为带缩进层级的列表 */
function flattenFolders(folders: Folder[], depth = 0): { folder: Folder; depth: number }[] {
  const result: { folder: Folder; depth: number }[] = [];
  for (const folder of folders) {
    if (!folder.is_system) {
      result.push({ folder, depth });
      if (folder.children.length > 0) {
        result.push(...flattenFolders(folder.children, depth + 1));
      }
    }
  }
  return result;
}

export function MoveFolderDialog({
  open,
  folders,
  currentFolderId,
  onConfirm,
  onCancel,
}: MoveFolderDialogProps) {
  const [selected, setSelected] = useState<string | null>(currentFolderId ?? null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      setSelected(currentFolderId ?? null);
      el.showModal();
    } else {
      el.close();
    }
  }, [open, currentFolderId]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onCancel();
    };
    el.addEventListener('cancel', handleCancel);
    return () => el.removeEventListener('cancel', handleCancel);
  }, [onCancel]);

  const flat = flattenFolders(folders);

  return (
    <dialog
      ref={dialogRef}
      className="p-0 rounded-xl bg-bg1 border border-border shadow-xl backdrop:backdrop-blur-sm backdrop:bg-black/40 w-72 max-h-[70vh] outline-none"
    >
      <div className="flex flex-col max-h-[70vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-sy-border flex-shrink-0">
          <h3 className="text-[13px] font-semibold text-sy-text">移入文件夹</h3>
          <p className="text-[11px] text-sy-text-3 mt-0.5">选择目标文件夹，或移回「未分类」</p>
        </div>

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto p-2">
          {/* 未分类 option */}
          <button
            type="button"
            onClick={() => setSelected(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-colors ${
              selected === null
                ? 'bg-sy-accent/10 border border-sy-accent/40 text-sy-accent'
                : 'text-sy-text-2 hover:bg-sy-bg-2'
            }`}
          >
            <FolderX className="w-3.5 h-3.5 flex-shrink-0" />
            <span>未分类</span>
          </button>

          {flat.length === 0 && (
            <p className="text-[11px] text-sy-text-3 text-center py-4">暂无文件夹</p>
          )}

          {flat.map(({ folder, depth }) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setSelected(folder.id)}
              style={{ paddingLeft: `${12 + depth * 12}px` }}
              className={`w-full flex items-center gap-2 pr-3 py-2 rounded-lg text-[12px] transition-colors ${
                selected === folder.id
                  ? 'bg-sy-accent/10 border border-sy-accent/40 text-sy-accent'
                  : 'text-sy-text-2 hover:bg-sy-bg-2'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{folder.name}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-[12px] rounded-lg border border-border bg-bg2 text-text2 hover:bg-bg3 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="px-4 py-2 text-[12px] rounded-lg bg-accent text-bg font-medium hover:bg-accent2 transition-colors"
          >
            确认移动
          </button>
        </div>
      </div>
    </dialog>
  );
}
