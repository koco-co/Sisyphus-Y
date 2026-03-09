type PillVariant = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray';

const variantStyles: Record<PillVariant, string> = {
  green:
    'bg-[rgba(0,217,163,0.12)] text-accent border border-[rgba(0,217,163,0.25)]',
  amber:
    'bg-[rgba(245,158,11,0.1)] text-amber border border-[rgba(245,158,11,0.25)]',
  red: 'bg-[rgba(244,63,94,0.1)] text-red border border-[rgba(244,63,94,0.25)]',
  blue: 'bg-[rgba(59,130,246,0.1)] text-blue border border-[rgba(59,130,246,0.25)]',
  purple:
    'bg-[rgba(168,85,247,0.1)] text-purple border border-[rgba(168,85,247,0.25)]',
  gray: 'bg-bg3 text-text3 border border-border',
};

interface StatusPillProps {
  variant: PillVariant;
  children: React.ReactNode;
}

export function StatusPill({ variant, children }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium font-mono ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}
