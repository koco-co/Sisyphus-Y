'use client';

import { DragOverlay as DndDragOverlay, useDroppable } from '@dnd-kit/core';
import { FileText, FolderOpen } from 'lucide-react';
import type { Folder, Requirement } from '@/lib/api';
import { cn } from '@/lib/utils';

interface DragOverlayProps {
  activeItem: { type: 'folder' | 'requirement'; data: Folder | Requirement } | null;
}

export function DragOverlay({ activeItem }: DragOverlayProps) {
  if (!activeItem) return null;

  const { type, data } = activeItem;

  return (
    <DndDragOverlay>
      <div
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md shadow-lg',
          'bg-sy-bg-1 border border-sy-accent',
        )}
      >
        {type === 'folder' ? (
          <>
            <FolderOpen className="w-3.5 h-3.5 text-sy-accent" />
            <span className="text-[12px] text-sy-text font-medium">{(data as Folder).name}</span>
          </>
        ) : (
          <>
            <FileText className="w-3.5 h-3.5 text-sy-text-2" />
            <span className="text-[12px] text-sy-text font-medium">
              {(data as Requirement).title}
            </span>
          </>
        )}
      </div>
    </DndDragOverlay>
  );
}

// 拖拽时的放置指示器
interface DropLineIndicatorProps {
  visible: boolean;
  position: 'before' | 'after' | 'inside';
}

export function DropLineIndicator({ visible, position }: DropLineIndicatorProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'absolute left-0 right-0 pointer-events-none z-50',
        position === 'inside' ? 'inset-0 border-2 border-sy-accent rounded' : 'h-0.5 bg-sy-accent',
        position === 'before' && 'top-0',
        position === 'after' && 'bottom-0',
      )}
    />
  );
}

// 可放置区域包装器
interface DroppableWrapperProps {
  id: string;
  type: 'folder' | 'root';
  children: React.ReactNode;
  className?: string;
}

export function DroppableWrapper({ id, type, children, className }: DroppableWrapperProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { type },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative transition-colors',
        isOver && type === 'folder' && 'bg-sy-accent/10',
        className,
      )}
    >
      {children}
      {isOver && type === 'root' && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-sy-accent" />
      )}
    </div>
  );
}
