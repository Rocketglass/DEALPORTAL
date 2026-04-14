/**
 * Print-friendly property marketing sheet.
 *
 * Matches the CoStar commercial real estate flyer format:
 * - Header with property name, address, type
 * - Property Summary table with photo
 * - Property Details table
 * - Available Spaces table
 * - Footer with Rocket Realty branding and QR code
 */

import { notFound } from 'next/navigation';
import { requireBrokerOrAdmin } from '@/lib/security/auth-guard';
import { getProperty, getUnits } from '@/lib/queries/properties';
import { getQrCodesByProperty } from '@/lib/queries/qr-codes';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';
import { PrintActions } from './print-actions';

export const dynamic = 'force-dynamic';

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

/** Format number with commas */
function fmt(n: number | null | undefined): string {
  if (n == null) return '--';
  return new Intl.NumberFormat('en-US').format(n);
}

/** Format land area: convert SF to acres + show SF */
function formatLandArea(sf: number | null | undefined): string {
  if (sf == null) return '--';
  const acres = (sf / 43560).toFixed(2);
  return `${acres} AC (${fmt(sf)} SF)`;
}

/** Capitalize first letter */
function cap(s: string | null | undefined): string {
  if (!s) return '--';
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  const heroPhoto = photos?.[0] ?? null;

  // Find a QR code that links to the public browse page
  const browseQr = qrCodes.find((qr) => qr.portal_url?.includes('/browse/'));
  const _browseUrl = browseQr
    ? browseQr.portal_url
    : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/browse/${property.id}`;

  // Compute derived values
  const vacantUnits = allUnits.filter((u) => u.status === 'vacant');
  const occupiedUnits = allUnits.filter((u) => u.status === 'occupied');
  const totalUnitSf = allUnits.reduce((sum, u) => sum + (u.sf || 0), 0);
  const occupiedSf = occupiedUnits.reduce((sum, u) => sum + (u.sf || 0), 0);
  const rba = property.total_sf || totalUnitSf || null;
  const pctLeased = rba && rba > 0 ? ((occupiedSf / rba) * 100).toFixed(1) : null;

  // Available SF range
  const availableSfs = vacantUnits.map((u) => u.sf).filter(Boolean).sort((a, b) => a - b);
  const availRange =
    availableSfs.length === 0
      ? '--'
      : availableSfs.length === 1
        ? `${fmt(availableSfs[0])} SF`
        : `${fmt(availableSfs[0])} - ${fmt(availableSfs[availableSfs.length - 1])} SF`;

  // Max contiguous (largest single vacant unit)
  const maxContig = availableSfs.length > 0 ? availableSfs[availableSfs.length - 1] : null;

  // Asking rent from marketing_rate (annualized from monthly per SF)
  const marketingRates = allUnits
    .filter((u) => u.marketing_rate != null && u.marketing_rate > 0)
    .map((u) => u.marketing_rate!);
  const avgRate = marketingRates.length > 0
    ? marketingRates.reduce((a, b) => a + b, 0) / marketingRates.length
    : null;

  // Drive-ins description
  const driveIns =
    property.grade_level_doors > 0
      ? `${property.grade_level_doors} total`
      : 'None';

  // Docks description
  const docks =
    property.dock_high_doors > 0
      ? `${property.dock_high_doors}`
      : 'None';

  // Property type label
  const propertyTypeLabel = cap(property.property_type);

  // Today's date
  const today = new Date().toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      {/* Print-specific styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body > div > div > .hidden.lg\\:flex,
              body > div > div > div > .relative.flex.items-center,
              nav, header,
              [data-portal-sidebar],
              [data-portal-header] {
                display: none !important;
              }
              body > div > div {
                display: block !important;
              }
              body > div > div > div {
                display: block !important;
              }
              main {
                background: white !important;
                overflow: visible !important;
                padding: 0 !important;
              }
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
                margin: 0.4in 0.5in;
                size: letter;
              }
            }

            /* CoStar-style table formatting */
            .costar-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              line-height: 1.4;
            }
            .costar-table td {
              padding: 4px 8px;
              border-bottom: 1px solid #e2e8f0;
              vertical-align: top;
            }
            .costar-table .label-cell {
              color: #475569;
              width: 35%;
              font-size: 11px;
            }
            .costar-table .value-cell {
              color: #0f172a;
              font-size: 12px;
            }
            .costar-table-2col {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              line-height: 1.4;
            }
            .costar-table-2col td {
              padding: 4px 8px;
              border-bottom: 1px solid #e2e8f0;
              vertical-align: top;
            }
            .costar-table-2col .label-cell {
              color: #475569;
              font-size: 11px;
              width: 18%;
            }
            .costar-table-2col .value-cell {
              color: #0f172a;
              font-size: 12px;
              width: 32%;
            }
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              padding: 8px 0 4px 0;
              border-bottom: 2px solid #1e40af;
              margin-bottom: 0;
            }
            .spaces-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              line-height: 1.3;
            }
            .spaces-table th {
              padding: 6px 6px;
              text-align: left;
              font-weight: 600;
              color: #475569;
              font-size: 10px;
              border-bottom: 2px solid #cbd5e1;
              white-space: nowrap;
            }
            .spaces-table td {
              padding: 5px 6px;
              border-bottom: 1px solid #e2e8f0;
              color: #0f172a;
            }
            .spaces-table th.right, .spaces-table td.right {
              text-align: right;
            }
          `,
        }}
      />

      <div className="print-page mx-auto max-w-[850px] bg-white" style={{ padding: '24px 32px', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
        {/* Print button -- hidden when printing */}
        <PrintActions />

        {/* ================================================================ */}
        {/* HEADER: Property name, address, type                             */}
        {/* ================================================================ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>
              {property.name}
            </h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0 0', lineHeight: 1.4 }}>
              {property.city}, {property.state} {property.zip}
              {property.county ? ` (${property.county})` : ''}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 24 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>
              {propertyTypeLabel}
            </p>
          </div>
        </div>

        {/* Blue divider line */}
        <div style={{ height: 3, background: '#1e40af', margin: '8px 0 16px 0' }} />

        {/* ================================================================ */}
        {/* PROPERTY SUMMARY + PHOTO                                         */}
        {/* ================================================================ */}
        <div style={{ marginBottom: 16 }}>
          <div className="section-title">Property Summary</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            {/* Left: Summary table */}
            <div style={{ flex: 1 }}>
              <table className="costar-table-2col">
                <tbody>
                  <tr>
                    <td className="label-cell">RBA (% Leased)</td>
                    <td className="value-cell">
                      {rba ? `${fmt(rba)} SF` : '--'}
                      {pctLeased ? ` (${pctLeased}%)` : ''}
                    </td>
                    <td className="label-cell">Asking Rent</td>
                    <td className="value-cell">
                      {avgRate
                        ? `${formatCurrency(avgRate * 12)}/SF/Year`
                        : '--'}
                    </td>
                  </tr>
                  <tr>
                    <td className="label-cell">Built</td>
                    <td className="value-cell">{property.year_built ?? '--'}</td>
                    <td className="label-cell">Clear Height</td>
                    <td className="value-cell">
                      {property.clear_height_ft ? `${property.clear_height_ft}'` : '--'}
                    </td>
                  </tr>
                  <tr>
                    <td className="label-cell">Tenancy</td>
                    <td className="value-cell">
                      {allUnits.length <= 1 ? 'Single' : 'Multiple'}
                    </td>
                    <td className="label-cell">Drive Ins</td>
                    <td className="value-cell">{driveIns}</td>
                  </tr>
                  <tr>
                    <td className="label-cell">Available</td>
                    <td className="value-cell">{availRange}</td>
                    <td className="label-cell">Docks</td>
                    <td className="value-cell">{docks}</td>
                  </tr>
                  <tr>
                    <td className="label-cell">Max Contiguous</td>
                    <td className="value-cell">{maxContig ? `${fmt(maxContig)} SF` : '--'}</td>
                    <td className="label-cell">Levelers</td>
                    <td className="value-cell">
                      {property.levelers > 0 ? String(property.levelers) : 'None'}
                    </td>
                  </tr>
                  <tr>
                    <td className="label-cell">Parking Spaces</td>
                    <td className="value-cell">
                      {property.parking_spaces
                        ? `${property.parking_spaces}`
                        : '--'}
                      {property.parking_ratio
                        ? ` (${property.parking_ratio}/1,000 SF)`
                        : ''}
                    </td>
                    <td className="label-cell">&nbsp;</td>
                    <td className="value-cell">&nbsp;</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: Property photo */}
            {heroPhoto && (
              <div style={{ width: 240, flexShrink: 0 }}>
                <div style={{ position: 'relative', width: 240, height: 180, overflow: 'hidden', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                  <Image
                    src={heroPhoto}
                    alt={property.name}
                    fill
                    className="object-cover"
                    sizes="240px"
                    unoptimized
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* PRIMARY LEASING COMPANY                                          */}
        {/* ================================================================ */}
        {property.primary_leasing_company && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Primary Leasing Company:
            </p>
            <p style={{ fontSize: 11, color: '#475569', margin: '2px 0 0 0' }}>
              {property.primary_leasing_company}
            </p>
          </div>
        )}

        {/* ================================================================ */}
        {/* PROPERTY DETAILS TABLE                                           */}
        {/* ================================================================ */}
        <div style={{ marginBottom: 16 }}>
          <div className="section-title">Property Details</div>
          <table className="costar-table-2col" style={{ marginTop: 4 }}>
            <tbody>
              <tr>
                <td className="label-cell">Land Area</td>
                <td className="value-cell">{formatLandArea(property.land_area_sf)}</td>
                <td className="label-cell">Power</td>
                <td className="value-cell">{property.power ?? '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Building FAR</td>
                <td className="value-cell">{property.building_far ?? '--'}</td>
                <td className="label-cell">Zoning</td>
                <td className="value-cell">{property.zoning ?? '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Crane</td>
                <td className="value-cell">
                  {property.crane_capacity_tons
                    ? `${property.crane_capacity_tons} tons`
                    : 'None'}
                </td>
                <td className="label-cell">Parcel</td>
                <td className="value-cell">{property.parcel_number ?? '--'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ================================================================ */}
        {/* DESCRIPTION (if present)                                         */}
        {/* ================================================================ */}
        {property.description && (
          <div style={{ marginBottom: 16 }}>
            <div className="section-title">Description</div>
            <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, marginTop: 6 }}>
              {property.description}
            </p>
          </div>
        )}

        {/* ================================================================ */}
        {/* AVAILABLE SPACES TABLE                                           */}
        {/* ================================================================ */}
        {allUnits.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="section-title">Available Spaces</div>
            <table className="spaces-table" style={{ marginTop: 4 }}>
              <thead>
                <tr>
                  <th>Suite</th>
                  <th>Use</th>
                  <th>Type</th>
                  <th className="right">SF Available</th>
                  <th className="right">Building Contiguous</th>
                  <th className="right">Rent/SF/Year</th>
                  <th>Occupancy</th>
                  <th>Docks</th>
                  <th>Drive Ins</th>
                </tr>
              </thead>
              <tbody>
                {allUnits
                  .filter((u) => u.status === 'vacant')
                  .map((unit) => (
                    <tr key={unit.id}>
                      <td>{unit.suite_number}</td>
                      <td>{propertyTypeLabel}</td>
                      <td>Direct</td>
                      <td className="right">{fmt(unit.sf)}</td>
                      <td className="right">{fmt(unit.sf)}</td>
                      <td className="right">
                        {unit.marketing_rate
                          ? `${formatCurrency(unit.marketing_rate * 12)}`
                          : 'Withheld'}
                      </td>
                      <td>Vacant</td>
                      <td style={{ textAlign: 'center' }}>-</td>
                      <td style={{ textAlign: 'center' }}>-</td>
                    </tr>
                  ))}
                {allUnits.filter((u) => u.status === 'vacant').length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: '#94a3b8', padding: 12 }}>
                      No vacant spaces currently available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ================================================================ */}
        {/* FOOTER: Rocket Realty branding, date, QR code                    */}
        {/* ================================================================ */}
        <div
          style={{
            borderTop: '2px solid #cbd5e1',
            marginTop: 24,
            paddingTop: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left: Rocket Realty logo / branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Inline Rocket Realty "RR" mark */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              RR
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                Rocket Realty
              </p>
              <p style={{ fontSize: 10, color: '#64748b', margin: '1px 0 0 0' }}>
                Commercial Real Estate
              </p>
            </div>
          </div>

          {/* Center: Licensed text */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>
              Licensed to Rocket Realty
            </p>
          </div>

          {/* Right: QR code + date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            {/* QR Code */}
            <div style={{ textAlign: 'center' }}>
              {browseQr?.qr_image_url ? (
                <Image
                  src={browseQr.qr_image_url}
                  alt="QR Code"
                  width={56}
                  height={56}
                  unoptimized
                />
              ) : (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    border: '1px dashed #cbd5e1',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    viewBox="0 0 100 100"
                    style={{ width: 36, height: 36 }}
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="5" y="5" width="30" height="30" rx="2" fill="#94a3b8" />
                    <rect x="10" y="10" width="20" height="20" rx="1" fill="white" />
                    <rect x="14" y="14" width="12" height="12" rx="1" fill="#94a3b8" />
                    <rect x="65" y="5" width="30" height="30" rx="2" fill="#94a3b8" />
                    <rect x="70" y="10" width="20" height="20" rx="1" fill="white" />
                    <rect x="74" y="14" width="12" height="12" rx="1" fill="#94a3b8" />
                    <rect x="5" y="65" width="30" height="30" rx="2" fill="#94a3b8" />
                    <rect x="10" y="70" width="20" height="20" rx="1" fill="white" />
                    <rect x="14" y="74" width="12" height="12" rx="1" fill="#94a3b8" />
                    <rect x="40" y="40" width="8" height="8" fill="#94a3b8" />
                    <rect x="52" y="40" width="8" height="8" fill="#94a3b8" />
                    <rect x="65" y="52" width="8" height="8" fill="#94a3b8" />
                    <rect x="78" y="65" width="8" height="8" fill="#94a3b8" />
                    <rect x="65" y="78" width="8" height="8" fill="#94a3b8" />
                  </svg>
                </div>
              )}
              <p style={{ fontSize: 8, color: '#94a3b8', margin: '2px 0 0 0' }}>Scan to view</p>
            </div>

            {/* Date + page */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>{today}</p>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0 0' }}>Page 1</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
