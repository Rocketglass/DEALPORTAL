import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdmin } from '@/lib/security/auth-guard';
import { CompsClient } from './comps-client';
import type { ComparableTransaction } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function CompsPage() {
  await requireBrokerOrAdmin();

  let comps: ComparableTransaction[] = [];
  let error: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error: queryError } = await supabase
      .from('comparable_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (queryError) throw queryError;
    comps = (data as ComparableTransaction[]) ?? [];
  } catch (err) {
    console.error('CompsPage error:', err);
    error = (err as Error).message;
  }

  return <CompsClient comps={comps} error={error} />;
}
