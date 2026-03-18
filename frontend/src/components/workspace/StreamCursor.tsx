'use client';

export function StreamCursor({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block w-0.5 h-3.5 bg-sy-warn align-text-bottom ml-0.5 animate-[blink_0.8s_infinite] ${className}`}
      aria-hidden="true"
    />
  );
}
