/**
 * POST /api/leases/[id]/upload-pdf
 *
 * Accepts a PDF file uploaded by the broker, stores it in Supabase Storage,
 * and points the lease's lease_pdf_url at the new file.
 *
 * Use case: the auto-generated PDF from /generate-pdf is a summary of the
 * key AIR sections, not the full 17-page form. Brokers who want the full
 * AIR MTN-12-4/12E form sent for signature can print the browser preview
 * to PDF and upload it here — that PDF then becomes the one sent via
 * DocuSign.
 *
 * Body: multipart/form-data with a single field "file" (application/pdf).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB — DocuSign's per-document limit
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // "%PDF"

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = await requireBrokerOrAdminForApi();

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing lease id' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: `File exceeds ${MAX_PDF_BYTES / (1024 * 1024)} MB limit` },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.subarray(0, 4).equals(PDF_MAGIC)) {
      return NextResponse.json({ error: 'File does not appear to be a PDF' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const storagePath = `${id}/lease-uploaded-${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('lease-documents')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error(`[POST /api/leases/${id}/upload-pdf] Upload error:`, uploadError);
      return NextResponse.json({ error: 'Failed to store PDF' }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from('leases')
      .update({
        lease_pdf_url: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error(`[POST /api/leases/${id}/upload-pdf] Lease update error:`, updateError);
      return NextResponse.json({ error: 'Failed to update lease record' }, { status: 500 });
    }

    try {
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'lease_pdf_uploaded',
        entity_type: 'lease',
        entity_id: id,
        new_value: { storage_path: storagePath, file_name: file.name, size: file.size },
      });
    } catch {
      // audit log failure is non-fatal
    }

    return NextResponse.json({ ok: true, storage_path: storagePath });
  } catch (error) {
    console.error('[POST /api/leases/[id]/upload-pdf] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
