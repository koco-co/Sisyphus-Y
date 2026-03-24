'use client';

import { ChevronDown, ChevronRight, Folder as FolderIcon, FolderOpen, Plus } from 'lucide-react';
import { useState } from 'react';
import { ContextMenu, useContextMenu } from '@/components/ui/ContextMenu';
import type { Folder } from '@/lib/api';

interface FolderItemProps {
  folder: Folder;
  level: number;
  expanded: boolean;
  onToggle: () => void;
  onCreateChild: (parentId: string) => void;
  onRename: (folderId: string, currentName: string) => void;
  onDelete: (folderId: string) => void;
  children?: React.ReactNode;
}

export function FolderItem({
  folder,
  level,
  expanded,
  onToggle,
  onCreateChild,
  onRename,
  onDelete,
  children,
}: FolderItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();

  const indentStyle = { paddingLeft: `${24 + level * 12}px` };
  const canCreateChild = !folder.is_system && folder.level < 5;

  const contextMenuItems = [
    {
      label: '新建子文件夹',
      onClick: () => onCreateChild(folder.id),
      disabled: !canCreateChild,
    },
    {
      label: '重命名',
      onClick: () => onRename(folder.id, folder.name),
      disabled: folder.is_system,
    },
    {
      label: '删除文件夹',
      onClick: () => onDelete(folder.id),
      disabled: folder.is_system,
      danger: true,
    },
  ];

  return (
    <>
      <div
        className="flex items-center gap-1.5 py-1.5 cursor-pointer hover:bg-sy-bg-2 transition-colors group"
        style={indentStyle}
        onClick={onToggle}
        onContextMenu={showContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-sy-text-3 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-sy-text-3 flex-shrink-0" />
        )}
        {expanded ? (
          <FolderOpen
            className={`w-3.5 h-3.5 flex-shrink-0 ${folder.is_system ? 'text-sy-text-3' : 'text-sy-accent'}`}
          />
        ) : (
          <FolderIcon
            className={`w-3.5 h-3.5 flex-shrink-0 ${folder.is_system ? 'text-sy-text-3' : 'text-sy-accent'}`}
          />
        )}
        <span
          className={`flex-1 truncate text-[12px] ${folder.is_system ? 'text-sy-text-3 italic' : 'text-sy-text-2'}`}
        >
          {folder.name}
        </span>
        {folder.requirement_count > 0 && (
          <span className="text-[10px] text-sy-text-3 font-mono">{folder.requirement_count}</span>
        )}
        {isHovered && canCreateChild && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCreateChild(folder.id);
            }}
            className="p-0.5 text-sy-text-3 hover:text-sy-accent transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
      {expanded && children}
      {contextMenu.visible && (
        <ContextMenu
          items={contextMenuItems}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={hideContextMenu}
        />
      )}
    </>
  );
}
