import { NextResponse, type NextRequest } from 'next/server';

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

    // Log token prefix for debugging (never log full token in production)
    console.log('[Invitations Accept] Looking up token prefix:', token.substring(0, 20));

    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('id, email, role, status, expires_at, invited_by')
      .eq('token', token)
      .single() as { data: { id: string; email: string; role: string; status: string; expires_at: string | null; invited_by: string | null } | null; error: unknown };

    if (error || !invitation) {
      console.error('[Invitations Accept] Token lookup failed:', {
        tokenPrefix: token.substring(0, 20),
        tokenLength: token.length,
        error: error,
        hasData: !!invitation,
      });

      // Debug: count total invitations to verify table access
      const { count } = await supabase
        .from('invitations')
        .select('*', { count: 'exact', head: true }) as { count: number | null };
      console.error('[Invitations Accept] Total invitations in table:', count);

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
