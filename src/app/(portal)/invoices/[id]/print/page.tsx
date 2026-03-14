/**
 * Invoice print page — Server Component wrapper.
 *
 * Fetches real invoice data and passes it to the Client Component that
 * handles the print layout and window.print() trigger.
 */

import { notFound } from 'next/navigation';
import { requireBrokerOrAdmin } from '@/lib/security/auth-guard';
import { getInvoiceWithDetail } from '@/lib/queries/invoices';
import InvoicePrintClient from './print-client';
import type { EnrichedInvoice } from '../types';

export const dynamic = 'force-dynamic';

interface InvoicePrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoicePrintPage({
  params,
}: InvoicePrintPageProps) {
  await requireBrokerOrAdmin();

  const { id } = await params;
  const { data, error } = await getInvoiceWithDetail(id);

  if (error || !data) {
    notFound();
  }

  // ------------------------------------------------------------------
  // Enrich with display fields (same logic as the detail page)
  // ------------------------------------------------------------------
  const lease = data.lease;

  const propertyAddress =
    lease?.property?.address ?? lease?.premises_address ?? '';

  const suiteNumber = lease?.unit?.suite_number
    ? `Suite ${lease.unit.suite_number}`
    : '';

  const brokerContact = lease?.broker;
  const brokerName = brokerContact
    ? [brokerContact.first_name, brokerContact.last_name]
        .filter(Boolean)
        .join(' ') || brokerContact.company_name || 'Rocket Glass, CCIM'
    : 'Rocket Glass, CCIM';

  const brokerCompany = brokerContact?.company_name ?? 'Rocket Realty';
  const brokerLicense = 'DRE #01234567';

  const enrichedInvoice: EnrichedInvoice = {
    ...data,
    property_address: propertyAddress,
    suite_number: suiteNumber,
    broker_name: brokerName,
    broker_company: brokerCompany,
    broker_license: brokerLicense,
  };

  return <InvoicePrintClient invoice={enrichedInvoice} />;
}
