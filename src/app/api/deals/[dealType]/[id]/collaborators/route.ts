/**
 * GET  /api/deals/[dealType]/[id]/collaborators — list collaborators (broker only)
 * POST /api/deals/[dealType]/[id]/collaborators — invite a lawyer (broker only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { sendEmail } from '@/lib/email/send';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const VALID_DEAL_TYPES = ['loi', 'lease'] as const;
const VALID_ROLES = ['landlord_lawyer', 'tenant_lawyer'] as const;

interface RouteContext {
  params: Promise<{ dealType: string; id: string }>;
}

// ----------------------------------------------------------------
// GET — list collaborators
// ----------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();
  } catch (authError) {
    return NextResponse.json(
      { error: (authError as Error).message },
      { status: 401 },
    );
  }

  const { dealType, id: dealId } = await context.params;

  if (!VALID_DEAL_TYPES.includes(dealType as typeof VALID_DEAL_TYPES[number])) {
    return NextResponse.json({ error: 'Invalid deal type' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('deal_collaborators')
    .select('id, deal_type, deal_id, role, name, email, invited_at, revoked_at, last_accessed_at')
    .eq('deal_type', dealType)
    .eq('deal_id', dealId)
    .order('invited_at', { ascending: false });

  if (error) {
    console.error('[GET /api/deals/.../collaborators] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ collaborators: data });
}

// ----------------------------------------------------------------
// POST — invite a lawyer
// ----------------------------------------------------------------

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  let user;
  try {
    user = await requireBrokerOrAdminForApi();
  } catch (authError) {
    return NextResponse.json(
      { error: (authError as Error).message },
      { status: 401 },
    );
  }

  const { dealType, id: dealId } = await context.params;

  if (!VALID_DEAL_TYPES.includes(dealType as typeof VALID_DEAL_TYPES[number])) {
    return NextResponse.json({ error: 'Invalid deal type' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, email, role } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'name, email, and role are required' },
        { status: 400 },
      );
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 },
      );
    }

    const supabase = getServiceClient();

    // Check limit: max 2 active collaborators per deal (one per role)
    const { data: existing } = await supabase
      .from('deal_collaborators')
      .select('id, role')
      .eq('deal_type', dealType)
      .eq('deal_id', dealId)
      .eq('role', role)
      .is('revoked_at', null);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: `A ${role.replace('_', ' ')} is already assigned to this deal. Revoke the existing one first.` },
        { status: 409 },
      );
    }

    // Generate a unique access token
    const accessToken = randomBytes(32).toString('hex');

    const { data: collaborator, error: insertError } = await supabase
      .from('deal_collaborators')
      .insert({
        deal_type: dealType,
        deal_id: dealId,
        role,
        name,
        email,
        access_token: accessToken,
        invited_by: user.id,
      })
      .select('id, deal_type, deal_id, role, name, email, invited_at')
      .single();

    if (insertError) {
      console.error('[POST /api/deals/.../collaborators] Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Send invitation email (non-fatal)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.rocketrealty.com';
      const reviewUrl = `${baseUrl}/review/${dealType}/${dealId}?token=${accessToken}`;
      const dealLabel = dealType === 'loi' ? 'Letter of Intent' : 'Lease Agreement';
      const roleLabel = role === 'landlord_lawyer' ? "Landlord's Attorney" : "Tenant's Attorney";

      await sendEmail({
        to: email,
        subject: `Rocket Realty — You've been invited to review a ${dealLabel}`,
        html: `
          <div style="font-family: Inter, -apple-system, sans-serif; max-width: 560px; margin: 0 auto;">
            <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 8px;">Review Invitation</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              Hello ${name},
            </p>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              You have been invited as <strong>${roleLabel}</strong> to review and comment on a
              ${dealLabel} in the Rocket Realty Portal.
            </p>
            <p style="margin: 24px 0;">
              <a href="${reviewUrl}"
                 style="display: inline-block; padding: 10px 24px; background: #1e40af; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
                Open ${dealLabel}
              </a>
            </p>
            <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
              This link gives you view and comment access only. Do not share it with others.
              If you have questions, contact the broker who sent this invitation.
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('[POST /api/deals/.../collaborators] Email failed (non-fatal):', emailErr);
    }

    return NextResponse.json({ collaborator }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[POST /api/deals/.../collaborators] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
