/**
 * DocuSign Connect webhook handler.
 *
 * DocuSign sends webhook notifications (Connect) as XML or JSON payloads
 * when envelope and recipient events occur. This route handles:
 *
 * - `envelope-completed` — All parties have signed. Update lease status to
 *   'executed' and trigger commission invoice generation.
 * - `recipient-completed` — An individual signer has completed. Update
 *   signing progress (e.g., lease status to 'partially_signed').
 *
 * Security: Validates HMAC-SHA256 signature from DocuSign Connect.
 * This endpoint does NOT use session auth — it uses webhook signature verification.
 *
 * DocuSign Connect docs:
 * https://developers.docusign.com/platform/webhooks/connect/
 */

import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Type definitions for DocuSign Connect webhook payloads (JSON format)
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

/**
 * Verify the DocuSign Connect HMAC-SHA256 signature.
 *
 * DocuSign sends the HMAC signature in the `X-DocuSign-Signature-1` header.
 * The signature is computed over the raw request body using the shared secret.
 *
 * @see https://developers.docusign.com/platform/webhooks/connect/hmac/
 */
async function verifyDocuSignSignature(
  request: NextRequest,
  body: string,
): Promise<boolean> {
  const hmacSecret = process.env.DOCUSIGN_CONNECT_HMAC_SECRET;

  if (!hmacSecret) {
    // In development, skip verification if no secret is configured
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[DocuSign Webhook] No HMAC secret configured — skipping signature verification (dev only)',
      );
      return true;
    }
    console.error(
      '[DocuSign Webhook] HMAC secret not configured in production — rejecting request',
    );
    return false;
  }

  // Get the signature from the request header
  const signature = request.headers.get('X-DocuSign-Signature-1');
  if (!signature) {
    console.error('[DocuSign Webhook] Missing X-DocuSign-Signature-1 header');
    return false;
  }

  try {
    // Import the HMAC secret key
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(hmacSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    // Compute the HMAC over the raw body
    const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(body));

    // Convert to base64 for comparison
    const computedSignature = btoa(
      String.fromCharCode(...new Uint8Array(mac)),
    );

    // Constant-time comparison to prevent timing attacks
    if (signature.length !== computedSignature.length) {
      console.error('[DocuSign Webhook] Signature length mismatch');
      return false;
    }

    const sigBytes = encoder.encode(signature);
    const computedBytes = encoder.encode(computedSignature);

    let mismatch = 0;
    for (let i = 0; i < sigBytes.length; i++) {
      mismatch |= sigBytes[i] ^ computedBytes[i];
    }

    if (mismatch !== 0) {
      console.error('[DocuSign Webhook] HMAC signature mismatch — request rejected');
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      '[DocuSign Webhook] Error verifying signature:',
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * Handle envelope-completed event.
 *
 * All parties have signed the lease. This should:
 * 1. Update the lease status to 'executed'
 * 2. Set the signed_date
 * 3. Download the executed PDF from DocuSign and store it
 * 4. Trigger commission invoice generation
 * 5. Send notification emails to all parties
 */
async function handleEnvelopeCompleted(
  payload: DocuSignConnectPayload,
): Promise<void> {
  const { envelopeId, envelopeSummary } = payload.data;

  console.log(
    `[DocuSign Webhook] Envelope completed: ${envelopeId}`,
    `Completed at: ${envelopeSummary.completedDateTime}`,
  );

  // TODO: Look up lease by docusign_envelope_id
  // const { data: lease } = await supabase
  //   .from('leases')
  //   .select('*')
  //   .eq('docusign_envelope_id', envelopeId)
  //   .single();
  //
  // if (!lease) {
  //   console.error(`[DocuSign Webhook] No lease found for envelope ${envelopeId}`);
  //   return;
  // }

  // TODO: Update lease status to 'executed'
  // await supabase
  //   .from('leases')
  //   .update({
  //     status: 'executed',
  //     docusign_status: 'completed',
  //     signed_date: envelopeSummary.completedDateTime,
  //     updated_at: new Date().toISOString(),
  //   })
  //   .eq('docusign_envelope_id', envelopeId);

  // TODO: Download executed PDF from DocuSign
  // const { getEnvelopeDocuments } = await import('@/lib/docusign/client');
  // const pdfBytes = await getEnvelopeDocuments(envelopeId);
  // Upload to storage and save URL

  // TODO: Generate commission invoice
  // const { generateCommissionInvoice } = await import('@/lib/invoices');
  // await generateCommissionInvoice(lease);

  // TODO: Send notification emails
  // const { leaseExecuted } = await import('@/lib/email/templates');
  // Send to tenant, landlord, and broker

  void envelopeId;
}

/**
 * Handle recipient-completed event.
 *
 * An individual signer has completed signing. This should:
 * 1. Update the lease's docusign_status to reflect progress
 * 2. If the lease was in 'sent_for_signature' status, move to 'partially_signed'
 * 3. Log the signing event in the audit trail
 */
async function handleRecipientCompleted(
  payload: DocuSignConnectPayload,
): Promise<void> {
  const { envelopeId, envelopeSummary } = payload.data;
  const signers = envelopeSummary.recipients.signers;

  const completedSigners = signers.filter((s) => s.status === 'completed');
  const totalSigners = signers.length;

  console.log(
    `[DocuSign Webhook] Recipient completed for envelope ${envelopeId}`,
    `Progress: ${completedSigners.length}/${totalSigners} signers`,
  );

  // TODO: Look up lease by docusign_envelope_id
  // const { data: lease } = await supabase
  //   .from('leases')
  //   .select('*')
  //   .eq('docusign_envelope_id', envelopeId)
  //   .single();
  //
  // if (!lease) {
  //   console.error(`[DocuSign Webhook] No lease found for envelope ${envelopeId}`);
  //   return;
  // }

  // TODO: Update lease to partially_signed if not already
  // if (lease.status === 'sent_for_signature') {
  //   await supabase
  //     .from('leases')
  //     .update({
  //       status: 'partially_signed',
  //       docusign_status: `${completedSigners.length}/${totalSigners} signed`,
  //       updated_at: new Date().toISOString(),
  //     })
  //     .eq('docusign_envelope_id', envelopeId);
  // }

  // TODO: Create audit log entry
  // await supabase.from('audit_log').insert({
  //   action: 'docusign_recipient_signed',
  //   entity_type: 'lease',
  //   entity_id: lease.id,
  //   new_value: {
  //     signer: completedSigners[completedSigners.length - 1],
  //     progress: `${completedSigners.length}/${totalSigners}`,
  //   },
  // });

  void envelopeId;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text();

    // Verify webhook HMAC-SHA256 signature
    const isValid = await verifyDocuSignSignature(request, body);
    if (!isValid) {
      const clientIp =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';
      console.error(
        `[DocuSign Webhook] Invalid HMAC signature from IP ${clientIp}`,
      );
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 },
      );
    }

    const payload: DocuSignConnectPayload = JSON.parse(body);
    const event = payload.event;

    console.log(
      `[DocuSign Webhook] Received event: ${event}`,
      `Envelope: ${payload.data.envelopeId}`,
    );

    switch (event) {
      case 'envelope-completed':
        await handleEnvelopeCompleted(payload);
        break;

      case 'recipient-completed':
        await handleRecipientCompleted(payload);
        break;

      default:
        // Acknowledge unhandled events without error
        console.log(`[DocuSign Webhook] Unhandled event type: ${event}`);
        break;
    }

    // DocuSign expects a 200 response to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[DocuSign Webhook] Error processing webhook:', error);

    // Return 200 even on error to prevent DocuSign from retrying indefinitely.
    // Log the error for investigation. In production, send to error tracking.
    return NextResponse.json(
      { received: true, error: 'Internal processing error' },
      { status: 200 },
    );
  }
}

/**
 * DocuSign may send a GET request to verify the webhook endpoint is reachable
 * during Connect configuration.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: 'ok', service: 'docusign-webhook' });
}
