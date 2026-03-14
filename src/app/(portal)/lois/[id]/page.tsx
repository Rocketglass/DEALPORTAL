import { notFound } from 'next/navigation';
import { Send, Copy, BarChart3 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { getLoi } from '@/lib/queries/lois';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent } from '@/components/ui/card';
import { LoiSectionsPanel } from './loi-sections-panel';
import type { Contact, LoiSectionStatus, ComparableTransaction } from '@/types/database';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LoiDetailPage({ params }: Props) {
  const { id } = await params;
  const { data: loi, error } = await getLoi(id);

  if (error || !loi) {
    return notFound();
  }

  // Fetch comparable transactions in the same city
  let marketComps: ComparableTransaction[] = [];
  try {
    const supabase = await createClient();
    const city = loi.property?.city;
    if (city) {
      const { data: compsData } = await supabase
        .from('comparable_transactions')
        .select('*')
        .ilike('city', city)
        .order('transaction_date', { ascending: false })
        .limit(5);
      marketComps = (compsData as ComparableTransaction[]) ?? [];
    }
  } catch {
    // Non-fatal — comps section will just be empty
  }

  // Resolve display names
  function contactName(contact: Contact | null): string {
    if (!contact) return '—';
    if (contact.company_name) return contact.company_name;
    const parts = [contact.first_name, contact.last_name].filter(Boolean);
    return parts.join(' ') || '—';
  }

  const propertyName = loi.property?.name ?? '—';
  const suiteNumber = loi.unit?.suite_number;
  const tenantName = contactName(loi.tenant);
  const landlordName = contactName(loi.landlord);
  const brokerName = contactName(loi.broker);

  // Section stats
  const sections = loi.sections ?? [];
  const statusCounts = sections.reduce<Record<LoiSectionStatus, number>>(
    (acc, s) => { acc[s.status] = (acc[s.status] ?? 0) + 1; return acc; },
    { proposed: 0, accepted: 0, countered: 0, rejected: 0 },
  );
  const total = sections.length;
  const agreed = statusCounts.accepted;
  const progressPercent = total > 0 ? Math.round((agreed / total) * 100) : 0;

  return (
    <div className="p-6 lg:p-8">
      {/* Navigation */}
      <BackButton href="/lois" label="Back to LOIs" className="mb-4" />

      {/* LOI header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{propertyName}</h1>
            <Badge status={loi.status} />
          </div>
          {suiteNumber && (
            <p className="mt-1 text-muted-foreground">
              Suite {suiteNumber} &middot; Version {loi.version}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span>
              Tenant: <span className="font-medium text-foreground">{tenantName}</span>
            </span>
            <span>
              Landlord: <span className="font-medium text-foreground">{landlordName}</span>
            </span>
            <span>
              Broker: <span className="font-medium text-foreground">{brokerName}</span>
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Copy}>
            Copy Link
          </Button>
          <Button variant="primary" icon={Send}>
            Resend
          </Button>
        </div>
      </div>

      {/* Main content + sidebar */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Sections (client component for interactive history toggles) */}
        {sections.length > 0 ? (
          <LoiSectionsPanel sections={sections as Parameters<typeof LoiSectionsPanel>[0]['sections']} />
        ) : (
          <p className="text-sm text-muted-foreground">No sections have been added to this LOI yet.</p>
        )}

        {/* Summary sidebar */}
        <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold">Negotiation Progress</h3>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{agreed} of {total} sections agreed</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Breakdown */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" /> Accepted
                  </span>
                  <span className="font-medium">{statusCounts.accepted}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Countered
                  </span>
                  <span className="font-medium">{statusCounts.countered}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" /> Pending
                  </span>
                  <span className="font-medium">{statusCounts.proposed}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Rejected
                  </span>
                  <span className="font-medium">{statusCounts.rejected}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key dates */}
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold">Key Dates</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDate(loi.created_at)}</span>
                </div>
                {loi.sent_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sent</span>
                    <span>{formatDate(loi.sent_at)}</span>
                  </div>
                )}
                {loi.expires_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span>{formatDate(loi.expires_at)}</span>
                  </div>
                )}
                {loi.agreed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Agreed</span>
                    <span>{formatDate(loi.agreed_at)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span>{loi.version}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Market Comps Section */}
      <div className="mt-8">
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">
                Market Comps — {loi.property?.city ?? 'Local Area'}
              </h3>
            </div>

            {marketComps.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No comparable transactions found in {loi.property?.city ?? 'this area'}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-3 py-2 font-medium text-muted-foreground">Address</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Type</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Date</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Tenant</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">SF</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Rent/SF</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Term</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketComps.map((comp) => (
                      <tr
                        key={comp.id}
                        className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-3 py-2 font-medium">{comp.address}</td>
                        <td className="px-3 py-2 capitalize text-muted-foreground">{comp.transaction_type}</td>
                        <td className="px-3 py-2 text-muted-foreground">{formatDate(comp.transaction_date)}</td>
                        <td className="px-3 py-2">{comp.tenant_name || '—'}</td>
                        <td className="px-3 py-2">
                          {comp.sf ? new Intl.NumberFormat('en-US').format(comp.sf) : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {comp.rent_per_sqft ? `$${Number(comp.rent_per_sqft).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {comp.lease_term_months ? `${comp.lease_term_months} mo` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
