'use client';

import { Loader2, Tag } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface PublishVersionDialogProps {
  open: boolean;
  reqId: string;
  onClose: () => void;
  onSuccess: (versionFrom: number, versionTo: number) => void;
}

export function PublishVersionDialog({ open, reqId, onClose, onSuccess }: PublishVersionDialogProps) {
  const [versionNote, setVersionNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/requirements/${reqId}/publish-version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version_note: versionNote.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? '发布失败');
      }
      const data = (await res.json()) as { version_from: number; version_to: number };
      toast.success(`已发布 v${data.version_to}，正在后台计算 Diff`);
      onSuccess(data.version_from, data.version_to);
      setVersionNote('');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '发布失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[420px] bg-sy-bg-1 border border-sy-border rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-sy-border">
          <Tag className="w-4 h-4 text-sy-accent" />
          <span className="text-[14px] font-semibold text-sy-text">发布新版本</span>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-[12.5px] text-sy-text-2 leading-relaxed">
            发布后将保存当前需求内容快照，版本号自动递增，并在后台自动触发 Diff 分析。
          </p>
          <div>
            <label
              htmlFor="publish-version-note"
              className="block text-[11px] font-semibold text-sy-text-3 uppercase tracking-wider mb-1.5"
            >
              版本说明（可选）
            </label>
            <textarea
              id="publish-version-note"
              value={versionNote}
              onChange={(e) => setVersionNote(e.target.value)}
              placeholder="描述本次版本的主要变更..."
              rows={3}
              className="w-full px-3 py-2 bg-sy-bg-2 border border-sy-border rounded-lg text-[13px] text-sy-text placeholder:text-sy-text-3 outline-none focus:border-sy-accent transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-sy-border">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-[12.5px] font-medium text-sy-text-2 hover:text-sy-text hover:bg-sy-bg-2 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-semibold bg-sy-accent text-black hover:bg-sy-accent-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                发布中...
              </>
            ) : (
              <>
                <Tag className="w-3.5 h-3.5" />
                确认发布
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
