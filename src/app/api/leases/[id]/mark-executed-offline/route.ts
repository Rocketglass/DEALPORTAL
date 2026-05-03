/**
 * POST /api/leases/[id]/mark-executed-offline
 *
 * Used when the lease is signed offline (paper, email, in-person) instead
 * of via DocuSign. Broker uploads the signed PDF or photo, we store it as
 * the executed lease document, flip the lease status to 'executed', and
 * trigger the same downstream as a DocuSign-completed lease (commission
 * invoice generation, unit status update, audit log).
 *
 * Body: multipart/form-data with `file` field (application/pdf or image/*).
 *       optional `notes` text field.
 *
 * Broker / admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { generateCommissionInvoice } from '@/lib/commission/generate-invoice';

const MAX_BYTES = 25 * 1024 * 1024;
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);
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
  if (!id) return NextResponse.json({ error: 'Missing lease id' }, { status: 400 });

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
  if (file.type === 'application/pdf' && !buffer.subarray(0, 4).equals(PDF_MAGIC)) {
    return NextResponse.json({ error: 'File does not appear to be a valid PDF' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Verify lease + status. Mirror the validity window for the electronic
  // path: only mark executed when the lease was in flight or ready to send.
  const { data: lease, error: leaseErr } = await supabase
    .from('leases')
    .select('id, status, unit_id, property_id, tenant_contact_id, landlord_contact_id, broker_contact_id, premises_address, lessee_name, commencement_date')
    .eq('id', id)
    .maybeSingle();
  if (leaseErr || !lease) {
    return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
  }
  if (!['draft', 'review', 'sent_for_signature', 'partially_signed'].includes(lease.status)) {
    return NextResponse.json(
      { error: `Lease is in status '${lease.status}' — cannot mark executed from here` },
      { status: 400 },
    );
  }

  // Upload to the existing lease-documents bucket — same place DocuSign-
  // returned executed PDFs land.
  const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1];
  const storagePath = `${id}/executed-offline-${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('lease-documents')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });
  if (uploadErr) {
    console.error(`[POST /api/leases/${id}/mark-executed-offline] upload error:`, uploadErr);
    return NextResponse.json({ error: 'Failed to store signed file' }, { status: 500 });
  }

  // Update lease record. Atomic transition — only flip if status is still in
  // a pre-executed state. Without this guard, two parallel POSTs both pass
  // the status check above, both update the row, and both fall through to
  // generateCommissionInvoice — producing duplicate invoices for one signing
  // event. `.in('status', [...]).select()` returns the row only when it
  // actually transitioned; null result means another writer beat us to it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: Record<string, any> = {
    status: 'executed',
    executed_pdf_url: storagePath,
    docusign_status: 'offline',
    signed_date: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // The optional `notes` field is captured in the audit log entry below;
  // we don't overwrite the lease's own `notes` column to avoid clobbering
  // any prior context the broker put there.
  const { data: updated, error: updateErr } = await supabase
    .from('leases')
    .update(updatePayload)
    .eq('id', id)
    .in('status', ['draft', 'review', 'sent_for_signature', 'partially_signed'])
    .select('id')
    .maybeSingle();
  if (updateErr) {
    console.error(`[POST /api/leases/${id}/mark-executed-offline] update error:`, updateErr);
    return NextResponse.json({ error: 'Failed to update lease' }, { status: 500 });
  }
  if (!updated) {
    // Another writer flipped the status between our read and our update.
    // Clean up the orphan storage object so we don't accumulate cruft.
    await supabase.storage.from('lease-documents').remove([storagePath]).catch(() => {});
    return NextResponse.json(
      { error: 'Lease was already marked executed by another request' },
      { status: 409 },
    );
  }

  // Mirror the DocuSign-completed downstream: flip the unit to occupied so
  // the property dashboard reflects reality.
  if (lease.unit_id) {
    await supabase
      .from('units')
      .update({
        status: 'occupied',
        current_lease_id: lease.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lease.unit_id);
  }

  // Auto-generate the commission invoice (same as DocuSign path).
  let invoiceId: string | null = null;
  try {
    const invoice = await generateCommissionInvoice(lease.id);
    invoiceId = invoice.id;
  } catch (err) {
    // Don't fail the whole request if billing trips — log and move on.
    console.error(`[POST /api/leases/${id}/mark-executed-offline] invoice gen failed:`, err);
  }

  // Audit log
  try {
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'lease_executed_offline',
      entity_type: 'lease',
      entity_id: id,
      new_value: {
        storage_path: storagePath,
        file_name: file.name,
        size: file.size,
        invoice_id: invoiceId,
        notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      },
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({
    ok: true,
    status: 'executed',
    executed_pdf_url: storagePath,
    invoice_id: invoiceId,
  });
}
