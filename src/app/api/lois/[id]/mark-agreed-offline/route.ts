/**
 * POST /api/lois/[id]/mark-agreed-offline
 *
 * Used when the landlord signs the LOI offline (paper, email, etc) instead
 * of via the portal review flow. Broker uploads the signed PDF or photo,
 * we store it under lois.signed_pdf_url, mark every section as agreed
 * (using each proposed_value as the agreed_value), flip the LOI status to
 * 'agreed' so it can be converted to a lease, and log an audit_log entry
 * tagged 'loi_agreed_offline'.
 *
 * Body: multipart/form-data with `file` field (application/pdf or image/*).
 *       optional `notes` text field.
 *
 * Broker / admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

const MAX_BYTES = 25 * 1024 * 1024;
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // "%PDF"
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

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
  let user;
  try {
    user = await requireBrokerOrAdminForApi();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'Missing LOI id' }, { status: 400 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const notes = formData.get('notes');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type. Allowed: PDF, JPG, PNG, WebP, HEIC` },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'File is empty' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 25 MB limit' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // PDF-specific magic-byte check; images are validated by Content-Type alone
  // (the storage layer doesn't transform them).
  if (file.type === 'application/pdf' && !buffer.subarray(0, 4).equals(PDF_MAGIC)) {
    return NextResponse.json({ error: 'File does not appear to be a valid PDF' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Verify the LOI exists and is in a status where "agreed offline" makes sense
  // (draft / sent / in_negotiation are all reasonable starting points).
  const { data: loi, error: loiErr } = await supabase
    .from('lois')
    .select('id, status, application_id')
    .eq('id', id)
    .maybeSingle();
  if (loiErr || !loi) {
    return NextResponse.json({ error: 'LOI not found' }, { status: 404 });
  }
  if (!['draft', 'sent', 'in_negotiation'].includes(loi.status)) {
    return NextResponse.json(
      { error: `LOI is in status '${loi.status}' — cannot mark agreed from here` },
      { status: 400 },
    );
  }

  // Upload the signed file to lease-documents (reused bucket — also private,
  // already RLS'd to broker/admin via signed-URL access only).
  const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1];
  const storagePath = `lois/${id}/signed-${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('lease-documents')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });
  if (uploadErr) {
    console.error(`[POST /api/lois/${id}/mark-agreed-offline] upload error:`, uploadErr);
    return NextResponse.json({ error: 'Failed to store signed file' }, { status: 500 });
  }

  // Mark every section agreed (use each section's proposed_value as the
  // agreed_value — equivalent to the landlord accepting all sections).
  const { data: sections } = await supabase
    .from('loi_sections')
    .select('id, proposed_value')
    .eq('loi_id', id);
  if (sections && sections.length > 0) {
    await Promise.all(
      sections.map((s) =>
        supabase
          .from('loi_sections')
          .update({
            status: 'agreed',
            agreed_value: s.proposed_value,
            updated_at: new Date().toISOString(),
          })
          .eq('id', s.id),
      ),
    );
  }

  // Update the LOI itself: status = 'agreed', store signed file path,
  // stamp agreed_at. The optional `notes` field passed in is recorded in
  // the audit_log entry below — we don't write it to lois.notes to avoid
  // clobbering any prior context the broker put there.
  const { error: updateErr } = await supabase
    .from('lois')
    .update({
      status: 'agreed',
      signed_pdf_url: storagePath,
      agreed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (updateErr) {
    console.error(`[POST /api/lois/${id}/mark-agreed-offline] update error:`, updateErr);
    return NextResponse.json({ error: 'Failed to update LOI' }, { status: 500 });
  }

  // Audit log — clearly tagged so the timeline shows it wasn't an electronic
  // landlord response.
  try {
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'loi_agreed_offline',
      entity_type: 'loi',
      entity_id: id,
      new_value: {
        storage_path: storagePath,
        file_name: file.name,
        size: file.size,
        sections_marked_agreed: sections?.length ?? 0,
        notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      },
    });
  } catch {
    // Audit log failure is non-fatal — the LOI is already updated.
  }

  return NextResponse.json({ ok: true, status: 'agreed', signed_pdf_url: storagePath });
}
