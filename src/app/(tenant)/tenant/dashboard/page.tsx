import { requireRole } from '@/lib/security/auth-guard';
import { getTenantApplications } from '@/lib/queries/tenant';
import { TenantDashboardClient } from './dashboard-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard | Tenant Portal',
};

export default async function TenantDashboardPage() {
  const user = await requireRole('tenant', 'tenant_agent', 'broker', 'admin');
  const isBroker = user.role === 'broker' || user.role === 'admin';

  // Agent delegation: agents view their principal's applications
  // Brokers/admins see all applications (null contactId skips the filter)
  const contactId = isBroker ? null : (user.principalId ?? user.contactId);

  if (!isBroker && !contactId) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Your account is not linked to a contact record yet. Please contact your broker.
          </p>
        </div>
      </div>
    );
  }

  let applications: Awaited<ReturnType<typeof getTenantApplications>>['data'] = null;
  let error: string | null = null;
  try {
    const result = await getTenantApplications(contactId);
    applications = result.data;
    error = result.error;
  } catch (err) {
    console.error('[TenantDashboard] Error:', err);
    error = err instanceof Error ? err.message : 'Failed to load applications';
  }

  if (error) {
    console.error('[TenantDashboard] Failed to fetch applications:', error);
  }

  return <TenantDashboardClient applications={applications ?? []} />;
}
