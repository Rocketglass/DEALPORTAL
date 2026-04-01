import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/security/auth-guard';
import { getTenantApplication } from '@/lib/queries/tenant';
import { ApplicationDetailClient } from './application-detail-client';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TenantApplicationDetailPage({ params }: Props) {
  const { id } = await params;

  const user = await requireRole('tenant', 'tenant_agent', 'broker', 'admin');
  const isBroker = user.role === 'broker' || user.role === 'admin';
  const contactId = isBroker ? null : (user.principalId ?? user.contactId);

  let application: Awaited<ReturnType<typeof getTenantApplication>>['data'] = null;
  let error: string | null = null;
  try {
    const result = await getTenantApplication(id, contactId);
    application = result.data;
    error = result.error;
  } catch (err) {
    console.error('[TenantApplicationDetail] Error:', err);
    error = err instanceof Error ? err.message : 'Failed to load application';
  }

  if (error || !application) {
    notFound();
  }

  return <ApplicationDetailClient application={application} />;
}
