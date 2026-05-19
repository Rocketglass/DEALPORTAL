import { requireBrokerOrAdmin } from '@/lib/security/auth-guard';
import { createClient } from '@/lib/supabase/service';
import { BillsInClient, type Bill } from './bills-in-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Bills In | Rocket Realty',
};

export default async function BillsInPage() {
  await requireBrokerOrAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from('bills_in')
    .select('id, vendor_name, amount, pdf_url, payment_url, paid, paid_at, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[bills-in/page] query error:', error);
  }

  return <BillsInClient initialBills={(data ?? []) as Bill[]} />;
}
