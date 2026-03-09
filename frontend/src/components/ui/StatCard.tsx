interface StatCardProps {
  value: string | number;
  label: string;
  delta?: string;
  deltaColor?: string;
  progress?: number;
  highlighted?: boolean;
}

export function StatCard({
  value,
  label,
  delta,
  deltaColor = 'text-accent',
  progress,
  highlighted,
}: StatCardProps) {
  return (
    <div
      className={`bg-bg1 border border-border rounded-[10px] p-4 ${highlighted ? 'border-[rgba(0,217,163,0.25)] bg-[rgba(0,217,163,0.04)]' : ''}`}
    >
      <div
        className={`font-mono text-[26px] font-semibold leading-none ${highlighted ? 'text-accent' : 'text-text'}`}
      >
        {value}
      </div>
      <div className="text-[11.5px] text-text3 mt-1">{label}</div>
      {delta && (
        <div className={`font-mono text-[11px] mt-2 ${deltaColor}`}>
          {delta}
        </div>
      )}
      {progress !== undefined && (
        <div className="h-[3px] bg-bg3 rounded-sm overflow-hidden mt-1.5">
          <div
            className="h-full bg-accent rounded-sm"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
