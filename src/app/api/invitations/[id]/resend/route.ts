import { NextResponse } from 'next/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

/**
 * POST /api/invitations/:id/resend — Resend an invitation email
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireBrokerOrAdminForApi();
    const { id } = await params;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 500 });
    }

    const supabase = createClient(url, key);
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', id)
      .eq('status', 'pending')
      .single();

    if (error || !invitation) {
      return NextResponse.json({ error: 'Invitation not found or already used' }, { status: 404 });
    }

    // Always generate a new token on resend to invalidate the old one
    const newToken = randomBytes(32).toString('hex');
    const isExpired = new Date(invitation.expires_at) < new Date();
    const newExpiry = isExpired
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : invitation.expires_at;

    await supabase
      .from('invitations')
      .update({ token: newToken, expires_at: newExpiry, updated_at: new Date().toISOString() })
      .eq('id', id);

    // Resend email with the new token
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || url.replace('.supabase.co', '.vercel.app');
    const inviteUrl = `${appUrl}/invite?token=${newToken}`;

    try {
      const { sendEmail } = await import('@/lib/email/send');
      const roleLabel = invitation.role.replace('_', ' ');

      await sendEmail({
        to: invitation.email,
        subject: "Reminder: You've been invited to Rocket Realty Portal",
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">Reminder: You're invited to Rocket Realty Portal</h2>
            <p>You've been invited to join the Rocket Realty Deal Flow Portal as a <strong>${roleLabel}</strong>.</p>
            <p>Click the button below to create your account and get started:</p>
            <a href="${inviteUrl}" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Accept Invitation</a>
            <p style="color: #64748b; font-size: 14px; margin-top: 24px;">This invitation expires in 7 days.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('[Invitations] Failed to resend email:', emailError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Invitation resent' });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
