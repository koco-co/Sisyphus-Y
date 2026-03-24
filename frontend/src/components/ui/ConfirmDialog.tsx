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
  variant?: 'danger' | 'warning' | 'default' | 'simple' | 'cascade';
  impactCount?: number;
  itemName?: string;
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title = '确认操作',
  description: descriptionProp,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
  impactCount = 0,
  itemName = '',
}: ConfirmDialogProps) {
  // Generate description based on variant
  let description = descriptionProp;
  if (!descriptionProp) {
    if (variant === 'simple') {
      description = itemName
        ? `确定删除「${itemName}」？删除后可在回收站中找回。`
        : '确定删除？删除后可在回收站中找回。';
    } else if (variant === 'cascade') {
      description = itemName
        ? `确定删除「${itemName}」？将同时删除 ${impactCount} 条关联用例。此操作不可撤销。`
        : `确定删除？将同时删除 ${impactCount} 条关联用例。此操作不可撤销。`;
    } else {
      description = '此操作不可撤销，确认继续？';
    }
  }
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  if (!open) return null;

  const confirmClass =
    variant === 'danger' || variant === 'cascade'
      ? 'bg-sy-danger text-white hover:bg-sy-danger/90'
      : variant === 'warning'
        ? 'bg-sy-warn text-white hover:bg-sy-warn/90'
        : 'bg-sy-accent text-white hover:bg-sy-accent-2';

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-[420px] rounded-xl border border-border bg-bg1 p-0 shadow-xl backdrop:backdrop-blur-sm backdrop:bg-black/40"
      onClose={onCancel}
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          {variant !== 'default' && variant !== 'simple' && (
            <AlertTriangle
              className={`w-5 h-5 shrink-0 mt-0.5 ${variant === 'danger' || variant === 'cascade' ? 'text-sy-danger' : 'text-sy-warn'}`}
            />
          )}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-text">{title}</h3>
            <p className="text-[12.5px] text-text3 mt-1">{description}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-text3 hover:text-text2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[12.5px] font-medium border border-border bg-bg2 text-text2 hover:bg-bg3 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-[12.5px] font-medium transition-colors ${confirmClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </dialog>
  );
}
