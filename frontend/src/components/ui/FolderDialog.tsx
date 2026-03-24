'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40">
      <div className="bg-bg1 border border-border rounded-xl shadow-xl w-[340px]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-text3 hover:text-text2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="文件夹名称"
              className="w-full px-3 py-2 bg-bg3 border border-border rounded-lg text-[12.5px] text-text placeholder:text-text3 outline-none focus:border-accent focus:ring-0 transition-colors"
            />
          </div>
          <div className="flex justify-end gap-2 px-6 pb-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[12.5px] font-medium border border-border bg-bg2 text-text2 hover:bg-bg3 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="px-4 py-2 rounded-lg text-[12.5px] font-medium bg-accent text-bg hover:bg-accent2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '处理中...' : '确定'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
