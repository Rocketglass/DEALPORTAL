import Link from 'next/link';
import { Building2, FileText, Handshake, ScrollText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { requireRole } from '@/lib/security/auth-guard';
import {
  getLandlordProperties,
  getEffectiveContactId,
  type LandlordProperty,
} from '@/lib/queries/landlord';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard | Landlord Portal',
};

function PropertyCard({ property }: { property: LandlordProperty }) {
  return (
    <Link href={`/landlord/applications?property=${property.id}`}>
      <Card className="group border border-border-subtle transition-all duration-200 hover:border-border hover:shadow-sm cursor-pointer h-full">
        <CardContent className="p-5">
          {/* Property name and address */}
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle">
              <Building2 className="h-[18px] w-[18px] text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors duration-150">
                {property.name}
              </h3>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                {property.address}, {property.city}, {property.state} {property.zip}
              </p>
            </div>
          </div>

          {/* Unit count */}
          <p className="mt-3 text-[12px] text-muted-foreground">
            {property.unitCount === 0
              ? 'No units'
              : property.unitCount === 1
              ? '1 unit'
              : `${property.unitCount} units`}
          </p>

          {/* Deal pipeline mini-summary */}
          <div className="mt-3 border-t border-border-subtle pt-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Pipeline
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="text-[12px] text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">
                    {property.applicationCount}
                  </span>{' '}
                  {property.applicationCount === 1 ? 'Application' : 'Applications'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Handshake className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[12px] text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">
                    {property.activeLoiCount}
                  </span>{' '}
                  {property.activeLoiCount === 1 ? 'Active LOI' : 'Active LOIs'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ScrollText className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[12px] text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">
                    {property.activeLeaseCount}
                  </span>{' '}
                  {property.activeLeaseCount === 1 ? 'Lease' : 'Leases'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function LandlordDashboardPage() {
  const user = await requireRole('landlord', 'landlord_agent', 'broker', 'admin');
  const contactId = getEffectiveContactId(user);
  const { data: properties, error } = await getLandlordProperties(contactId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Overview of your properties and deals
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-[13px] text-destructive">
          Failed to load properties. Please try refreshing the page.
        </div>
      )}

      {/* Property grid */}
      {!error && (
        <div className="mt-6">
          {!properties || properties.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-muted/20 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-4 text-[14px] font-medium text-foreground">No properties found</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Properties will appear here once your broker assigns deals to you.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
