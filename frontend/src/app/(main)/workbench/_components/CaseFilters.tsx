'use client';

interface CaseFiltersProps {
  priorityFilter: string | null;
  typeFilter: string | null;
  onPriorityChange: (value: string | null) => void;
  onTypeChange: (value: string | null) => void;
}

const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const TYPES = ['功能', '异常', '边界', '性能'];

function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(value === opt ? null : opt)}
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border transition-colors ${
            value === opt
              ? 'bg-accent/12 text-accent border-accent/30'
              : 'bg-bg2 text-text3 border-border hover:border-border2 hover:text-text2'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function CaseFilters({
  priorityFilter,
  typeFilter,
  onPriorityChange,
  onTypeChange,
}: CaseFiltersProps) {
  return (
    <div className="px-3 py-2 border-b border-border space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text3 w-8 shrink-0">优先级</span>
        <ToggleGroup options={PRIORITIES} value={priorityFilter} onChange={onPriorityChange} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text3 w-8 shrink-0">类型</span>
        <ToggleGroup options={TYPES} value={typeFilter} onChange={onTypeChange} />
      </div>
    </div>
  );
}
