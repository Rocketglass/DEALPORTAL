import Link from 'next/link';
import { ShieldOff } from 'lucide-react';

export const metadata = {
  title: 'Access denied | Rocket Realty',
};

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-white p-8 shadow-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <ShieldOff className="h-6 w-6 text-red-500" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-foreground">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account doesn&apos;t have permission to view that page. If you think
          this is a mistake, contact Rocket Realty to adjust your access.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-[#f1f5f9]"
          >
            Back to sign in
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
