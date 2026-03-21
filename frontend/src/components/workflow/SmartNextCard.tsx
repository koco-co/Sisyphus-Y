'use client';
import { ArrowRight, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface SmartNextCardProps {
  /** show=true 后延迟 500ms 显示 */
  show: boolean;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  onClose?: () => void;
}

/**
 * AI 任务完成后浮出的引导卡片。
 * 在 show=true 后 500ms 延迟显示，用户点击 CTA 或关闭后隐藏。
 */
export function SmartNextCard({
  show,
  title,
  description,
  ctaLabel,
  ctaHref,
  onClose,
}: SmartNextCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, [show]);

  if (!visible) return null;

  return (
    <div className="mt-4 rounded-xl border border-sy-accent/30 bg-sy-accent/5 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-[13px] font-medium text-sy-text">{title}</p>
          <p className="mt-0.5 text-[12px] text-sy-text-2">{description}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={() => {
              setVisible(false);
              onClose();
            }}
            className="text-sy-text-3 hover:text-sy-text-2 transition-colors mt-0.5 flex-shrink-0"
            aria-label="关闭引导"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="mt-3">
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-sy-accent hover:text-sy-accent-2 transition-colors"
        >
          {ctaLabel}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
