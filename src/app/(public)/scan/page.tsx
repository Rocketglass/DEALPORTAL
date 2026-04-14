import Link from 'next/link';
import { Building2, ArrowRight, Search } from 'lucide-react';

export const metadata = {
  title: 'Rocket Realty — Commercial Space',
  description:
    'Apply for available commercial spaces in San Diego East County through Rocket Realty.',
};

export default function ScanLandingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-foreground">
            Rocket Realty
          </span>
        </div>

        <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">
              Welcome! Looking for commercial space?
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Apply for available commercial spaces in San Diego East County.
              Submit your application online and our team will follow up with
              you directly.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <Link
              href="/apply"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Start Application
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/browse"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-[#f1f5f9]"
            >
              <Search className="h-4 w-4" />
              Browse Properties
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Rocket Realty &middot; Commercial Real Estate
        </p>
      </div>
    </div>
  );
}
