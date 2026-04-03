'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Building2, UserPlus, LogIn, AlertCircle, Clock } from 'lucide-react';

interface InvitationDetails {
  email: string;
  role: string;
  status: string;
  expires_at: string;
  inviter: string | null;
}

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided. Please check your invitation link.');
      setLoading(false);
      return;
    }

    async function fetchInvitation() {
      try {
        const res = await fetch(`/api/invitations/accept?token=${encodeURIComponent(token!)}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Invalid invitation');
          return;
        }

        setInvitation(data);
      } catch {
        setError('Failed to load invitation details. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-sm">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-border bg-white p-8 shadow-sm text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-foreground">
              Invalid Invitation
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {error}
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                <LogIn className="h-4 w-4" />
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  const roleLabel = invitation.role.replace(/_/g, ' ');
  const expiresDate = invitation.expires_at
    ? new Date(invitation.expires_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-foreground">
            Rocket Realty
          </span>
        </div>

        <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">
              You&apos;ve been invited
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You&apos;ve been invited to join the Rocket Realty Portal as a{' '}
              <span className="font-medium text-foreground capitalize">{roleLabel}</span>.
            </p>
            {invitation.inviter && (
              <p className="mt-1 text-xs text-muted-foreground">
                Invited by {invitation.inviter}
              </p>
            )}
          </div>

          {/* Invitation details */}
          <div className="mt-6 rounded-lg bg-[#f1f5f9] p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-foreground">{invitation.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium text-foreground capitalize">{roleLabel}</span>
            </div>
            {expiresDate && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expires</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {expiresDate}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <Link
              href={`/register?invitation=${token}&email=${encodeURIComponent(invitation.email)}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <UserPlus className="h-4 w-4" />
              Create Account
            </Link>
            <Link
              href={`/login?invitation=${token}&email=${encodeURIComponent(invitation.email)}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-[#f1f5f9]"
            >
              <LogIn className="h-4 w-4" />
              Already have an account? Sign In
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          If you didn&apos;t expect this invitation, you can safely ignore it.
        </p>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            <p className="text-sm">Loading invitation...</p>
          </div>
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
