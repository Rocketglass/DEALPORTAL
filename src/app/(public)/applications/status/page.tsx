import { Suspense } from 'react';
import { ApplicationStatusClient } from './status-client';

export const metadata = {
  title: 'Application Status — Rocket Realty',
};

export default function ApplicationStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <ApplicationStatusClient />
    </Suspense>
  );
}
