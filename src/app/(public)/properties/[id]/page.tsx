import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Building2, MapPin, Maximize2, ArrowLeft, DoorOpen, Car, Zap } from 'lucide-react';
import { formatSqft, formatCurrency } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: property } = await supabase
      .from('properties')
      .select('name, address, city')
      .eq('id', id)
      .single();
    if (!property) return { title: 'Property Not Found' };
    return { title: `${property.name} | Rocket Realty` };
  } catch {
    return { title: 'Property | Rocket Realty' };
  }
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let property = null;
  let units: Array<{ id: string; suite_number: string; sf: number; status: string; marketing_rate: number | null; unit_type: string | null }> = [];

  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    const { data: p } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    property = p;

    if (property) {
      const { data: u } = await supabase
        .from('units')
        .select('*')
        .eq('property_id', id)
        .order('suite_number');
      units = u ?? [];
    }
  } catch {
    // Supabase not configured — show placeholder
  }

  if (!property) notFound();

  const vacantUnits = units.filter((u) => u.status === 'vacant');
  const photos = property.photos as string[];

  return (
    <div className="min-h-screen bg-muted">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">Rocket Realty</span>
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/properties"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Properties
        </Link>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="aspect-[21/9] bg-muted">
            {photos?.[0] ? (
              <img
                src={photos[0]}
                alt={property.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Building2 className="h-16 w-16 text-muted-foreground/20" />
              </div>
            )}
          </div>

          <div className="p-6">
            <h1 className="text-2xl font-bold">{property.name}</h1>
            <p className="mt-1 flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {property.address}, {property.city}, {property.state} {property.zip}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {property.total_sf && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Total Size</p>
                  <p className="mt-1 font-semibold">{formatSqft(property.total_sf)}</p>
                </div>
              )}
              {property.property_type && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="mt-1 font-semibold capitalize">{property.property_type}</p>
                </div>
              )}
              {property.year_built && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Year Built</p>
                  <p className="mt-1 font-semibold">{property.year_built}</p>
                </div>
              )}
              {property.clear_height_ft && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Clear Height</p>
                  <p className="mt-1 font-semibold">{property.clear_height_ft} ft</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {property.parking_spaces && (
                <span className="flex items-center gap-1">
                  <Car className="h-4 w-4" /> {property.parking_spaces} parking spaces
                </span>
              )}
              {property.dock_high_doors > 0 && (
                <span className="flex items-center gap-1">
                  <DoorOpen className="h-4 w-4" /> {property.dock_high_doors} dock-high doors
                </span>
              )}
              {property.grade_level_doors > 0 && (
                <span className="flex items-center gap-1">
                  <DoorOpen className="h-4 w-4" /> {property.grade_level_doors} grade-level doors
                </span>
              )}
              {property.power && (
                <span className="flex items-center gap-1">
                  <Zap className="h-4 w-4" /> {property.power}
                </span>
              )}
            </div>

            {property.description && (
              <p className="mt-6 text-muted-foreground">{property.description}</p>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold">
            Available Spaces ({vacantUnits.length})
          </h2>

          {vacantUnits.length === 0 ? (
            <p className="mt-4 text-muted-foreground">
              No spaces currently available at this property.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {vacantUnits.map((unit) => (
                <div
                  key={unit.id}
                  className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
                >
                  <div>
                    <p className="font-medium">Suite {unit.suite_number}</p>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Maximize2 className="h-3.5 w-3.5" /> {formatSqft(unit.sf)}
                      </span>
                      {unit.marketing_rate && (
                        <span>
                          {formatCurrency(unit.marketing_rate)}/SF/mo
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/register?property=${property.id}&unit=${unit.id}`}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light"
                  >
                    Apply Now
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
