/**
 * DocuSign Connect webhook handler.
 *
 * Handles envelope and recipient events from DocuSign Connect:
 * - envelope-completed: All parties signed → lease status → 'executed'
 * - recipient-completed: Individual signer done → lease → 'partially_signed'
 *
 * Security: Validates HMAC-SHA256 signature from DocuSign Connect.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEnvelopeDocument } from '@/lib/docusign/client';
import { generateCommissionInvoice } from '@/lib/commission/generate-invoice';
import { notifyLeaseExecuted } from '@/lib/email/notifications';

// Use service role client for webhook processing (no user session)
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocuSignConnectPayload {
  event: string;
  apiVersion: string;
  uri: string;
  retryCount: number;
  configurationId: number;
  generatedDateTime: string;
  data: {
    accountId: string;
    userId: string;
    envelopeId: string;
    envelopeSummary: {
      status: string;
      emailSubject: string;
      sentDateTime?: string;
      completedDateTime?: string;
      recipients: {
        signers: Array<{
          recipientId: string;
          recipientIdGuid: string;
          name: string;
          email: string;
          status: string;
          routingOrder: string;
          signedDateTime?: string;
        }>;
      };
      envelopeDocuments?: Array<{
        documentId: string;
        name: string;
        uri: string;
      }>;
    };
  };
}

// ---------------------------------------------------------------------------
// HMAC signature verification
// ---------------------------------------------------------------------------

async function verifyDocuSignSignature(
  request: NextRequest,
  body: string,
): Promise<boolean> {
  const hmacSecret = process.env.DOCUSIGN_CONNECT_HMAC_SECRET;

  if (!hmacSecret) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[DocuSign Webhook] No HMAC secret — skipping verification (dev only)');
      return true;
    }
    console.error('[DocuSign Webhook] HMAC secret not configured in production');
    return false;
  }

  const signature = request.headers.get('X-DocuSign-Signature-1');
  if (!signature) {
    console.error('[DocuSign Webhook] Missing X-DocuSign-Signature-1 header');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(hmacSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const computedSignature = btoa(String.fromCharCode(...new Uint8Array(mac)));

    // Constant-time comparison
    if (signature.length !== computedSignature.length) return false;
    const sigBytes = encoder.encode(signature);
    const computedBytes = encoder.encode(computedSignature);
    let mismatch = 0;
    for (let i = 0; i < sigBytes.length; i++) {
      mismatch |= sigBytes[i] ^ computedBytes[i];
    }
    return mismatch === 0;
  } catch (error) {
    console.error('[DocuSign Webhook] Signature verification error:', error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleEnvelopeCompleted(payload: DocuSignConnectPayload): Promise<void> {
  const { envelopeId, envelopeSummary } = payload.data;
  const supabase = getServiceClient();

  console.log(`[DocuSign Webhook] Envelope completed: ${envelopeId}`);

  // Find the lease by envelope ID, including fields needed for notifications
  const { data: lease, error: findError } = await supabase
    .from('leases')
    .select('id, property_id, unit_id, tenant_contact_id, landlord_contact_id, broker_contact_id, premises_address, lessee_name, commencement_date')
    .eq('docusign_envelope_id', envelopeId)
    .single();

  if (findError || !lease) {
    console.error(`[DocuSign Webhook] No lease found for envelope ${envelopeId}`, findError);
    return;
  }

  // Update lease to executed
  const { error: updateError } = await supabase
    .from('leases')
    .update({
      status: 'executed',
      docusign_status: 'completed',
      signed_date: envelopeSummary.completedDateTime ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', lease.id);

  if (updateError) {
    console.error(`[DocuSign Webhook] Failed to update lease ${lease.id}:`, updateError);
    return;
  }

  // Download the executed PDF and store it
  try {
    const pdfBuffer = await getEnvelopeDocument(envelopeId);
    const fileName = `${lease.id}/executed-${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('lease-documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (!uploadError) {
      // Store the internal storage path (not a public URL) — the
      // /api/leases/[id]/pdf endpoint generates signed URLs on demand.
      await supabase
        .from('leases')
        .update({ executed_pdf_url: fileName })
        .eq('id', lease.id);
    } else {
      console.error('[DocuSign Webhook] PDF upload error:', uploadError);
    }
  } catch (pdfError) {
    console.error('[DocuSign Webhook] Failed to download executed PDF:', pdfError);
  }

  // Update unit status to occupied
  await supabase
    .from('units')
    .update({
      status: 'occupied',
      current_lease_id: lease.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lease.unit_id);

  // Audit log
  await supabase.from('audit_log').insert({
    action: 'lease_executed',
    entity_type: 'lease',
    entity_id: lease.id,
    new_value: {
      envelope_id: envelopeId,
      completed_at: envelopeSummary.completedDateTime,
      signers: envelopeSummary.recipients.signers.map((s) => ({
        name: s.name,
        email: s.email,
        signedAt: s.signedDateTime,
      })),
    },
  });

  console.log(`[DocuSign Webhook] Lease ${lease.id} marked as executed`);

  // Auto-generate commission invoice now that the lease is executed
  try {
    const invoice = await generateCommissionInvoice(lease.id);
    console.log(
      `[DocuSign Webhook] Commission invoice ${invoice.invoice_number} generated for lease ${lease.id}`,
    );
  } catch (invoiceError) {
    // Log but do not re-throw — a billing failure should not cause DocuSign
    // to retry the webhook and double-update the lease.
    console.error(
      `[DocuSign Webhook] Failed to generate commission invoice for lease ${lease.id}:`,
      invoiceError,
    );
  }

  // Notify all parties (tenant, landlord, broker) that the lease is fully executed.
  // Fetch contacts in parallel; errors here must not surface to DocuSign.
  try {
    const [
      { data: tenant },
      { data: landlord },
      { data: broker },
      { data: unit },
    ] = await Promise.all([
      supabase
        .from('contacts')
        .select('email, first_name, last_name, company_name')
        .eq('id', lease.tenant_contact_id)
        .maybeSingle(),
      supabase
        .from('contacts')
        .select('email, first_name, last_name, company_name')
        .eq('id', lease.landlord_contact_id)
        .maybeSingle(),
      supabase
        .from('contacts')
        .select('email, first_name, last_name, company_name')
        .eq('id', lease.broker_contact_id)
        .maybeSingle(),
      supabase
        .from('units')
        .select('suite_number')
        .eq('id', lease.unit_id)
        .maybeSingle(),
    ]);

    const parties = [
      { contact: tenant, fallbackName: 'Tenant' },
      { contact: landlord, fallbackName: 'Landlord' },
      { contact: broker, fallbackName: 'Broker' },
    ]
      .filter(({ contact }) => !!contact?.email)
      .map(({ contact, fallbackName }) => ({
        email: contact!.email as string,
        name:
          (contact!.company_name
          ?? [contact!.first_name, contact!.last_name].filter(Boolean).join(' '))
          || fallbackName,
      }));

    if (parties.length > 0) {
      void notifyLeaseExecuted(
        {
          id: lease.id,
          propertyAddress: lease.premises_address,
          suiteNumber: unit?.suite_number ?? '',
          tenantBusinessName: lease.lessee_name,
          commencementDate: lease.commencement_date,
        },
        parties,
      );
    }
  } catch (notifyError) {
    console.error(
      `[DocuSign Webhook] Failed to send executed notifications for lease ${lease.id}:`,
      notifyError,
    );
  }
}

async function handleRecipientCompleted(payload: DocuSignConnectPayload): Promise<void> {
  const { envelopeId, envelopeSummary } = payload.data;
  const supabase = getServiceClient();
  const signers = envelopeSummary.recipients.signers;
  const completedSigners = signers.filter((s) => s.status === 'completed');

  console.log(
    `[DocuSign Webhook] Recipient completed: ${envelopeId} (${completedSigners.length}/${signers.length})`,
  );

  const { data: lease, error } = await supabase
    .from('leases')
    .select('id, status')
    .eq('docusign_envelope_id', envelopeId)
    .single();

  if (error || !lease) {
    console.error(`[DocuSign Webhook] No lease found for envelope ${envelopeId}`);
    return;
  }

  // Move to partially_signed if still in sent_for_signature
  if (lease.status === 'sent_for_signature') {
    await supabase
      .from('leases')
      .update({
        status: 'partially_signed',
        docusign_status: `${completedSigners.length}/${signers.length} signed`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lease.id);
  }

  // Audit log
  const latestSigner = completedSigners[completedSigners.length - 1];
  await supabase.from('audit_log').insert({
    action: 'docusign_recipient_signed',
    entity_type: 'lease',
    entity_id: lease.id,
    new_value: {
      signer_name: latestSigner?.name,
      signer_email: latestSigner?.email,
      signed_at: latestSigner?.signedDateTime,
      progress: `${completedSigners.length}/${signers.length}`,
    },
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text();

    const isValid = await verifyDocuSignSignature(request, body);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload: DocuSignConnectPayload = JSON.parse(body);
    console.log(`[DocuSign Webhook] Event: ${payload.event}, Envelope: ${payload.data.envelopeId}`);

    switch (payload.event) {
      case 'envelope-completed':
        await handleEnvelopeCompleted(payload);
        break;
      case 'recipient-completed':
        await handleRecipientCompleted(payload);
        break;
      default:
        console.log(`[DocuSign Webhook] Unhandled event: ${payload.event}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[DocuSign Webhook] Error:', error);
    return NextResponse.json({ received: true, error: 'Internal error' }, { status: 200 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
