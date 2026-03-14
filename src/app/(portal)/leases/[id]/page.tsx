import { notFound } from 'next/navigation';
import { getLease } from '@/lib/queries/leases';
import LeaseDetailClient from './lease-detail-client';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LeaseDetailPage({ params }: Props) {
  const { id } = await params;
  const { data: lease, error } = await getLease(id);

  if (error || !lease) {
    notFound();
  }

  const escalations = lease.escalations ?? [];

  return <LeaseDetailClient lease={lease} escalations={escalations} />;
}
