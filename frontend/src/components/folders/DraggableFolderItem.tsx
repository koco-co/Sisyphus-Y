'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

import { FolderItem } from './FolderItem';
import type { Folder } from '@/lib/api';
import type { DragItemData } from '@/hooks/useFolderDnd';

interface DraggableFolderItemProps {
  folder: Folder;
  level: number;
  expanded: boolean;
  isDragging?: boolean;
  onToggle: () => void;
  onCreateChild: (parentId: string) => void;
  onRename: (folderId: string, currentName: string) => void;
  onDelete: (folderId: string) => void;
  children?: React.ReactNode;
}

export function DraggableFolderItem({
  folder,
  level,
  expanded,
  isDragging: externalDragging,
  onToggle,
  onCreateChild,
  onRename,
  onDelete,
  children,
}: DraggableFolderItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: folder.id,
    data: {
      id: folder.id,
      type: 'folder',
      parentId: folder.parent_id,
    } satisfies DragItemData,
    disabled: folder.is_system, // 系统文件夹不可拖拽
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const indentStyle = { paddingLeft: `${12 + level * 12}px` };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* 拖拽手柄 */}
      {!folder.is_system && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          style={indentStyle}
        >
          <GripVertical className="w-3 h-3 text-sy-text-3" />
        </div>
      )}

      <FolderItem
        folder={folder}
        level={level}
        expanded={expanded}
        onToggle={onToggle}
        onCreateChild={onCreateChild}
        onRename={onRename}
        onDelete={onDelete}
      >
        {children}
      </FolderItem>

      {/* 拖拽时的指示线 */}
      {isDragging && (
        <div className="absolute left-0 right-0 top-0 h-0.5 bg-sy-accent" />
      )}
    </div>
  );
}
