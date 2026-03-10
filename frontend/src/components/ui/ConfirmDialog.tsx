'use client';

import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title = '确认操作',
  description = '此操作不可撤销，确认继续？',
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  if (!open) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-red text-white hover:bg-red/90'
      : variant === 'warning'
        ? 'bg-amber text-white hover:bg-amber/90'
        : 'bg-accent text-white hover:bg-accent2';

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-[400px] rounded-lg border border-border bg-bg1 p-0 shadow-lg backdrop:bg-black/50"
      onClose={onCancel}
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          {variant !== 'default' && (
            <AlertTriangle
              className={`w-5 h-5 shrink-0 mt-0.5 ${variant === 'danger' ? 'text-red' : 'text-amber'}`}
            />
          )}
          <div className="flex-1">
            <h3 className="text-[14px] font-semibold text-text">{title}</h3>
            <p className="text-[12.5px] text-text2 mt-1">{description}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-text3 hover:text-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-[12.5px] font-medium border border-border bg-bg2 text-text2 hover:bg-bg3 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-colors ${confirmClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </dialog>
  );
}
