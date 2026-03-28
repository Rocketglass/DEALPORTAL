import Link from 'next/link';
import { ScrollText } from 'lucide-react';
import { requireRole } from '@/lib/security/auth-guard';
import { getEffectiveContactId } from '@/lib/queries/landlord';
import { createClient } from '@/lib/supabase/service';
import type { LeaseStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Leases | Landlord Portal',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const statusBadge: Record<LeaseStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-blue-50 text-blue-700' },
  review: { label: 'Under Review', className: 'bg-amber-50 text-amber-700' },
  sent_for_signature: { label: 'Sent for Signature', className: 'bg-blue-50 text-blue-700' },
  partially_signed: { label: 'Partially Signed', className: 'bg-amber-50 text-amber-700' },
  executed: { label: 'Executed', className: 'bg-green-50 text-green-700' },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-600' },
  terminated: { label: 'Terminated', className: 'bg-red-50 text-red-700' },
};

export default async function LandlordLeasesPage() {
  const user = await requireRole('landlord', 'landlord_agent', 'broker', 'admin');
  const contactId = getEffectiveContactId(user);

  const supabase = await createClient();

  interface LeaseRow {
    id: string;
    status: string;
    base_rent_monthly: number;
    property: { id: string; name: string }[] | null;
    tenant: { id: string; first_name: string | null; last_name: string | null; company_name: string | null }[] | null;
  }

  const { data, error } = await supabase
    .from('leases')
    .select(`
      id,
      status,
      base_rent_monthly,
      property:properties(id, name),
      tenant:contacts!leases_tenant_contact_id_fkey(id, first_name, last_name, company_name)
    `)
    .eq('landlord_contact_id', contactId)
    .order('created_at', { ascending: false });

  const leases = (data ?? []) as unknown as LeaseRow[];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Leases</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Track your lease agreements and their status
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-[13px] text-destructive">
          Failed to load leases. Please try refreshing the page.
        </div>
      )}

      {!error && (
        <div className="mt-6">
          {!leases || leases.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-muted/20 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <ScrollText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-4 text-[14px] font-medium text-foreground">No leases yet</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Leases will appear here once an LOI is agreed upon and a lease is drafted.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border-subtle bg-muted/30">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Property</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Tenant</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Monthly Rent</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {leases.map((lease) => {
                    const property = lease.property?.[0] ?? null;
                    const tenant = lease.tenant?.[0] ?? null;
                    const tenantName = tenant?.company_name
                      || [tenant?.first_name, tenant?.last_name].filter(Boolean).join(' ')
                      || 'Unknown';
                    const badge = statusBadge[lease.status as LeaseStatus] ?? statusBadge.draft;

                    return (
                      <tr key={lease.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {property?.name ?? 'Unknown Property'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{tenantName}</td>
                        <td className="px-4 py-3 tabular-nums text-foreground">
                          {formatCurrency(lease.base_rent_monthly)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/landlord/leases/${lease.id}`}
                            className="text-[13px] font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
