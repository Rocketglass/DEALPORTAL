/**
 * GET /api/bills-in/[id]/preview
 *
 * Returns a short-lived signed URL for the bill's PDF so the broker UI
 * can render it inline. 5-minute expiry.
 *
 * Broker / admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const supabase = getServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bill } = await (supabase as any)
      .from('bills_in')
      .select('pdf_url')
      .eq('id', id)
      .maybeSingle();

    if (!bill?.pdf_url) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from('bills-in')
      .createSignedUrl(bill.pdf_url, 300); // 5 minutes

    if (signErr || !signed?.signedUrl) {
      console.error(`[GET /api/bills-in/${id}/preview] sign error:`, signErr);
      return NextResponse.json({ error: 'Failed to generate preview URL' }, { status: 500 });
    }
    return NextResponse.json({ url: signed.signedUrl });
  } catch (error) {
    console.error(`[GET /api/bills-in/${id}/preview] unexpected:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
