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
    .select('id, property_id, unit_id, portal_url, is_active')
    .eq('short_code', shortCode)
    .single();

  if (!qrCode || !qrCode.is_active) notFound();

  // Atomic increment of scan_count — use RPC if available, fallback to update
  const { error: rpcError } = await supabase.rpc('increment_qr_scan', { qr_id: qrCode.id });
  if (rpcError) {
    // Fallback: direct update if RPC doesn't exist yet
    void supabase
      .from('qr_codes')
      .update({ last_scanned_at: new Date().toISOString() })
      .eq('id', qrCode.id)
      .then(() => {});
  }

  // Track the QR scan as a property view (fire-and-forget)
  void supabase
    .from('property_views')
    .insert({ property_id: qrCode.property_id, source: 'qr_scan' })
    .then(() => {});

  // Redirect to the unified application form with property pre-selected
  const targetUrl = qrCode.property_id
    ? `/apply?property=${qrCode.property_id}`
    : '/apply';
  redirect(targetUrl);
}
