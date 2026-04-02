'use client';

import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export function RefreshButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.refresh()}
      className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      aria-label="Refresh timeline"
      title="Refresh"
    >
      <RefreshCw className="h-3.5 w-3.5" />
    </button>
  );
}
