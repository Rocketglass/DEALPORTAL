import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';

export default function InvoicesLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="mt-2 h-4 w-80" />

      <div className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-10 w-full sm:max-w-xs" />
          <Skeleton className="h-10 w-28" />
        </div>
        <TableSkeleton />
      </div>
    </div>
  );
}
