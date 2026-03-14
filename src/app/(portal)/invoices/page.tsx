import { getInvoices } from '@/lib/queries/invoices';
import { InvoicesClient } from './invoices-client';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const { data: invoices, error } = await getInvoices();

  return <InvoicesClient invoices={invoices ?? []} error={error} />;
}
