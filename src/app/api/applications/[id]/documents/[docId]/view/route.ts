/**
 * GET /api/applications/[id]/documents/[docId]/view
 *
 * Generates a signed URL for a document stored in Supabase Storage
 * and redirects to it. This allows the PDF viewer to render the
 * document securely without exposing raw storage paths.
 *
 * Requires authenticated broker or admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuthForApi } from '@/lib/security/auth-guard';

const STORAGE_BUCKET = 'application-documents';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
): Promise<NextResponse> {
  // Auth check — brokers, admins, landlords, and landlord agents can view documents
  let user;
  try {
    user = await requireAuthForApi();
  } catch (authError) {
    return NextResponse.json(
      { error: (authError as Error).message },
      { status: 401 },
    );
  }

  const isBrokerOrAdmin = user.role === 'broker' || user.role === 'admin';
  const isLandlord = user.role === 'landlord' || user.role === 'landlord_agent';

  if (!isBrokerOrAdmin && !isLandlord) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: applicationId, docId } = await params;

  try {
    const supabase = getServiceClient();

    // Landlord ownership verification: ensure landlord is associated with
    // this application's property via LOIs or leases before granting access
    if (isLandlord) {
      const { data: app } = await supabase
        .from('applications')
        .select('property_id')
        .eq('id', applicationId)
        .single();

      if (app?.property_id) {
        const effectiveContactId = user.principalId ?? user.contactId;

        const { count: loiCount } = await supabase
          .from('lois')
          .select('id', { count: 'exact', head: true })
          .eq('property_id', app.property_id)
          .eq('landlord_contact_id', effectiveContactId);

        const { count: leaseCount } = await supabase
          .from('leases')
          .select('id', { count: 'exact', head: true })
          .eq('property_id', app.property_id)
          .eq('landlord_contact_id', effectiveContactId);

        if ((loiCount ?? 0) === 0 && (leaseCount ?? 0) === 0) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    // Look up the document record to get the storage path
    const { data: doc, error: docError } = await supabase
      .from('application_documents')
      .select('id, file_url, file_name, application_id')
      .eq('id', docId)
      .eq('application_id', applicationId)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Extract the storage path from file_url.
    // New format: "application-documents/{applicationId}/{fileName}"
    // Legacy format: "{supabaseUrl}/storage/v1/object/public/{bucket}/{path}"
    const bucketPrefix = `${STORAGE_BUCKET}/`;
    const publicUrlPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/`;
    let storagePath: string;

    if (doc.file_url.startsWith(bucketPrefix)) {
      storagePath = doc.file_url.slice(bucketPrefix.length);
    } else if (doc.file_url.startsWith(publicUrlPrefix)) {
      storagePath = decodeURIComponent(doc.file_url.slice(publicUrlPrefix.length));
    } else {
      // Fallback: reconstruct from application ID and file name
      storagePath = `${applicationId}/${doc.file_name}`;
    }

    // Generate a signed URL (valid for 15 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 900);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error(
        `[GET /api/applications/${applicationId}/documents/${docId}/view] Signed URL error:`,
        signedUrlError,
      );
      return NextResponse.json(
        { error: 'Failed to generate document URL' },
        { status: 500 },
      );
    }

    // Fire-and-forget audit log for document access
    supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'document.viewed',
      entity_type: 'application_document',
      entity_id: docId,
      new_value: { application_id: applicationId, file_name: doc.file_name },
      ip_address: _request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    }).then(({ error: auditErr }) => {
      if (auditErr) console.error('[audit_log] Failed to log document view:', auditErr);
    });

    // Return the signed URL as JSON so the client can use it in the PDF viewer
    return NextResponse.json({ url: signedUrlData.signedUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error(
      `[GET /api/applications/${applicationId}/documents/${docId}/view] Error:`,
      error,
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
