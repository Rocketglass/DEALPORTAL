/**
 * POST /api/applications/[id]/documents
 *
 * Public endpoint — no auth required. Receives a multipart/form-data
 * request with:
 *   - file: the File blob
 *   - documentType: one of the DocumentType enum values
 *
 * Validates file type/size (PDF/JPG/PNG, max 10MB), uploads to
 * Supabase Storage bucket `application-documents` at path
 * `{applicationId}/{sanitizedFileName}`, then inserts an
 * application_documents row.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sanitizeFileName, validateFileUpload } from '@/lib/security/sanitize';
import type { DocumentType } from '@/types/database';

const STORAGE_BUCKET = 'application-documents';

const VALID_DOCUMENT_TYPES = new Set<DocumentType>([
  'tax_return',
  'bank_statement',
  'pnl',
  'business_license',
  'id',
  'credit_report',
  'other',
]);

// Map the apply-form's DocumentCategory values to DB DocumentType values
const CATEGORY_TO_DOC_TYPE: Record<string, DocumentType> = {
  tax_returns: 'tax_return',
  bank_statements: 'bank_statement',
  pnl: 'pnl',
  business_license: 'business_license',
};

// Service role client — bypasses RLS for unauthenticated public submissions
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: applicationId } = await params;

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId is required' }, { status: 400 });
    }

    // ----------------------------------------------------------------
    // Parse multipart form data
    // ----------------------------------------------------------------
    let formData: globalThis.FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Request must be multipart/form-data' },
        { status: 400 },
      );
    }

    const fileEntry = formData.get('file');
    const rawCategory = formData.get('documentType') as string | null;

    if (!fileEntry || !(fileEntry instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const file = fileEntry as File;

    // Resolve document type — accept either a raw category key from the form
    // (tax_returns, bank_statements, pnl, business_license) or a direct
    // DocumentType value.
    let documentType: DocumentType = 'other';
    if (rawCategory) {
      if (CATEGORY_TO_DOC_TYPE[rawCategory]) {
        documentType = CATEGORY_TO_DOC_TYPE[rawCategory];
      } else if (VALID_DOCUMENT_TYPES.has(rawCategory as DocumentType)) {
        documentType = rawCategory as DocumentType;
      }
    }

    // ----------------------------------------------------------------
    // Validate file (type, size, magic bytes)
    // ----------------------------------------------------------------
    const validation = await validateFileUpload(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 422 });
    }

    const sanitizedName = validation.sanitizedName ?? sanitizeFileName(file.name);

    // ----------------------------------------------------------------
    // Verify the application exists before uploading
    // ----------------------------------------------------------------
    const supabase = getServiceClient();

    const { data: app, error: appLookupError } = await supabase
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .maybeSingle();

    if (appLookupError || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // ----------------------------------------------------------------
    // Upload to Supabase Storage
    // ----------------------------------------------------------------
    const storagePath = `${applicationId}/${sanitizedName}`;

    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      // If the file already exists (upsert: false), treat it as a conflict
      if (uploadError.message?.includes('already exists')) {
        return NextResponse.json(
          { error: `A file named "${sanitizedName}" has already been uploaded for this application` },
          { status: 409 },
        );
      }
      console.error('[documents POST] storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 },
      );
    }

    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const fileUrl = publicUrlData.publicUrl;

    // ----------------------------------------------------------------
    // Insert application_documents record
    // ----------------------------------------------------------------
    const { data: docRecord, error: docError } = await supabase
      .from('application_documents')
      .insert({
        application_id: applicationId,
        document_type: documentType,
        file_url: fileUrl,
        file_name: sanitizedName,
        file_size_bytes: file.size,
        mime_type: file.type,
        reviewed: false,
      })
      .select('id')
      .single();

    if (docError || !docRecord) {
      console.error('[documents POST] document record insert error:', docError);
      // Attempt to clean up the uploaded file so storage and DB don't diverge
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return NextResponse.json(
        { error: 'Failed to record document metadata' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        documentId: docRecord.id,
        fileName: sanitizedName,
        fileUrl,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[documents POST] unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
