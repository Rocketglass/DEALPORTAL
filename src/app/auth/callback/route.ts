import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth / email-confirmation callback handler.
 *
 * Supabase redirects here after:
 *  - A user clicks the email confirmation link after registration
 *  - Any OAuth provider flow (Google, etc.) completes
 *
 * What this does:
 *  1. Exchanges the one-time `code` for a session
 *  2. Upserts a row in the public `users` table so the app always has a record
 *  3. Redirects to /dashboard on success, /login?error=... on failure
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  // Optional: honour a ?next= param for deep-link redirects
  const next = searchParams.get('next') ?? '/dashboard';
  const invitationToken = searchParams.get('invitation');

  if (!code) {
    // No code in the URL — something went wrong upstream
    return NextResponse.redirect(
      `${origin}/login?error=missing_code`,
    );
  }

  try {
    const supabase = await createClient();

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[Auth Callback] exchangeCodeForSession error:', exchangeError.message);
      return NextResponse.redirect(
        `${origin}/login?error=confirmation_failed`,
      );
    }

    // Fetch the now-authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Ensure a public.users row exists for this auth user.
      // We use upsert so it's idempotent — safe to call on every confirmation,
      // including OAuth logins and re-sent confirmation emails.
      const { error: upsertError } = await supabase
        .from('users')
        .upsert(
          {
            auth_provider_id: user.id,
            email: user.email ?? '',
            role: 'pending', // New registrations get 'pending' — admin must promote to 'broker'/'admin'
            is_active: true,
          },
          {
            // If a row already exists for this auth user, skip — don't overwrite
            // any fields that may have been updated elsewhere (e.g. role change).
            onConflict: 'auth_provider_id',
            ignoreDuplicates: true,
          },
        );

      if (upsertError) {
        // Log but don't block — the session is valid; a failed user record
        // creation should not prevent the authenticated user from reaching
        // the dashboard. This will surface in server logs for investigation.
        console.error('[Auth Callback] users upsert error:', upsertError.message);
      }
    }

    // If this is a password recovery flow, redirect to the reset-password page
    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/reset-password`);
    }

    // If an invitation token is present, look up the invitation and assign the correct role.
    // This runs AFTER the initial upsert (which creates a 'pending' row if new).
    // Note: the invitations table type is added in plan 03-03; casting to any until then.
    if (user && invitationToken) {
      const { createClient: createServiceClient } = await import('@/lib/supabase/service');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const serviceSupabase = (await createServiceClient()) as any;

      const { data: invitation } = await serviceSupabase
        .from('invitations')
        .select('id, role, principal_id, contact_id, deal_id, status')
        .eq('token', invitationToken)
        .eq('status', 'pending')
        .single();

      if (invitation) {
        // Update user with invitation role and principal_id (for agents)
        await serviceSupabase
          .from('users')
          .update({
            role: invitation.role,
            contact_id: invitation.contact_id,
            principal_id: invitation.principal_id || null,
          })
          .eq('auth_provider_id', user.id);

        // Mark invitation as accepted
        await serviceSupabase
          .from('invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            accepted_by_user_id: user.id,
          })
          .eq('id', invitation.id);

        // Redirect to the appropriate portal based on role
        const roleRedirects: Record<string, string> = {
          landlord: '/landlord/dashboard',
          landlord_agent: '/landlord/dashboard',
          tenant: '/tenant/dashboard',
          tenant_agent: '/tenant/dashboard',
          broker: '/dashboard',
          admin: '/dashboard',
        };

        return NextResponse.redirect(
          `${origin}${roleRedirects[invitation.role] || next}`,
        );
      }
    }

    // Role-aware default redirect
    if (user) {
      const { data: userRow } = await supabase
        .from('users')
        .select('role')
        .eq('auth_provider_id', user.id)
        .single();

      const userRole = userRow?.role;
      let redirectPath = next;
      if (next === '/dashboard') {
        if (userRole === 'landlord' || userRole === 'landlord_agent') {
          redirectPath = '/landlord/dashboard';
        } else if (userRole === 'tenant' || userRole === 'tenant_agent') {
          redirectPath = '/tenant/dashboard';
        }
      }

      return NextResponse.redirect(`${origin}${redirectPath}`);
    }

    return NextResponse.redirect(`${origin}${next}`);
  } catch (err) {
    console.error('[Auth Callback] Unexpected error:', err);
    return NextResponse.redirect(
      `${origin}/login?error=unexpected`,
    );
  }
}
