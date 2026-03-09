'use client';

interface StatusBadgeProps {
  variant: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'gray';
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<StatusBadgeProps['variant'], string> = {
  success: 'bg-accent/12 text-accent border border-accent/25',
  warning: 'bg-amber/10 text-amber border border-amber/25',
  danger: 'bg-red/10 text-red border border-red/25',
  info: 'bg-blue/10 text-blue border border-blue/25',
  purple: 'bg-purple/10 text-purple border border-purple/25',
  gray: 'bg-bg3 text-text3 border border-border',
};

export function StatusBadge({ variant, children, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
