/**
 * Invoice detail page — Server Component.
 *
 * Fetches the commission invoice with its related lease, property, unit,
 * and broker data, enriches it with display fields, then hands off to
 * the Client Component for interactive actions (send, mark paid, download PDF).
 */

import { notFound } from 'next/navigation';
import { requireBrokerOrAdmin } from '@/lib/security/auth-guard';
import { getInvoiceWithDetail } from '@/lib/queries/invoices';
import InvoiceDetailClient from './invoice-detail-client';
import type { EnrichedInvoice } from './types';

export const dynamic = 'force-dynamic';

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  await requireBrokerOrAdmin();

  const { id } = await params;
  const { data, error } = await getInvoiceWithDetail(id);

  if (error || !data) {
    notFound();
  }

  // ------------------------------------------------------------------
  // Enrich the raw invoice with display-only fields derived from joins
  // ------------------------------------------------------------------
  const lease = data.lease;

  // Property address: prefer the property row, fall back to the lease's
  // denormalized premises_address field
  const propertyAddress =
    lease?.property?.address ?? lease?.premises_address ?? '';

  // Suite number from the unit join
  const suiteNumber = lease?.unit?.suite_number
    ? `Suite ${lease.unit.suite_number}`
    : '';

  // Broker display name
  const brokerContact = lease?.broker;
  const brokerName = brokerContact
    ? [brokerContact.first_name, brokerContact.last_name]
        .filter(Boolean)
        .join(' ') || brokerContact.company_name || 'Rocket Glass, CCIM'
    : 'Rocket Glass, CCIM';

  const brokerCompany = brokerContact?.company_name ?? 'Rocket Realty';

  // License number is not stored in the DB yet — use the known value
  const brokerLicense = 'DRE #01234567';

  const enrichedInvoice: EnrichedInvoice = {
    ...data,
    property_address: propertyAddress,
    suite_number: suiteNumber,
    broker_name: brokerName,
    broker_company: brokerCompany,
    broker_license: brokerLicense,
  };

  return <InvoiceDetailClient initialInvoice={enrichedInvoice} />;
}
