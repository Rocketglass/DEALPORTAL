'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

// --- Profile Section (Read-only) ---
function ProfileSection() {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const { profile: data } = await res.json();
          setProfile({
            firstName: data.first_name ?? '',
            lastName: data.last_name ?? '',
            email: data.email ?? '',
            phone: data.phone ?? '',
            company: data.company_name ?? '',
          });
        }
      } catch {
        // Leave defaults blank
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold">Profile</h2>
          </div>
          <div className="mt-6 h-32 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-base font-semibold">Profile</h2>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input label="First Name" value={profile.firstName} disabled />
          <Input label="Last Name" value={profile.lastName} disabled />
          <Input label="Email" type="email" value={profile.email} disabled />
          <Input label="Phone" type="tel" value={profile.phone} disabled />
          <Input label="Company" className="sm:col-span-2" value={profile.company} disabled />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          To update your profile information, please contact your broker.
        </p>
      </CardContent>
    </Card>
  );
}

// --- Security Section ---
function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleUpdatePassword() {
    const newErrors: Record<string, string> = {};

    if (!currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (!newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setErrors({ currentPassword: 'Unable to verify current user' });
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setErrors({ currentPassword: 'Current password is incorrect' });
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setErrors({ newPassword: updateError.message });
        return;
      }

      setSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Password updated', description: 'Your password has been changed successfully.', variant: 'success' });
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast({ title: 'Update failed', description: 'Network error — please try again.', variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
            <Lock className="h-4 w-4 text-amber-600" />
          </div>
          <h2 className="text-base font-semibold">Change Password</h2>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <PasswordInput
              id="current-password"
              label="Current Password"
              labelClassName="mb-1.5 block text-sm font-medium"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); clearError('currentPassword'); }}
              className="w-full rounded-lg border border-border px-3 py-2 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Enter your current password"
            />
            {errors.currentPassword && (
              <p className="mt-1 text-xs text-destructive">{errors.currentPassword}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <PasswordInput
                id="new-password"
                label="New Password"
                labelClassName="mb-1.5 block text-sm font-medium"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); clearError('newPassword'); }}
                className="w-full rounded-lg border border-border px-3 py-2 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="At least 8 characters"
                minLength={8}
              />
              {errors.newPassword && (
                <p className="mt-1 text-xs text-destructive">{errors.newPassword}</p>
              )}
            </div>
            <div>
              <PasswordInput
                id="confirm-new-password"
                label="Confirm New Password"
                labelClassName="mb-1.5 block text-sm font-medium"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword'); }}
                className="w-full rounded-lg border border-border px-3 py-2 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Re-enter your new password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="primary" icon={saved ? Check : Lock} onClick={handleUpdatePassword} loading={saving}>
            {saved ? 'Updated' : saving ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Page ---
export default function TenantSettingsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          View your profile and manage your account.
        </p>

        <div className="mt-8 space-y-6">
          <ProfileSection />
          <SecuritySection />
        </div>
      </div>
    </div>
  );
}
