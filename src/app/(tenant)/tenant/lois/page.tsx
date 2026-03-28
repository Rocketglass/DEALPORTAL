import Link from 'next/link';
import { Handshake } from 'lucide-react';
import { requireRole } from '@/lib/security/auth-guard';
import { createClient } from '@/lib/supabase/service';
import type { LoiStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'LOIs | Tenant Portal',
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

const statusBadge: Record<LoiStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-blue-50 text-blue-700' },
  sent: { label: 'Sent', className: 'bg-blue-50 text-blue-700' },
  in_negotiation: { label: 'In Negotiation', className: 'bg-amber-50 text-amber-700' },
  agreed: { label: 'Agreed', className: 'bg-green-50 text-green-700' },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-600' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
  withdrawn: { label: 'Withdrawn', className: 'bg-gray-100 text-gray-600' },
};

export default async function TenantLoisPage() {
  const user = await requireRole('tenant', 'tenant_agent', 'broker', 'admin');
  const contactId = user.principalId ?? user.contactId;

  if (!contactId) {
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

  const supabase = await createClient();

  interface LoiRow {
    id: string;
    status: string;
    sent_at: string | null;
    property: { id: string; name: string }[] | null;
    landlord: { id: string; first_name: string | null; last_name: string | null; company_name: string | null }[] | null;
  }

  const { data, error } = await supabase
    .from('lois')
    .select(`
      id,
      status,
      sent_at,
      property:properties(id, name),
      landlord:contacts!lois_landlord_contact_id_fkey(id, first_name, last_name, company_name)
    `)
    .eq('tenant_contact_id', contactId)
    .order('created_at', { ascending: false });

  const lois = (data ?? []) as unknown as LoiRow[];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Letters of Intent</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Track LOIs submitted on your behalf
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-[13px] text-destructive">
          Failed to load LOIs. Please try refreshing the page.
        </div>
      )}

      {!error && (
        <div className="mt-6">
          {!lois || lois.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-muted/20 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Handshake className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-4 text-[14px] font-medium text-foreground">No LOIs yet</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Letters of Intent will appear here once your broker sends one on your behalf.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border-subtle bg-muted/30">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Property</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Landlord</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {lois.map((loi) => {
                    const property = loi.property?.[0] ?? null;
                    const landlord = loi.landlord?.[0] ?? null;
                    const landlordName = landlord?.company_name
                      || [landlord?.first_name, landlord?.last_name].filter(Boolean).join(' ')
                      || 'Unknown';
                    const badge = statusBadge[loi.status as LoiStatus] ?? statusBadge.draft;

                    return (
                      <tr key={loi.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {property?.name ?? 'Unknown Property'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{landlordName}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/tenant/lois/${loi.id}`}
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
