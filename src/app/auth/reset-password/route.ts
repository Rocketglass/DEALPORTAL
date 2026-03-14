import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Password reset callback handler.
 *
 * Supabase redirects here after a user clicks the password reset link in their
 * email. This exchanges the one-time code for a session, then redirects to the
 * client-side /reset-password page where the user can set a new password.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  try {
    const supabase = await createClient();

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[Reset Password Callback] exchangeCodeForSession error:', exchangeError.message);
      return NextResponse.redirect(`${origin}/login?error=reset_failed`);
    }

    // Session is now established — redirect to the client-side reset form
    return NextResponse.redirect(`${origin}/reset-password`);
  } catch (err) {
    console.error('[Reset Password Callback] Unexpected error:', err);
    return NextResponse.redirect(`${origin}/login?error=unexpected`);
  }
}
