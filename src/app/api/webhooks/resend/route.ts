/**
 * POST /api/webhooks/resend
 *
 * Receives delivery-status webhooks from Resend and updates the
 * corresponding row in the `email_logs` table.
 *
 * Always returns 200 so Resend does not retry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { type, data } = body;

    // Resend webhook event types we care about
    const eventMap: Record<string, string> = {
      'email.delivered': 'delivered',
      'email.bounced': 'bounced',
      'email.complained': 'complained',
      'email.delivery_delayed': 'delayed',
    };

    const status = eventMap[type];
    if (!status || !data?.email_id) {
      return NextResponse.json({ received: true });
    }

    const supabase = getServiceClient();

    // Update existing log entry by resend_id, or insert a new one
    const { data: existing } = await supabase
      .from('email_logs')
      .select('id')
      .eq('resend_id', data.email_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('email_logs')
        .update({
          status,
          bounce_type: data.bounce?.type ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('email_logs').insert({
        recipient: Array.isArray(data.to) ? data.to.join(', ') : (data.to ?? ''),
        subject: data.subject ?? '',
        status,
        resend_id: data.email_id,
        bounce_type: data.bounce?.type ?? null,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Resend webhook] Error:', error);
    return NextResponse.json({ received: true }); // Always 200 to prevent retries
  }
}
