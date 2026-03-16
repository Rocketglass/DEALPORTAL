/**
 * POST /api/webhooks/resend
 *
 * Receives delivery-status webhooks from Resend and updates the
 * corresponding row in the `email_logs` table.
 *
 * Verifies the webhook signature using RESEND_WEBHOOK_SECRET.
 * Always returns 200 so Resend does not retry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

/**
 * Verify Resend webhook signature (svix-based).
 * Returns true if the signature is valid or if no secret is configured (dev).
 */
function verifyWebhookSignature(
  payload: string,
  headers: {
    svixId: string | null;
    svixTimestamp: string | null;
    svixSignature: string | null;
  },
): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  // Fail closed: reject if webhook secret is not configured
  if (!secret) {
    console.warn('[Resend webhook] RESEND_WEBHOOK_SECRET not set — rejecting webhook');
    return false;
  }

  const { svixId, svixTimestamp, svixSignature } = headers;
  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  // Check timestamp is within 5 minutes to prevent replay attacks
  const timestampSec = parseInt(svixTimestamp, 10);
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestampSec) > 300) {
    return false;
  }

  // Decode the secret (base64-encoded with "whsec_" prefix)
  const secretBytes = Buffer.from(
    secret.startsWith('whsec_') ? secret.slice(6) : secret,
    'base64',
  );

  // Build the signature content
  const signatureContent = `${svixId}.${svixTimestamp}.${payload}`;
  const expectedSignature = createHmac('sha256', secretBytes)
    .update(signatureContent)
    .digest('base64');

  // Check if any of the provided signatures match
  const signatures = svixSignature.split(' ');
  for (const sig of signatures) {
    const sigValue = sig.startsWith('v1,') ? sig.slice(3) : sig;
    try {
      const sigBuf = Buffer.from(sigValue, 'base64');
      const expectedBuf = Buffer.from(expectedSignature, 'base64');
      if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.text();

    // Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, {
      svixId: request.headers.get('svix-id'),
      svixTimestamp: request.headers.get('svix-timestamp'),
      svixSignature: request.headers.get('svix-signature'),
    });

    if (!isValid) {
      console.error('[Resend webhook] Invalid signature — rejecting');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
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
