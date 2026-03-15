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
import { enrichInvoice } from './types';

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

  return <InvoiceDetailClient initialInvoice={enrichInvoice(data)} />;
}
