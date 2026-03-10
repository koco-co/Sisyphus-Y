type PillVariant = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray';

const variantStyles: Record<PillVariant, string> = {
  green: 'bg-accent/10 text-accent border border-accent/25',
  amber: 'bg-amber/10 text-amber border border-amber/25',
  red: 'bg-red/10 text-red border border-red/25',
  blue: 'bg-blue/10 text-blue border border-blue/25',
  purple: 'bg-purple/10 text-purple border border-purple/25',
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
