import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/security/auth-guard';
import { getLandlordApplication, getEffectiveContactId } from '@/lib/queries/landlord';
import { ApplicationDetailClient } from './application-detail-client';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LandlordApplicationDetailPage({ params }: Props) {
  const { id } = await params;

  const user = await requireRole('landlord', 'landlord_agent', 'broker', 'admin');
  const isBroker = user.role === 'broker' || user.role === 'admin';
  const contactId = isBroker ? null : getEffectiveContactId(user);

  let application: Awaited<ReturnType<typeof getLandlordApplication>>['data'] = null;
  let error: string | null = null;
  try {
    const result = await getLandlordApplication(id, contactId);
    application = result.data;
    error = result.error;
  } catch (err) {
    console.error('[LandlordApplicationDetail] Error:', err);
    error = err instanceof Error ? err.message : 'Failed to load application';
  }

  if (error || !application) {
    notFound();
  }

  return <ApplicationDetailClient application={application} />;
}
