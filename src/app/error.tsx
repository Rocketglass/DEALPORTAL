'use client';

import Link from 'next/link';
import { Building2 } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <Building2 className="h-10 w-10 text-[var(--primary)]" />
      <h1 className="mt-6 text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-center text-[var(--muted-foreground)]">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={reset}
          className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-light)]"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
