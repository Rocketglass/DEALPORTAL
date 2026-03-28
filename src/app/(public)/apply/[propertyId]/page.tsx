import { redirect } from 'next/navigation';

export default async function PropertyApplyRedirect({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  redirect(`/apply?property=${propertyId}`);
}
