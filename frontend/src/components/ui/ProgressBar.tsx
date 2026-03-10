interface ProgressBarProps {
  value: number;
  variant?: 'accent' | 'amber' | 'red';
  height?: number;
}

export function ProgressBar({ value, variant = 'accent', height = 3 }: ProgressBarProps) {
  const colorMap = { accent: 'bg-accent', amber: 'bg-amber', red: 'bg-red' };
  return (
    <div className="bg-bg3 rounded-sm overflow-hidden" style={{ height }}>
      <div
        className={`h-full rounded-sm transition-all ${colorMap[variant]}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
