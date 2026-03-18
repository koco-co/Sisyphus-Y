'use client';

import { CheckSquare, Download, RefreshCw, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface BatchActionsProps {
  selectedCount: number;
  onStatusChange: (status: string) => void;
  onExport: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'review', label: '待审' },
  { value: 'approved', label: '通过' },
  { value: 'rejected', label: '驳回' },
  { value: 'deprecated', label: '废弃' },
];

export function BatchActions({
  selectedCount,
  onStatusChange,
  onExport,
  onDelete,
  onClearSelection,
}: BatchActionsProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 mb-3 rounded-lg bg-sy-accent/6 border border-sy-accent/20 text-[12.5px]">
      <div className="flex items-center gap-1.5 text-sy-accent font-medium">
        <CheckSquare className="w-3.5 h-3.5" />
        <span>已选 {selectedCount} 项</span>
      </div>

      <div className="h-4 w-px bg-border" />

      {/* Status change */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowStatusMenu(!showStatusMenu)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-text2 hover:text-text hover:bg-bg2 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          修改状态
        </button>
        {showStatusMenu && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10"
              onClick={() => setShowStatusMenu(false)}
              aria-label="关闭状态菜单"
            />
            <div className="absolute left-0 top-full mt-1 z-20 bg-bg1 border border-border rounded-lg shadow-[var(--shadow-lg)] py-1 min-w-[120px]">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onStatusChange(opt.value);
                    setShowStatusMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[12px] text-text2 hover:bg-bg2 hover:text-text transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Export */}
      <button
        type="button"
        onClick={onExport}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-text2 hover:text-text hover:bg-bg2 transition-colors"
      >
        <Download className="w-3 h-3" />
        导出
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sy-danger hover:bg-sy-danger/10 transition-colors"
      >
        <Trash2 className="w-3 h-3" />
        删除
      </button>

      <div className="flex-1" />

      {/* Clear */}
      <button
        type="button"
        onClick={onClearSelection}
        className="flex items-center gap-1 text-text3 hover:text-text2 transition-colors"
      >
        <X className="w-3 h-3" />
        取消选择
      </button>
    </div>
  );
}
