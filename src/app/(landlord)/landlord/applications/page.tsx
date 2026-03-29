import { requireRole } from '@/lib/security/auth-guard';
import { getLandlordApplications, getEffectiveContactId } from '@/lib/queries/landlord';
import { ApplicationsClient } from './applications-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Applications | Landlord Portal',
};

export default async function LandlordApplicationsPage() {
  const user = await requireRole('landlord', 'landlord_agent', 'broker', 'admin');
  const isBroker = user.role === 'broker' || user.role === 'admin';
  const contactId = isBroker ? null : getEffectiveContactId(user);

  let applications: Awaited<ReturnType<typeof getLandlordApplications>>['data'] = null;
  let error: string | null = null;
  try {
    const result = await getLandlordApplications(contactId);
    applications = result.data;
    error = result.error;
  } catch (err) {
    console.error('[LandlordApplications] Error:', err);
    error = err instanceof Error ? err.message : 'Failed to load applications';
  }

  return (
    <ApplicationsClient
      applications={applications ?? []}
      error={error}
    />
  );
}
