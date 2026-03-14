'use client';

import { useRouter } from 'next/navigation';
import { Building2, Clock, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function PendingApprovalPage() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm text-center">
        <div className="rounded-xl bg-white p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>

          <div className="mb-2 flex items-center justify-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">Rocket Realty</span>
          </div>

          <h1 className="mt-4 text-lg font-semibold text-foreground">
            Account Pending Approval
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Your account has been created but is awaiting approval from the
            administrator. You will be able to access the portal once your
            account has been approved.
          </p>

          <p className="mt-3 text-sm text-muted-foreground">
            Contact your administrator to get access.
          </p>

          <button
            onClick={handleSignOut}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
