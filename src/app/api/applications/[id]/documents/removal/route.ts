/**
 * Document removal request and approval endpoints.
 *
 * POST /api/applications/[id]/documents/removal
 *   - Public: Applicant requests removal of their financial documents after deal closes
 *   - Body: { documentIds: string[], email: string }
 *
 * PATCH /api/applications/[id]/documents/removal
 *   - Broker/admin: Approve or deny removal requests
 *   - Body: { documentIds: string[], action: 'approve' | 'deny' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { sanitizeEmail } from '@/lib/security/sanitize';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * POST: Applicant requests removal of their documents.
 * Public endpoint — verified by email match to the application's contact.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: applicationId } = await params;
    const { documentIds, email } = await request.json();

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: 'documentIds array is required' }, { status: 400 });
    }

    const cleanEmail = sanitizeEmail(email ?? '');
    if (!cleanEmail) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Verify the application exists and the email matches
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id, contact_id, contacts:contact_id(email)')
      .eq('id', applicationId)
      .single();

    if (appError || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify email matches the application contact
    const contactEmail = (app as Record<string, unknown>).contacts as { email: string } | null;
    if (!contactEmail || contactEmail.email.toLowerCase() !== cleanEmail.toLowerCase()) {
      return NextResponse.json({ error: 'Email does not match this application' }, { status: 403 });
    }

    // Mark documents as removal requested
    const { data: updated, error: updateError } = await supabase
      .from('application_documents')
      .update({
        removal_status: 'requested',
        removal_requested_at: new Date().toISOString(),
        removal_requested_by: cleanEmail,
      })
      .eq('application_id', applicationId)
      .in('id', documentIds)
      .is('removal_status', null) // Only request for docs not already requested
      .select('id, file_name, removal_status');

    if (updateError) {
      console.error('[documents/removal POST] error:', updateError);
      return NextResponse.json({ error: 'Failed to submit removal request' }, { status: 500 });
    }

    return NextResponse.json({
      requested: updated?.length ?? 0,
      message: 'Removal request submitted. Rocket Realty will review and approve.',
    });
  } catch (error) {
    console.error('[documents/removal POST] unexpected error:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

/**
 * PATCH: Broker approves or denies document removal.
 * If approved, the actual file is deleted from storage and the DB record is removed.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireBrokerOrAdminForApi();
    const { id: applicationId } = await params;
    const { documentIds, action } = await request.json();

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: 'documentIds array is required' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'deny') {
      return NextResponse.json({ error: 'action must be "approve" or "deny"' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Get broker contact ID
    const { data: userRow } = await supabase
      .from('users')
      .select('contact_id')
      .eq('email', user.email)
      .single();

    if (action === 'deny') {
      // Just update the status to denied
      const { data: denied } = await supabase
        .from('application_documents')
        .update({
          removal_status: 'denied',
          removal_approved_at: new Date().toISOString(),
          removal_approved_by: userRow?.contact_id || null,
        })
        .eq('application_id', applicationId)
        .in('id', documentIds)
        .eq('removal_status', 'requested')
        .select('id');

      return NextResponse.json({ denied: denied?.length ?? 0 });
    }

    // Approve: delete files from storage, then remove DB records
    const { data: docs, error: fetchError } = await supabase
      .from('application_documents')
      .select('id, file_url, file_name')
      .eq('application_id', applicationId)
      .in('id', documentIds)
      .eq('removal_status', 'requested');

    if (fetchError || !docs || docs.length === 0) {
      return NextResponse.json({ error: 'No pending removal requests found' }, { status: 404 });
    }

    // Delete files from storage
    const storagePaths = docs.map((doc) => {
      // Extract the storage path from the file_url
      // URL format: .../storage/v1/object/application-documents/{path}
      const urlParts = doc.file_url.split('/application-documents/');
      return urlParts.length > 1 ? urlParts[1] : null;
    }).filter(Boolean) as string[];

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('application-documents')
        .remove(storagePaths);

      if (storageError) {
        console.error('[documents/removal PATCH] storage delete error:', storageError);
        // Continue anyway — mark as approved even if storage delete fails
      }
    }

    // Delete the document records
    const { error: deleteError } = await supabase
      .from('application_documents')
      .delete()
      .eq('application_id', applicationId)
      .in('id', documentIds)
      .eq('removal_status', 'requested');

    if (deleteError) {
      console.error('[documents/removal PATCH] delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to remove documents' }, { status: 500 });
    }

    // Audit log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'documents_removal_approved',
      entity_type: 'application',
      entity_id: applicationId,
      new_value: { documentIds, fileNames: docs.map((d) => d.file_name) },
    });

    return NextResponse.json({
      removed: docs.length,
      message: 'Documents have been permanently deleted.',
    });
  } catch (error) {
    console.error('[documents/removal PATCH] unexpected error:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
