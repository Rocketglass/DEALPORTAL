import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Base Skeleton
// ---------------------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-[#f1f5f9]',
        className,
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Card Skeleton
// ---------------------------------------------------------------------------

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
      {/* Header bar */}
      <Skeleton className="mb-4 h-5 w-2/5" />
      {/* Content lines */}
      <Skeleton className="mb-3 h-4 w-full" />
      <Skeleton className="mb-3 h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table Skeleton
// ---------------------------------------------------------------------------

export function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
      {/* Table header */}
      <div className="flex gap-4 border-b border-[#e2e8f0] bg-[#f8fafc] px-6 py-3">
        <Skeleton className="h-4 w-1/5" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/12" />
      </div>
      {/* Table rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 border-b border-[#e2e8f0] px-6 py-4 last:border-b-0"
        >
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/12" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card Skeleton (matches dashboard stat cards)
// ---------------------------------------------------------------------------

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-8 w-20" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  );
}
