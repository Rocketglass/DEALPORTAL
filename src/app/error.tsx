'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    error.message.includes('Failed to load chunk') ||
    error.message.includes('Loading chunk') ||
    error.message.includes('ChunkLoadError')
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reloadAttempted = useRef(false);

  useEffect(() => {
    if (isChunkLoadError(error) && !reloadAttempted.current) {
      reloadAttempted.current = true;
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <Building2 className="h-10 w-10 text-[var(--primary)]" />
      <h1 className="mt-6 text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-center text-[13px] text-muted-foreground">
        {isChunkLoadError(error)
          ? 'A new version is available. The page will reload automatically.'
          : error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={() => {
            if (isChunkLoadError(error)) {
              window.location.reload();
            } else {
              reset();
            }
          }}
          className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-light)]"
        >
          {isChunkLoadError(error) ? 'Reload' : 'Try Again'}
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
