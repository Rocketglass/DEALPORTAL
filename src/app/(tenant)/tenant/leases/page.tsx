import Link from 'next/link';
import { ScrollText } from 'lucide-react';
import { requireRole } from '@/lib/security/auth-guard';
import { createClient } from '@/lib/supabase/service';
import type { LeaseStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Leases | Tenant Portal',
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

export default async function TenantLeasesPage() {
  const user = await requireRole('tenant', 'tenant_agent', 'broker', 'admin');
  const isBroker = user.role === 'broker' || user.role === 'admin';
  const contactId = isBroker ? null : (user.principalContactId ?? user.contactId);

  if (!isBroker && !contactId) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Your account is not linked to a contact record yet. Please contact your broker.
          </p>
        </div>
      </div>
    );
  }

  interface LeaseRow {
    id: string;
    status: string;
    base_rent_monthly: number | null;
    property: { id: string; name: string }[] | { id: string; name: string } | null;
    landlord: { id: string; first_name: string | null; last_name: string | null; company_name: string | null }[] | { id: string; first_name: string | null; last_name: string | null; company_name: string | null } | null;
  }

  let leases: LeaseRow[] = [];
  let error: string | null = null;
  try {
    const supabase = await createClient();

    let leaseQuery = supabase
      .from('leases')
      .select(`
        id,
        status,
        base_rent_monthly,
        property:properties(id, name),
        landlord:contacts!leases_landlord_contact_id_fkey(id, first_name, last_name, company_name)
      `)
      .order('created_at', { ascending: false });

    if (contactId) {
      leaseQuery = leaseQuery.eq('tenant_contact_id', contactId);
    }

    const { data, error: queryError } = await leaseQuery;
    if (queryError) {
      error = queryError.message;
    }
    leases = (data ?? []) as unknown as LeaseRow[];
  } catch (err) {
    console.error('[TenantLeases] Error:', err);
    error = err instanceof Error ? err.message : 'Failed to load leases';
  }

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
            <>
            {/* Mobile card layout */}
            <div className="space-y-3 sm:hidden">
              {leases.map((lease) => {
                const property = Array.isArray(lease.property) ? lease.property[0] : lease.property;
                const landlord = Array.isArray(lease.landlord) ? lease.landlord[0] : lease.landlord;
                const landlordName = landlord?.company_name
                  || [landlord?.first_name, landlord?.last_name].filter(Boolean).join(' ')
                  || 'Unknown';
                const badge = statusBadge[lease.status as LeaseStatus] ?? statusBadge.draft;

                return (
                  <Link
                    key={lease.id}
                    href={`/tenant/leases/${lease.id}`}
                    className="block rounded-xl border border-border-subtle bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-foreground truncate">
                          {property?.name ?? 'Unknown Property'}
                        </p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground truncate">
                          {landlordName}
                        </p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] tabular-nums text-foreground">
                      {lease.base_rent_monthly != null ? `${formatCurrency(lease.base_rent_monthly)}/mo` : '—'}
                    </p>
                  </Link>
                );
              })}
            </div>

            {/* Desktop table layout */}
            <div className="hidden sm:block overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border-subtle bg-muted/30">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Property</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Landlord</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Monthly Rent</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {leases.map((lease) => {
                    const property = Array.isArray(lease.property) ? lease.property[0] : lease.property;
                    const landlord = Array.isArray(lease.landlord) ? lease.landlord[0] : lease.landlord;
                    const landlordName = landlord?.company_name
                      || [landlord?.first_name, landlord?.last_name].filter(Boolean).join(' ')
                      || 'Unknown';
                    const badge = statusBadge[lease.status as LeaseStatus] ?? statusBadge.draft;

                    return (
                      <tr key={lease.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {property?.name ?? 'Unknown Property'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{landlordName}</td>
                        <td className="px-4 py-3 tabular-nums text-foreground">
                          {lease.base_rent_monthly != null ? formatCurrency(lease.base_rent_monthly) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/tenant/leases/${lease.id}`}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
