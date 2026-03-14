'use client';

import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc' | null;

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: string | null;
  currentDirection: SortDirection;
  onSort: (key: string, direction: SortDirection) => void;
}

export function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDirection,
  onSort,
}: SortableHeaderProps) {
  const isActive = currentSort === sortKey;

  function handleClick() {
    if (!isActive) {
      onSort(sortKey, 'asc');
    } else if (currentDirection === 'asc') {
      onSort(sortKey, 'desc');
    } else {
      onSort(sortKey, null);
    }
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
      {isActive && currentDirection === 'asc' && (
        <ArrowUp className="h-3.5 w-3.5" />
      )}
      {isActive && currentDirection === 'desc' && (
        <ArrowDown className="h-3.5 w-3.5" />
      )}
      {!isActive && (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}
