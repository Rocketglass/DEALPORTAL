/**
 * Lease print page — Server Component wrapper.
 *
 * Fetches the lease data with all relations and rent escalations,
 * then passes it to the Client Component for print layout rendering.
 */

import { notFound } from 'next/navigation';
import { requireBrokerOrAdmin } from '@/lib/security/auth-guard';
import { getLease } from '@/lib/queries/leases';
import LeasePrintClient from './print-client';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LeasePrintPage({ params }: Props) {
  await requireBrokerOrAdmin();

  const { id } = await params;
  const { data: lease, error } = await getLease(id);

  if (error || !lease) {
    notFound();
  }

  return <LeasePrintClient lease={lease} />;
}
