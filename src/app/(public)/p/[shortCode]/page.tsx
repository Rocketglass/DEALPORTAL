import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function QrRedirectPage({
  params,
}: {
  params: Promise<{ shortCode: string }>;
}) {
  const { shortCode } = await params;
  const supabase = await createClient();

  const { data: qrCode } = await supabase
    .from('qr_codes')
    .select('id, property_id, unit_id, portal_url, is_active, scan_count')
    .eq('short_code', shortCode)
    .single();

  if (!qrCode || !qrCode.is_active) notFound();

  // Increment scan count and update last scanned timestamp
  await supabase
    .from('qr_codes')
    .update({
      scan_count: (qrCode.scan_count ?? 0) + 1,
      last_scanned_at: new Date().toISOString(),
    })
    .eq('id', qrCode.id);

  // Track the QR scan as a property view (fire-and-forget)
  supabase
    .from('property_views')
    .insert({ property_id: qrCode.property_id, source: 'qr_scan' })
    .then(() => {});

  redirect(qrCode.portal_url);
}
