import { notFound } from 'next/navigation';
import { getApplication } from '@/lib/queries/applications';
import { ApplicationReviewClient } from './application-review-client';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ApplicationReviewPage({ params }: Props) {
  const { id } = await params;
  const { data: application, error } = await getApplication(id);

  if (error || !application) {
    notFound();
  }

  return <ApplicationReviewClient application={application} />;
}
