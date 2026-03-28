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
import type { ApplicationStatus, DocumentType } from '@/types/database';

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

    // Fetch applications with their property, unit, and documents
    // Note: review_notes intentionally excluded — internal broker data
    const { data: rows, error: appsError } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        business_name,
        submitted_at,
        property:properties(name),
        unit:units(suite_number),
        documents:application_documents(
          id,
          file_name,
          document_type,
          reviewed,
          uploaded_at
        )
      `)
      .in('contact_id', contactIds)
      .order('submitted_at', { ascending: false });

    if (appsError) {
      console.error('[applications/status GET] applications query error:', appsError);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    // Fetch LOIs and leases linked to these applications for deal pipeline tracking
    const appIds = (rows ?? []).map((r) => r.id as string);

    // LOIs linked to applications
    const { data: lois } = appIds.length > 0
      ? await supabase
          .from('lois')
          .select('id, application_id, status, sent_at, agreed_at')
          .in('application_id', appIds)
      : { data: [] };

    // Leases linked via LOIs
    const loiIds = (lois ?? []).map((l) => l.id as string);
    const { data: leases } = loiIds.length > 0
      ? await supabase
          .from('leases')
          .select('id, loi_id, status, docusign_status, signed_date, sent_for_signature_at')
          .in('loi_id', loiIds)
      : { data: [] };

    // Build lookup maps
    const loiByApp = new Map<string, { status: string; sentAt: string | null; agreedAt: string | null }>();
    for (const l of (lois ?? [])) {
      if (l.application_id) {
        loiByApp.set(l.application_id as string, {
          status: l.status as string,
          sentAt: l.sent_at as string | null,
          agreedAt: l.agreed_at as string | null,
        });
      }
    }

    const leaseByLoi = new Map<string, { status: string; docusignStatus: string | null; signedDate: string | null }>();
    for (const ls of (leases ?? [])) {
      if (ls.loi_id) {
        leaseByLoi.set(ls.loi_id as string, {
          status: ls.status as string,
          docusignStatus: ls.docusign_status as string | null,
          signedDate: ls.signed_date as string | null,
        });
      }
    }

    // Find LOI id by application_id for lease lookup
    const loiIdByApp = new Map<string, string>();
    for (const l of (lois ?? [])) {
      if (l.application_id) loiIdByApp.set(l.application_id as string, l.id as string);
    }

    // Shape the response into the format the status page expects
    const applications = (rows ?? []).map((row) => {
      const property = row.property as unknown as { name: string } | null;
      const unit = row.unit as unknown as { suite_number: string } | null;
      const documents = (row.documents as Array<{
        id: string;
        file_name: string;
        document_type: DocumentType;
        reviewed: boolean;
        uploaded_at: string;
      }> | null) ?? [];

      const appId = row.id as string;
      const loiData = loiByApp.get(appId) ?? null;
      const loiId = loiIdByApp.get(appId);
      const leaseData = loiId ? leaseByLoi.get(loiId) ?? null : null;

      return {
        id: appId,
        businessName: (row.business_name as string) ?? '',
        propertyName: property?.name ?? 'Unknown Property',
        suiteName: unit?.suite_number ?? null,
        submittedAt: row.submitted_at as string | null,
        status: (row.status as ApplicationStatus),
        loi: loiData,
        lease: leaseData,
        documents: documents.map((doc) => ({
          id: doc.id,
          name: doc.file_name,
          type: doc.document_type,
          reviewed: doc.reviewed,
          uploadedAt: doc.uploaded_at,
        })),
      };
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('[applications/status GET] unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
