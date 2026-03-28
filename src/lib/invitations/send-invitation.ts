import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import type { InvitableRole } from '@/types/database';

interface SendInvitationParams {
  email: string;
  role: InvitableRole;
  contactId?: string | null;
  principalId?: string | null;
  dealId?: string | null;
  invitedByUserId: string;
}

interface SendInvitationResult {
  success: boolean;
  invitationId?: string;
  token?: string;
  error?: string;
}

/**
 * Create an invitation record and send the invitation email.
 * Uses the service-role client to bypass RLS for insertion.
 */
export async function sendInvitation(params: SendInvitationParams): Promise<SendInvitationResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return { success: false, error: 'Supabase service role not configured' };
  }

  const supabase = createClient(url, key);
  const token = randomBytes(32).toString('hex'); // 64 char hex token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  // Create invitation record
  const { data: invitation, error: insertError } = await supabase
    .from('invitations')
    .insert({
      token,
      email: params.email,
      role: params.role,
      contact_id: params.contactId || null,
      principal_id: params.principalId || null,
      deal_id: params.dealId || null,
      invited_by: params.invitedByUserId,
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (insertError || !invitation) {
    console.error('[Invitations] Failed to create invitation:', insertError?.message);
    return { success: false, error: insertError?.message || 'Failed to create invitation' };
  }

  // Build the invitation accept URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || url.replace('.supabase.co', '.vercel.app');
  const inviteUrl = `${appUrl}/invite?token=${token}`;

  // Send email using existing email infrastructure
  // Import sendEmail dynamically to avoid circular deps
  try {
    const { sendEmail } = await import('@/lib/email/send');
    const roleLabel = params.role.replace('_', ' ');

    await sendEmail({
      to: params.email,
      subject: "You've been invited to Rocket Realty Portal",
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">You're invited to Rocket Realty Portal</h2>
          <p>You've been invited to join the Rocket Realty Deal Flow Portal as a <strong>${roleLabel}</strong>.</p>
          <p>Click the button below to create your account and get started:</p>
          <a href="${inviteUrl}" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Accept Invitation</a>
          <p style="color: #64748b; font-size: 14px; margin-top: 24px;">This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (emailError) {
    // Log but don't fail — the invitation record was created successfully.
    // Broker can resend the email later.
    console.error('[Invitations] Failed to send email:', emailError);
  }

  return { success: true, invitationId: invitation.id, token };
}
