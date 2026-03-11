'use client';

import { ChevronDown, ChevronRight, Folder, FolderOpen, Inbox, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface FolderNode {
  path: string;
  name: string;
  count: number;
  children: FolderNode[];
}

interface FolderTreeProps {
  selectedPath: string | null;
  totalCount: number;
  onSelect: (path: string | null) => void;
  refreshKey?: number;
}

function FolderItem({
  node,
  selectedPath,
  onSelect,
  depth,
}: {
  node: FolderNode;
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isSelected = selectedPath === node.path;
  const hasChildren = node.children.length > 0;
  const isUncategorized = node.path === '__uncategorized__';

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          onSelect(isSelected ? null : node.path);
          if (hasChildren) setExpanded((v) => !v);
        }}
        className={`group w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-all
          ${isSelected ? 'bg-sy-accent/10 text-sy-accent' : 'text-sy-text-2 hover:bg-sy-bg-2 hover:text-sy-text'}
        `}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="shrink-0 text-sy-text-3 group-hover:text-sy-text-2 p-0 bg-transparent border-0"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}

        {isUncategorized ? (
          <Inbox
            className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-sy-accent' : 'text-sy-text-3'}`}
          />
        ) : expanded && hasChildren ? (
          <FolderOpen
            className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-sy-accent' : 'text-sy-warn/70'}`}
          />
        ) : (
          <Folder
            className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-sy-accent' : 'text-sy-warn/70'}`}
          />
        )}

        <span className="flex-1 text-[12.5px] truncate">{node.name}</span>
        <span
          className={`font-mono text-[10.5px] shrink-0 ${
            isSelected ? 'text-sy-accent' : 'text-sy-text-3'
          }`}
        >
          {node.count}
        </span>
      </button>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <FolderItem
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({ selectedPath, totalCount, onSelect, refreshKey }: FolderTreeProps) {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFolders = () => {
    setLoading(true);
    api
      .get<FolderNode[]>('/testcases/module-paths')
      .then((data) => setFolders(Array.isArray(data) ? data : []))
      .catch(() => setFolders([]))
      .finally(() => setLoading(false));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchFolders intentionally runs once on mount
  useEffect(() => {
    fetchFolders();
  }, []);

  // 当 refreshKey 改变时重新获取目录
  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchFolders is stable
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      fetchFolders();
    }
  }, [refreshKey]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-sy-border">
        <span className="text-[11.5px] font-semibold text-sy-text-3 uppercase tracking-wider">
          目录
        </span>
        <button
          type="button"
          onClick={fetchFolders}
          disabled={loading}
          className="p-0.5 rounded text-sy-text-3 hover:text-sy-text disabled:opacity-40 transition-colors"
          title="刷新目录"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1.5 px-1.5">
        {/* 全部用例 */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-all mb-0.5
            ${selectedPath === null ? 'bg-sy-accent/10 text-sy-accent' : 'text-sy-text-2 hover:bg-sy-bg-2 hover:text-sy-text'}
          `}
        >
          <span className="w-3 shrink-0" />
          <Folder
            className={`w-3.5 h-3.5 shrink-0 ${selectedPath === null ? 'text-sy-accent' : 'text-sy-text-3'}`}
          />
          <span className="flex-1 text-[12.5px]">全部用例</span>
          <span
            className={`font-mono text-[10.5px] shrink-0 ${selectedPath === null ? 'text-sy-accent' : 'text-sy-text-3'}`}
          >
            {totalCount}
          </span>
        </button>

        {/* 目录树 */}
        {loading ? (
          <div className="px-3 py-4 text-[11.5px] text-sy-text-3">加载目录...</div>
        ) : folders.length === 0 ? (
          <div className="px-3 py-4 text-[11.5px] text-sy-text-3">暂无目录数据</div>
        ) : (
          folders.map((folder) => (
            <FolderItem
              key={folder.path}
              node={folder}
              selectedPath={selectedPath}
              onSelect={onSelect}
              depth={0}
            />
          ))
        )}
      </div>
    </div>
  );
}
