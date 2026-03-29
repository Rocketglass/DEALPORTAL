import { Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { requireRole } from '@/lib/security/auth-guard';
import {
  getLandlordProperties,
  getEffectiveContactId,
  type LandlordProperty,
} from '@/lib/queries/landlord';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Properties | Landlord Portal',
};

function PropertyCard({ property }: { property: LandlordProperty }) {
  return (
    <Card className="border border-border-subtle transition-all duration-200 hover:border-border hover:shadow-sm h-full">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle">
            <Building2 className="h-[18px] w-[18px] text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-semibold text-foreground">
              {property.name}
            </h3>
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {property.address}, {property.city}, {property.state} {property.zip}
            </p>
          </div>
        </div>

        <p className="mt-3 text-[12px] text-muted-foreground">
          {property.unitCount === 0
            ? 'No units'
            : property.unitCount === 1
            ? '1 unit'
            : `${property.unitCount} units`}
        </p>
      </CardContent>
    </Card>
  );
}

export default async function LandlordPropertiesPage() {
  const user = await requireRole('landlord', 'landlord_agent', 'broker', 'admin');
  const isBroker = user.role === 'broker' || user.role === 'admin';
  const contactId = isBroker ? null : getEffectiveContactId(user);

  let properties: LandlordProperty[] | null = null;
  let error: string | null = null;
  try {
    const result = await getLandlordProperties(contactId);
    properties = result.data;
    error = result.error;
  } catch (err) {
    console.error('[LandlordProperties] Error:', err);
    error = err instanceof Error ? err.message : 'Failed to load properties';
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Properties</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Properties associated with your deals
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-[13px] text-destructive">
          Failed to load properties. Please try refreshing the page.
        </div>
      )}

      {!error && (
        <div className="mt-6">
          {!properties || properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-muted/20 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-4 text-[14px] font-medium text-foreground">No properties yet</p>
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
