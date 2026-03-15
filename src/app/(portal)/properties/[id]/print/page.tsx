/**
 * Print-friendly property flyer page.
 *
 * Renders a clean, print-optimized layout with property details, photos,
 * unit availability, and QR code. Designed to be opened in a new tab and
 * printed directly or saved as PDF.
 */

import { notFound } from 'next/navigation';
import { requireBrokerOrAdmin } from '@/lib/security/auth-guard';
import { getProperty, getUnits } from '@/lib/queries/properties';
import { getQrCodesByProperty } from '@/lib/queries/qr-codes';
import { formatSqft, formatCurrency } from '@/lib/utils';
import { Building2 } from 'lucide-react';
import { PrintActions } from './print-actions';

export const dynamic = 'force-dynamic';

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyPrintPage({ params }: PrintPageProps) {
  await requireBrokerOrAdmin();

  const { id } = await params;

  const [{ data: propertyData }, { data: units }, qrResult] = await Promise.all([
    getProperty(id),
    getUnits(id),
    getQrCodesByProperty(id),
  ]);

  if (!propertyData) notFound();

  const property = propertyData;
  const allUnits = units ?? [];
  const qrCodes = qrResult.data ?? [];
  const photos = property.photos as string[] | null;
  const displayPhotos = photos?.slice(0, 3) ?? [];

  // Find a QR code that links to the public browse page
  const browseQr = qrCodes.find((qr) => qr.portal_url?.includes('/browse/'));
  const browseUrl = browseQr
    ? browseQr.portal_url
    : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/browse/${property.id}`;

  // Build specs grid
  const specs: { label: string; value: string }[] = [];
  if (property.total_sf) specs.push({ label: 'Total SF', value: formatSqft(property.total_sf) });
  if (property.property_type) specs.push({ label: 'Property Type', value: property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1) });
  if (property.zoning) specs.push({ label: 'Zoning', value: property.zoning });
  if (property.clear_height_ft) specs.push({ label: 'Clear Height', value: `${property.clear_height_ft}'` });
  if (property.parking_spaces) specs.push({ label: 'Parking', value: `${property.parking_spaces} spaces` });
  if (property.dock_high_doors > 0) specs.push({ label: 'Dock Doors', value: String(property.dock_high_doors) });
  if (property.grade_level_doors > 0) specs.push({ label: 'Grade Doors', value: String(property.grade_level_doors) });
  if (property.power) specs.push({ label: 'Power', value: property.power });
  if (property.year_built) specs.push({ label: 'Year Built', value: String(property.year_built) });

  return (
    <>
      {/* Print-specific styles that hide portal layout chrome */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              /* Hide portal sidebar, header, mobile nav */
              body > div > div > .hidden.lg\\:flex,
              body > div > div > div > .relative.flex.items-center,
              nav, header,
              [data-portal-sidebar],
              [data-portal-header] {
                display: none !important;
              }
              /* Make main content full width */
              body > div > div {
                display: block !important;
              }
              body > div > div > div {
                display: block !important;
              }
              main {
                background: white !important;
                overflow: visible !important;
              }
              /* Clean print defaults */
              body {
                background: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print {
                display: none !important;
              }
              .print-page {
                padding: 0 !important;
                margin: 0 !important;
                max-width: 100% !important;
              }
              @page {
                margin: 0.5in;
              }
            }
          `,
        }}
      />

      <div className="print-page mx-auto max-w-4xl p-6 lg:p-8 bg-white">
        {/* Print button — hidden when printing */}
        <PrintActions />

        {/* Header */}
        <div className="border-b-2 border-primary pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-sm font-bold tracking-widest uppercase text-primary">
                  Rocket Realty
                </h1>
                <p className="text-xs text-muted-foreground">Commercial Real Estate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Property Name & Address */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">{property.name}</h2>
          <p className="mt-1 text-muted-foreground">
            {property.address}, {property.city}, {property.state} {property.zip}
          </p>
        </div>

        {/* Photos */}
        {displayPhotos.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-3">
            {displayPhotos.map((photo, i) => (
              <div key={i} className="aspect-[16/10] overflow-hidden rounded-lg bg-muted">
                <img
                  src={photo}
                  alt={`${property.name} photo ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Description */}
        {property.description && (
          <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
            {property.description}
          </p>
        )}

        {/* Key Specs Grid */}
        {specs.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Property Specifications
            </h3>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {specs.map((spec) => (
                <div key={spec.label} className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{spec.label}</p>
                  <p className="mt-0.5 text-sm font-semibold">{spec.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unit Availability Table */}
        {allUnits.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Unit Availability
            </h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-border text-left">
                  <th className="py-2 pr-4 font-medium text-muted-foreground">Suite</th>
                  <th className="py-2 pr-4 font-medium text-muted-foreground text-right">SF</th>
                  <th className="py-2 pr-4 font-medium text-muted-foreground">Status</th>
                  <th className="py-2 font-medium text-muted-foreground text-right">Rate</th>
                </tr>
              </thead>
              <tbody>
                {allUnits.map((unit) => (
                  <tr key={unit.id} className="border-b border-border">
                    <td className="py-2 pr-4 font-medium">{unit.suite_number}</td>
                    <td className="py-2 pr-4 text-right">{formatSqft(unit.sf)}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          unit.status === 'vacant'
                            ? 'text-green-600 font-medium'
                            : unit.status === 'pending'
                              ? 'text-amber-600'
                              : 'text-muted-foreground'
                        }
                      >
                        {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      {unit.marketing_rate
                        ? `${formatCurrency(unit.marketing_rate)}/SF/mo`
                        : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer: QR Code + Contact */}
        <div className="mt-8 flex items-end justify-between border-t-2 border-border pt-6">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Rocket Glass, CCIM
            </p>
            <p className="text-sm text-muted-foreground">Rocket Realty</p>
            <p className="mt-2 text-xs text-muted-foreground">
              For inquiries or to schedule a tour, scan the QR code or visit the link below.
            </p>
            <p className="mt-1 text-xs text-primary break-all">{browseUrl}</p>
          </div>

          {/* QR Code */}
          <div className="flex-shrink-0 ml-6 text-center">
            {browseQr?.qr_image_url ? (
              <img
                src={browseQr.qr_image_url}
                alt="QR Code"
                className="h-24 w-24"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-border">
                <div className="text-center">
                  <svg
                    viewBox="0 0 100 100"
                    className="mx-auto h-14 w-14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="5" y="5" width="30" height="30" rx="2" fill="#0f172a" />
                    <rect x="10" y="10" width="20" height="20" rx="1" fill="white" />
                    <rect x="14" y="14" width="12" height="12" rx="1" fill="#0f172a" />
                    <rect x="65" y="5" width="30" height="30" rx="2" fill="#0f172a" />
                    <rect x="70" y="10" width="20" height="20" rx="1" fill="white" />
                    <rect x="74" y="14" width="12" height="12" rx="1" fill="#0f172a" />
                    <rect x="5" y="65" width="30" height="30" rx="2" fill="#0f172a" />
                    <rect x="10" y="70" width="20" height="20" rx="1" fill="white" />
                    <rect x="14" y="74" width="12" height="12" rx="1" fill="#0f172a" />
                    <rect x="40" y="40" width="8" height="8" fill="#0f172a" />
                    <rect x="52" y="40" width="8" height="8" fill="#0f172a" />
                    <rect x="65" y="52" width="8" height="8" fill="#0f172a" />
                    <rect x="78" y="65" width="8" height="8" fill="#0f172a" />
                    <rect x="65" y="78" width="8" height="8" fill="#0f172a" />
                  </svg>
                </div>
              </div>
            )}
            <p className="mt-1 text-[10px] text-muted-foreground">Scan to view</p>
          </div>
        </div>
      </div>
    </>
  );
}
