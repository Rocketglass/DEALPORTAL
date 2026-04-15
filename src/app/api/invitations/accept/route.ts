import { NextResponse, type NextRequest } from 'next/server';
import { requireAuthForApi } from '@/lib/security/auth-guard';

/**
 * GET /api/invitations/accept?token=XXX
 *
 * Public endpoint (no auth required). Looks up an invitation by token
 * and returns its details so the /invite page can display them.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Missing token parameter' },
      { status: 400 },
    );
  }

  try {
    const { createClient } = await import('@/lib/supabase/service');
    // Cast to any — invitations table type may not yet be in the Database type definition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;

    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('id, email, role, status, expires_at, invited_by')
      .eq('token', token)
      .single() as { data: { id: string; email: string; role: string; status: string; expires_at: string | null; invited_by: string | null } | null; error: unknown };

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or invalid token' },
        { status: 404 },
      );
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 410 },
      );
    }

    // Check if expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 },
      );
    }

    // Check if revoked
    if (invitation.status === 'revoked') {
      return NextResponse.json(
        { error: 'This invitation has been revoked' },
        { status: 410 },
      );
    }

    // Optionally look up the inviter's name
    let inviterName: string | null = null;
    if (invitation.invited_by) {
      const { data: inviter } = await supabase
        .from('users')
        .select('email')
        .eq('auth_provider_id', invitation.invited_by)
        .single() as { data: { email: string } | null };
      inviterName = inviter?.email ?? null;
    }

    return NextResponse.json({
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expires_at: invitation.expires_at,
      inviter: inviterName,
    });
  } catch (err) {
    console.error('[Invitations Accept] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/invitations/accept
 *
 * Authenticated endpoint — accepts an invitation for the currently logged-in user.
 * Used when an existing user logs in via the invitation flow (they already have a
 * session, so they don't go through the auth callback code exchange).
 *
 * Body: { token: string }
 *
 * Returns: { redirect: string } — the URL to redirect to based on the invitation role.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuthForApi();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Missing invitation token' },
        { status: 400 },
      );
    }

    const { createClient } = await import('@/lib/supabase/service');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any;

    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('id, role, principal_id, contact_id, deal_id, status, expires_at')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found, already accepted, or expired' },
        { status: 404 },
      );
    }

    // Check expiry
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 },
      );
    }

    // Look up the auth user ID for the current user
    const { createClient: createServerClient } = await import('@/lib/supabase/server');
    const serverSupabase = await createServerClient();
    const { data: { user: authUser } } = await serverSupabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update user with invitation role and principal_id (for agents)
    await supabase
      .from('users')
      .update({
        role: invitation.role,
        contact_id: invitation.contact_id,
        principal_id: invitation.principal_id || null,
      })
      .eq('auth_provider_id', authUser.id);

    // Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: authUser.id,
      })
      .eq('id', invitation.id);

    // Determine redirect based on role
    const roleRedirects: Record<string, string> = {
      landlord: '/landlord/dashboard',
      landlord_agent: '/landlord/dashboard',
      tenant: '/tenant/dashboard',
      tenant_agent: '/tenant/dashboard',
      broker: '/dashboard',
      admin: '/dashboard',
    };

    const redirect = roleRedirects[invitation.role] || '/dashboard';

    return NextResponse.json({ redirect });
  } catch (err) {
    console.error('[Invitations Accept POST] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
