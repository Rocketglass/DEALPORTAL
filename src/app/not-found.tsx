import Link from 'next/link';
import { Building2 } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
        <Building2 className="h-5 w-5 text-muted-foreground" />
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-1.5 max-w-sm text-center text-[13px] text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white shadow-sm shadow-primary/15 transition-all duration-150 hover:bg-primary-light hover:shadow-md hover:shadow-primary/20"
        >
          Go Home
        </Link>
        <Link
          href="/browse"
          className="text-[13px] font-medium text-primary hover:underline"
        >
          View Properties
        </Link>
      </div>
    </div>
  );
}
