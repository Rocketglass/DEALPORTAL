/**
 * GET /api/applications/status?email={email}
 *
 * Public endpoint — no auth required. Returns all applications (with
 * their documents) associated with the given email address, ordered by
 * submitted_at descending.
 *
 * Used by the tenant-facing status tracking page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sanitizeEmail } from '@/lib/security/sanitize';
import { checkEmailRateLimit } from '@/lib/security/rate-limit';
import type { ApplicationStatus } from '@/types/database';

// Service role client — bypasses RLS for unauthenticated lookups
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const rawEmail = searchParams.get('email') ?? '';

    const email = sanitizeEmail(rawEmail);
    if (!email) {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400 },
      );
    }

    // Per-email rate limit: 3 lookups per email per hour to prevent enumeration
    const rl = await checkEmailRateLimit(email);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests for this email address' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)),
          },
        },
      );
    }

    const supabase = getServiceClient();

    // Find the contact record(s) matching this email
    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', email);

    if (contactError) {
      console.error('[applications/status GET] contact lookup error:', contactError);
      return NextResponse.json({ error: 'Failed to look up contact' }, { status: 500 });
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ applications: [] });
    }

    const contactIds = contacts.map((c) => c.id);

    // Fetch applications with only the minimal fields needed for public status
    // Sensitive data (documents, LOI, lease, broker notes) is intentionally excluded —
    // the authenticated tenant dashboard at /tenant/dashboard shows the full pipeline.
    const { data: rows, error: appsError } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        business_name,
        submitted_at,
        property:properties(name)
      `)
      .in('contact_id', contactIds)
      .order('submitted_at', { ascending: false });

    if (appsError) {
      console.error('[applications/status GET] applications query error:', appsError);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    // Shape the response — public status only (no documents, LOI, lease, or notes)
    const applications = (rows ?? []).map((row) => {
      const property = row.property as unknown as { name: string } | null;

      return {
        id: row.id as string,
        businessName: (row.business_name as string) ?? '',
        propertyName: property?.name ?? 'Unknown Property',
        submittedAt: row.submitted_at as string | null,
        status: (row.status as ApplicationStatus),
      };
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('[applications/status GET] unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
