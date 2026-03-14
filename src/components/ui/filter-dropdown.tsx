'use client';

import { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown, Check } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  allowAll?: boolean;
}

export function FilterDropdown({
  label,
  options,
  value,
  onChange,
  allowAll = true,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = value
    ? options.find((o) => o.value === value)?.label || value
    : 'All';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-sm text-foreground transition-colors hover:bg-muted/50"
      >
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium">{selectedLabel}</span>
        <ChevronDown className="ml-0.5 h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1 min-w-[180px] rounded-lg border border-border bg-white py-1 shadow-lg">
          {allowAll && (
            <button
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/50"
            >
              <Check
                className={`h-3.5 w-3.5 ${!value ? 'opacity-100' : 'opacity-0'}`}
              />
              All
            </button>
          )}
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/50"
            >
              <Check
                className={`h-3.5 w-3.5 ${value === option.value ? 'opacity-100' : 'opacity-0'}`}
              />
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
