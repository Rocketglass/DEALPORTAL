/**
 * GET  /api/user/profile  — Returns the authenticated user's profile data.
 * PATCH /api/user/profile  — Updates the authenticated user's contact details.
 *
 * Both endpoints require authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuthForApi } from '@/lib/security/auth-guard';
import { getUserProfile, updateUserContact } from '@/lib/queries/users';

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Get the raw Supabase auth user to obtain their auth_provider_id
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await getUserProfile(user.id);

    if (error || !profile) {
      return NextResponse.json({ error: error ?? 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/user/profile] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuthForApi();

    const body = await request.json();

    // Email validation if provided
    if (body.email !== undefined) {
      const emailStr = String(body.email).trim();
      if (!emailStr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
        return NextResponse.json(
          { error: 'Please enter a valid email address' },
          { status: 400 }
        );
      }
    }

    const supabase = await createClient();

    // If the user has a linked contact, update it
    if (user.contactId) {
      const { data: contact, error: contactError } = await updateUserContact(user.contactId, {
        first_name: body.firstName ?? null,
        last_name: body.lastName ?? null,
        phone: body.phone ?? null,
        company_name: body.company ?? null,
      });

      if (contactError || !contact) {
        return NextResponse.json(
          { error: contactError ?? 'Failed to update contact' },
          { status: 500 }
        );
      }
    }

    // If email changed, update the users table email column
    if (body.email !== undefined) {
      const emailStr = String(body.email).trim();
      await supabase
        .from('users')
        .update({ email: emailStr })
        .eq('id', user.id);
    }

    // Return the refreshed profile
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: updatedProfile } = await getUserProfile(authUser.id);
      return NextResponse.json({ profile: updatedProfile }, { status: 200 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[PATCH /api/user/profile] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
