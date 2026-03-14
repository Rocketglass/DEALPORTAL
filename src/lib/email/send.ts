/**
 * Core email sending utility using the Resend SDK.
 *
 * Errors are logged but never thrown — email failures should never
 * block business logic in the portal.
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[email] Resend returned an error:', error);
    }
  } catch (err) {
    console.error('[email] Failed to send email:', err);
  }
}
