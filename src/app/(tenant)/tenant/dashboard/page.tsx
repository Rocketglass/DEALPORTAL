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

  const { data: applications, error } = await getTenantApplications(contactId);

  if (error) {
    console.error('[TenantDashboard] Failed to fetch applications:', error);
  }

  return <TenantDashboardClient applications={applications ?? []} />;
}
