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
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

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
  // Auth check
  try {
    await requireBrokerOrAdminForApi();
  } catch (authError) {
    return NextResponse.json(
      { error: (authError as Error).message },
      { status: 401 },
    );
  }

  const { id: applicationId, docId } = await params;

  try {
    const supabase = getServiceClient();

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

    // Extract the storage path from the public URL
    // Public URLs are typically: {supabaseUrl}/storage/v1/object/public/{bucket}/{path}
    const publicUrlPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/`;
    let storagePath: string;

    if (doc.file_url.startsWith(publicUrlPrefix)) {
      storagePath = decodeURIComponent(doc.file_url.slice(publicUrlPrefix.length));
    } else {
      // Fallback: reconstruct from application ID and file name
      storagePath = `${applicationId}/${doc.file_name}`;
    }

    // Generate a signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 3600);

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
