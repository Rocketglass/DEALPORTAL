import Link from 'next/link';
import { Plus, MapPin, Settings, AlertCircle } from 'lucide-react';
import { getPropertiesWithUnitCounts } from '@/lib/queries/properties';
import { formatSqft } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function PropertiesPage() {
  const { data: properties, error } = await getPropertiesWithUnitCounts();

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Properties</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your property portfolio and units.
            </p>
          </div>
        </div>
        <Card className="mt-6">
          <div className="flex items-center gap-3 p-6 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Failed to load properties</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const propertyList = properties ?? [];
  const totalUnits = propertyList.reduce((sum, p) => sum + p.totalUnits, 0);
  const totalVacant = propertyList.reduce((sum, p) => sum + p.vacantUnits, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your property portfolio and units.
          </p>
        </div>
        <Link href="/properties/new">
          <Button variant="primary" icon={Plus}>
            Add Property
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="p-5">
            <p className="text-sm text-muted-foreground">Total Properties</p>
            <p className="mt-1 text-3xl font-bold">{propertyList.length}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-muted-foreground">Total Units</p>
            <p className="mt-1 text-3xl font-bold">{totalUnits}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-muted-foreground">Vacant Units</p>
            <p className="mt-1 text-3xl font-bold text-success">{totalVacant}</p>
          </div>
        </Card>
      </div>

      {/* Properties table */}
      <Card className="mt-6">
        {propertyList.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground">
            <p className="font-medium">No properties found</p>
            <p className="mt-1 text-sm">Add your first property to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Property</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Location</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Size</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-center">Total Units</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-center">Occupied</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-center">Vacant</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {propertyList.map((property) => (
                  <tr
                    key={property.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{property.name}</div>
                      <div className="text-xs text-muted-foreground">{property.address}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {property.city}, {property.state}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={property.property_type} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {property.total_sf ? formatSqft(property.total_sf) : '--'}
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{property.totalUnits}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-blue-600 font-medium">{property.occupiedUnits}</span>
                      {property.pendingUnits > 0 && (
                        <span className="ml-1 text-xs text-amber-600">
                          +{property.pendingUnits} pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={
                          property.vacantUnits > 0
                            ? 'text-success font-medium'
                            : 'text-muted-foreground'
                        }
                      >
                        {property.vacantUnits}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/properties/${property.id}`}
                        className="inline-flex items-center gap-1 text-primary transition-colors duration-150 hover:text-primary-light"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
