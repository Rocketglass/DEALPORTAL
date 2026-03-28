import { NextResponse } from 'next/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { sendInvitation } from '@/lib/invitations/send-invitation';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/invitations — List all invitations (broker/admin only)
 */
export async function GET() {
  try {
    await requireBrokerOrAdminForApi();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 500 });
    }

    const supabase = createClient(url, key);
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invitations });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/**
 * POST /api/invitations — Create and send an invitation (broker/admin only)
 *
 * Body: { email: string, role: InvitableRole, contactId?: string, principalId?: string, dealId?: string }
 */
export async function POST(request: Request) {
  try {
    const user = await requireBrokerOrAdminForApi();
    const body = await request.json();

    const { email, role, contactId, principalId, dealId } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: 'email and role are required' },
        { status: 400 },
      );
    }

    const validRoles = ['landlord', 'landlord_agent', 'tenant', 'tenant_agent', 'broker'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 },
      );
    }

    // Agent roles require a principalId
    if ((role === 'landlord_agent' || role === 'tenant_agent') && !principalId) {
      return NextResponse.json(
        { error: 'principalId is required for agent roles' },
        { status: 400 },
      );
    }

    const result = await sendInvitation({
      email,
      role,
      contactId: contactId || null,
      principalId: principalId || null,
      dealId: dealId || null,
      invitedByUserId: user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(
      { id: result.invitationId, message: 'Invitation sent' },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
