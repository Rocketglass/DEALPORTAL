import Link from 'next/link';
import Image from 'next/image';
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
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-border bg-[var(--background-raised)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Rocket Realty</span>
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-primary px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-primary-light"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-fade-in-up">
          <h1 className="text-xl font-semibold tracking-tight">Available Properties</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Commercial spaces available for lease in San Diego East County
          </p>
        </div>

        {!properties || properties.length === 0 ? (
          <div className="mt-16 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/25" />
            <p className="mt-4 text-[13px] text-muted-foreground">No properties listed yet. Check back soon.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
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
                  className="group overflow-hidden rounded-xl border border-border-subtle bg-[var(--background-raised)] transition-all duration-200 hover:border-border hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] bg-muted">
                    {coverPhoto ? (
                      <Image
                        src={coverPhoto}
                        alt={property.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Building2 className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors duration-150">
                      {property.name}
                    </h2>
                    <p className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {property.address}, {property.city}, {property.state}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Maximize2 className="h-3 w-3" />
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
