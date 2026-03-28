import { requireRole } from '@/lib/security/auth-guard';
import { getLandlordApplications, getEffectiveContactId } from '@/lib/queries/landlord';
import { ApplicationsClient } from './applications-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Applications | Landlord Portal',
};

export default async function LandlordApplicationsPage() {
  const user = await requireRole('landlord', 'landlord_agent', 'broker', 'admin');
  const contactId = getEffectiveContactId(user);
  const { data: applications, error } = await getLandlordApplications(contactId);

  return (
    <ApplicationsClient
      applications={applications ?? []}
      error={error}
    />
  );
}
