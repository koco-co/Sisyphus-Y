'use client';

import {
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useCallback, useState } from 'react';

import type { Folder } from '@/lib/api';

export type DragItemData = {
  id: string;
  type: 'folder' | 'requirement' | 'root';
  parentId: string | null;
};

interface UseFolderDndOptions {
  folders: Folder[];
  onReorder: (
    items: { id: string; sort_order: number; parent_id: string | null }[],
  ) => Promise<void>;
  onMoveRequirement?: (reqId: string, folderId: string | null) => Promise<void>;
}

interface UseFolderDndReturn {
  activeId: string | null;
  overId: string | null;
  sensors: ReturnType<typeof useSensors>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
}

export function useFolderDnd({
  folders,
  onReorder,
  onMoveRequirement,
}: UseFolderDndOptions): UseFolderDndReturn {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? (over.id as string) : null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);
      setOverId(null);

      if (!over) return;

      const activeData = active.data.current as DragItemData | undefined;
      const overData = over.data.current as DragItemData | undefined;

      if (!activeData) return;

      // 文件夹排序
      if (activeData.type === 'folder' && overData?.type === 'folder') {
        const oldIndex = folders.findIndex((f) => f.id === active.id);
        const newIndex = folders.findIndex((f) => f.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const activeFolder = folders[oldIndex];
          const overFolder = folders[newIndex];

          // 只处理同父级下的排序
          if (activeFolder.parent_id === overFolder.parent_id) {
            const reordered = arrayMove(folders, oldIndex, newIndex);
            const items = reordered.map((f, index) => ({
              id: f.id,
              sort_order: index,
              parent_id: f.parent_id,
            }));

            await onReorder(items);
          } else {
            // 跨级移动
            const items = [
              {
                id: active.id as string,
                sort_order: overFolder.sort_order,
                parent_id: overFolder.parent_id,
              },
            ];
            await onReorder(items);
          }
        }
      }

      // 需求移动到文件夹
      if (activeData.type === 'requirement' && overData?.type === 'folder' && onMoveRequirement) {
        await onMoveRequirement(activeData.id, overData.id);
      }

      // 需求移出文件夹（放到根目录）
      if (activeData.type === 'requirement' && overData?.type === 'root' && onMoveRequirement) {
        await onMoveRequirement(activeData.id, null);
      }
    },
    [folders, onReorder, onMoveRequirement],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
  }, []);

  return {
    activeId,
    overId,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
