'use client';

interface PriorityRadioGroupProps {
  value: string;
  onChange: (value: string) => void;
}

const priorities = [
  { value: 'P0', label: 'P0 最高', dotColor: 'bg-red-400' },
  { value: 'P1', label: 'P1 高', dotColor: 'bg-orange-400' },
  { value: 'P2', label: 'P2 中', dotColor: 'bg-amber-400' },
  { value: 'P3', label: 'P3 低', dotColor: 'bg-blue-400' },
];

export function PriorityRadioGroup({ value, onChange }: PriorityRadioGroupProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {priorities.map((p) => {
        const isSelected = value === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium transition-all ${
              isSelected
                ? 'border-accent bg-accent-d text-accent'
                : 'border-border2 text-text2 hover:border-border hover:bg-bg2'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${isSelected ? p.dotColor : 'bg-text3'}`}
            />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
