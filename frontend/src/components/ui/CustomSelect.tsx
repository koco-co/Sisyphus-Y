'use client';

import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = '请选择',
  className = '',
  disabled = false,
  size = 'md',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, handleClickOutside]);

  const sizeClass = size === 'sm' ? 'h-7 text-[12px] px-2' : 'h-8 text-[12.5px] px-2.5';

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-1 rounded-md border border-sy-border bg-sy-bg-2 text-sy-text hover:border-sy-border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizeClass}`}
      >
        <span className={selected ? 'text-sy-text truncate' : 'text-sy-text-3 truncate'}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-sy-text-3 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[120px] rounded-md border border-sy-border bg-sy-bg-1 shadow-lg py-1 max-h-[200px] overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 text-[12.5px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                opt.value === value
                  ? 'bg-sy-accent/10 text-sy-accent font-medium'
                  : 'text-sy-text-2 hover:bg-sy-bg-2 hover:text-sy-text'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
