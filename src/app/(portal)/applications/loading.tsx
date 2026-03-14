import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';

export default function ApplicationsLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-2 h-4 w-72" />

      <div className="mt-6">
        {/* Search and filter toolbar skeleton */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-10 w-full sm:max-w-xs" />
          <Skeleton className="h-10 w-28" />
        </div>
        <TableSkeleton />
      </div>
    </div>
  );
}
