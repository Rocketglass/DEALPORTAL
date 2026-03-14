import { getLeases } from '@/lib/queries/leases';
import { LeasesClient } from './leases-client';

export const dynamic = 'force-dynamic';

export default async function LeasesPage() {
  const { data: leases, error } = await getLeases();

  return <LeasesClient leases={leases ?? []} error={error} />;
}
