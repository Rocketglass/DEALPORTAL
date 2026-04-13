import { notFound } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { getLoi } from '@/lib/queries/lois';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent } from '@/components/ui/card';
import { LoiSectionsPanel } from './loi-sections-panel';
import { LoiActionButtons } from './loi-action-buttons';
import { AddSectionButton } from './add-section-button';
import type { Contact, LoiSectionStatus } from '@/types/database';

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
        <LoiActionButtons loiId={id} status={loi.status} />
      </div>

      {/* Main content + sidebar */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Sections (client component for interactive history toggles) */}
        <div>
          {sections.length > 0 ? (
            <LoiSectionsPanel sections={sections as Parameters<typeof LoiSectionsPanel>[0]['sections']} />
          ) : (
            <p className="text-sm text-muted-foreground">No sections have been added to this LOI yet.</p>
          )}
          <div className="mt-4">
            <AddSectionButton loiId={id} />
          </div>
        </div>

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

      {/* Market comps moved to dedicated Comps tab */}
    </div>
  );
}
