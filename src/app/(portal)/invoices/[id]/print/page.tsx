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
import { enrichInvoice } from '../types';

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

  return <InvoicePrintClient invoice={enrichInvoice(data)} />;
}
