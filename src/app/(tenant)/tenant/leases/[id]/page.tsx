import { requireRole } from '@/lib/security/auth-guard';
import { BackButton } from '@/components/ui/back-button';
import { LeaseNegotiationView } from '@/components/lease/lease-negotiation-view';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TenantLeaseDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireRole('tenant', 'tenant_agent', 'broker', 'admin');

  return (
    <div className="p-6 lg:p-8">
      <BackButton href="/tenant/dashboard" label="Back to Dashboard" className="mb-6" />
      <LeaseNegotiationView
        leaseId={id}
        callerRole={user.role}
        portalBasePath="/tenant/leases"
      />
    </div>
  );
}
