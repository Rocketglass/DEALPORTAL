'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Loader2 } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <p className="mt-4 text-[13px] text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationEmail = searchParams.get('email') || '';
  const [email, setEmail] = useState(invitationEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');
  const invitationToken = searchParams.get('invitation');
  const baseRedirect = searchParams.get('redirect') || '/dashboard';
  // If an invitation token is present, route through the auth callback so it gets processed
  const redirect = invitationToken
    ? `/auth/callback?invitation=${encodeURIComponent(invitationToken)}`
    : baseRedirect;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isSupabaseConfigured()) {
      setError('Authentication is not configured yet. Supabase credentials required.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch {
      setError('Authentication service unavailable.');
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');

    if (!isSupabaseConfigured()) {
      setResetError('Authentication is not configured yet.');
      setResetLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetErr) {
        setResetError(resetErr.message);
        setResetLoading(false);
        return;
      }

      setResetSent(true);
    } catch {
      setResetError('Unable to send reset email. Please try again.');
    } finally {
      setResetLoading(false);
    }
  }

  const inputClasses = 'w-full rounded-lg border border-border bg-[var(--background-raised)] px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-150';
  const labelClasses = 'mb-1.5 block text-[12px] font-medium text-muted-foreground';
  const primaryBtnClasses = 'flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-medium text-white transition-all duration-150 hover:bg-primary-light hover:shadow-md hover:shadow-primary/15 disabled:opacity-50 disabled:hover:shadow-none';

  if (showReset) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
        <div className="w-full max-w-[360px] animate-fade-in">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight">Rocket Realty</span>
            </Link>
            <p className="mt-3 text-[13px] text-muted-foreground">
              Reset your password
            </p>
          </div>

          <div className="rounded-xl border border-border bg-[var(--background-raised)] p-6 shadow-sm">
            {resetSent ? (
              <div>
                <div className="rounded-lg bg-emerald-50 p-3 text-[13px] text-emerald-700">
                  Check your email for a password reset link
                </div>
                <button
                  type="button"
                  onClick={() => { setShowReset(false); setResetSent(false); setResetEmail(''); }}
                  className="mt-4 w-full text-center text-[13px] font-medium text-primary hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword}>
                {resetError && (
                  <div className="mb-4 rounded-lg bg-red-50 p-3 text-[13px] text-destructive">
                    {resetError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="reset-email" className={labelClasses}>Email</label>
                    <input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className={inputClasses}
                      placeholder="you@example.com"
                    />
                  </div>

                  <button type="submit" disabled={resetLoading} className={primaryBtnClasses}>
                    {resetLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => { setShowReset(false); setResetError(''); }}
                  className="mt-4 w-full text-center text-[13px] font-medium text-primary hover:underline"
                >
                  Back to sign in
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-[360px] animate-fade-in">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Rocket Realty</span>
          </Link>
          <p className="mt-3 text-[13px] text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleLogin} className="rounded-xl border border-border bg-[var(--background-raised)] p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-[13px] text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className={labelClasses}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClasses}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className={labelClasses}>Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputClasses}
                placeholder="Enter your password"
              />
            </div>

            <button type="submit" disabled={loading} className={primaryBtnClasses}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </button>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowReset(true)}
              className="text-[12px] font-medium text-muted-foreground hover:text-primary"
            >
              Forgot password?
            </button>
          </div>

          <p className="mt-3 text-center text-[12px] text-muted-foreground">
            Need an account?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
