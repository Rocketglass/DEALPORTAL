/**
 * LOI print page — Server Component wrapper.
 *
 * Fetches the LOI data and passes it to the Client Component that
 * handles the print layout and window.print() trigger.
 */

import { notFound } from 'next/navigation';
import { requireBrokerOrAdmin } from '@/lib/security/auth-guard';
import { getLoi } from '@/lib/queries/lois';
import LoiPrintClient from './print-client';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LoiPrintPage({ params }: Props) {
  await requireBrokerOrAdmin();

  const { id } = await params;
  const { data: loi, error } = await getLoi(id);

  if (error || !loi) {
    notFound();
  }

  return <LoiPrintClient loi={loi} />;
}
