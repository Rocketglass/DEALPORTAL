/**
 * Core email sending utility using the Resend SDK.
 *
 * Errors are logged but never thrown — email failures should never
 * block business logic in the portal.
 *
 * Every send attempt is logged to the `email_logs` table via a
 * fire-and-forget insert so logging never blocks or breaks sends.
 */

import { Resend } from 'resend';
import { createClient as createServiceClient } from '@supabase/supabase-js';

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key);
}

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? 'notifications@rocketrealty.com';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailOptions): Promise<void> {
  const client = getResend();
  if (!client) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send');
    return;
  }

  let error: { message: string } | null = null;
  let data: { id: string } | null = null;

  try {
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    error = result.error;
    data = result.data;

    if (error) {
      console.error('[email] Resend returned an error:', error);
    }
  } catch (err) {
    console.error('[email] Failed to send email:', err);
    error = { message: err instanceof Error ? err.message : String(err) };
  }

  // Fire-and-forget: log the send attempt — never block or break the send
  void (async () => {
    try {
      const db = getServiceClient();
      if (!db) return;
      await db.from('email_logs').insert({
        recipient: Array.isArray(to) ? to.join(', ') : to,
        subject,
        status: error ? 'failed' : 'sent',
        error_message: error?.message ?? null,
        resend_id: data?.id ?? null,
      });
    } catch { /* silent */ }
  })();
}
