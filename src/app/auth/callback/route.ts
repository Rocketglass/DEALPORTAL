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

    return NextResponse.redirect(`${origin}${next}`);
  } catch (err) {
    console.error('[Auth Callback] Unexpected error:', err);
    return NextResponse.redirect(
      `${origin}/login?error=unexpected`,
    );
  }
}
