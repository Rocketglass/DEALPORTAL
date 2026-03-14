import { getApplications } from '@/lib/queries/applications';
import { ApplicationsClient } from './applications-client';

export const dynamic = 'force-dynamic';

export default async function ApplicationsPage() {
  const { data: applications, error } = await getApplications();

  return (
    <ApplicationsClient
      applications={applications ?? []}
      error={error}
    />
  );
}
