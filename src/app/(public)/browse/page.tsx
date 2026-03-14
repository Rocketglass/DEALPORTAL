import Link from 'next/link';
import { Building2, MapPin, Maximize2 } from 'lucide-react';
import { formatSqft } from '@/lib/utils';
import { getProperties } from '@/lib/queries/properties';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Available Properties | Rocket Realty',
};

export default async function PropertiesPage() {
  const { data: properties } = await getProperties();

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
        <h1 className="text-2xl font-bold">Available Properties</h1>
        <p className="mt-1 text-muted-foreground">
          Browse commercial spaces available for lease in San Diego East County.
        </p>

        {!properties || properties.length === 0 ? (
          <div className="mt-12 text-center text-muted-foreground">
            <Building2 className="mx-auto h-12 w-12 opacity-30" />
            <p className="mt-4">No properties listed yet. Check back soon.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => {
              const vacantUnits = (property.units ?? []).filter(
                (u) => u.status === 'vacant'
              );
              const photos = property.photos as string[] | null;
              const coverPhoto = photos?.[0];

              return (
                <Link
                  key={property.id}
                  href={`/browse/${property.id}`}
                  className="group overflow-hidden rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="aspect-[16/10] bg-muted">
                    {coverPhoto ? (
                      <img
                        src={coverPhoto}
                        alt={property.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Building2 className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="font-semibold group-hover:text-primary">
                      {property.name}
                    </h2>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {property.address}, {property.city}, {property.state}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Maximize2 className="h-3.5 w-3.5" />
                        {property.total_sf ? formatSqft(property.total_sf) : 'N/A'}
                      </span>
                      <span className="font-medium text-primary">
                        {vacantUnits.length} space{vacantUnits.length !== 1 ? 's' : ''} available
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
