import { Suspense } from 'react';
import { GeneralApplicationPage } from './apply-client';

export const dynamic = 'force-dynamic';

export default function ApplyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            <p className="text-sm">Loading application...</p>
          </div>
        </div>
      }
    >
      <GeneralApplicationPage />
    </Suspense>
  );
}
