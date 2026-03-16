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

    // Shape the response into the format the status page expects
    const applications = (rows ?? []).map((row) => {
      // Supabase returns joined singular relations as objects, not arrays,
      // but the inferred type may be overly broad — cast via unknown.
      const property = row.property as unknown as { name: string } | null;
      const unit = row.unit as unknown as { suite_number: string } | null;
      const documents = (row.documents as Array<{
        id: string;
        file_name: string;
        document_type: DocumentType;
        reviewed: boolean;
        uploaded_at: string;
      }> | null) ?? [];

      return {
        id: row.id as string,
        businessName: (row.business_name as string) ?? '',
        propertyName: property?.name ?? 'Unknown Property',
        suiteName: unit?.suite_number ?? null,
        submittedAt: row.submitted_at as string | null,
        status: (row.status as ApplicationStatus),
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
