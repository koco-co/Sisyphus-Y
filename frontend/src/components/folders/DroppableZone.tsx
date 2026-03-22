'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface DroppableZoneProps {
  id: string;
  type: 'folder' | 'root';
  children?: React.ReactNode;
  className?: string;
}

export function DroppableZone({ id, type, children, className }: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      type,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-colors',
        isOver && 'bg-sy-accent/10',
        className
      )}
    >
      {children}
      {isOver && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-sy-accent pointer-events-none" />
      )}
    </div>
  );
}

// 拖拽指示线组件
interface DropIndicatorProps {
  position: 'before' | 'after' | 'inside';
  visible: boolean;
}

export function DropIndicator({ position, visible }: DropIndicatorProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'absolute left-0 right-0 h-0.5 bg-sy-accent pointer-events-none',
        position === 'before' ? 'top-0' : 'bottom-0'
      )}
    />
  );
}
