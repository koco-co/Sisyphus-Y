'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface FolderDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  initialValue?: string;
  title?: string;
  loading?: boolean;
}

export function FolderDialog({
  open,
  onClose,
  onSubmit,
  initialValue = '',
  title = '新建文件夹',
  loading = false,
}: FolderDialogProps) {
  const [name, setName] = useState(initialValue);

  useEffect(() => {
    if (open) {
      setName(initialValue);
    }
  }, [open, initialValue]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-sy-bg-1 border border-sy-border rounded-lg shadow-xl w-[320px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-sy-border">
          <h3 className="text-[13px] font-semibold text-sy-text">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sy-text-3 hover:text-sy-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-4 py-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="文件夹名称"
              className="w-full px-3 py-2 bg-sy-bg-2 border border-sy-border rounded-md text-[12px] text-sy-text placeholder:text-sy-text-3 outline-none focus:border-sy-accent transition-colors"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-sy-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[12px] text-sy-text-2 hover:text-sy-text transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="px-3 py-1.5 text-[12px] font-medium bg-sy-accent text-sy-bg rounded-md hover:bg-sy-accent-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '处理中...' : '确定'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
