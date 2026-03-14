/**
 * Property detail page — Server Component.
 *
 * Fetches the property and its units from Supabase, then passes the data
 * to the PropertyDetailClient component for interactive editing.
 *
 * QR codes are fetched separately. If not available they fall back to [].
 */

import { notFound } from 'next/navigation';
import { requireBrokerOrAdmin } from '@/lib/security/auth-guard';
import { getProperty } from '@/lib/queries/properties';
import { getQrCodesByProperty } from '@/lib/queries/qr-codes';
import PropertyDetailClient from './property-detail-client';
import type { Unit } from '@/types/database';

export const dynamic = 'force-dynamic';

interface PropertyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  await requireBrokerOrAdmin();

  const { id } = await params;

  const { data: propertyWithUnits, error } = await getProperty(id);

  if (error || !propertyWithUnits) {
    notFound();
  }

  const { units: rawUnits, ...property } = propertyWithUnits;

  // Enrich units with tenant names from active leases.
  // The units table doesn't store tenant names directly — that lives on the
  // lease/contact join. For now we pass units without tenant names; the unit
  // rows themselves contain all the data the editor needs.
  const units: (Unit & { tenantName?: string })[] = (rawUnits ?? []).map((u) => ({
    ...u,
    tenantName: undefined,
  }));

  // Fetch QR codes (non-fatal if the query fails)
  const qrResult = await getQrCodesByProperty(id);
  const qrCodes = qrResult.data;

  return (
    <PropertyDetailClient
      initialProperty={property}
      initialUnits={units}
      initialQrCodes={qrCodes ?? []}
    />
  );
}
