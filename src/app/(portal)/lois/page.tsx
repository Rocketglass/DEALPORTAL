import { getLois } from '@/lib/queries/lois';
import { LoisClient } from './lois-client';

export const dynamic = 'force-dynamic';

export default async function LoisPage() {
  const { data: lois, error } = await getLois();

  return <LoisClient lois={lois ?? []} error={error} />;
}
