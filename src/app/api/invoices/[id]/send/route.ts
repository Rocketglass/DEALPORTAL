/**
 * POST /api/invoices/[id]/send
 *
 * Sends a commission invoice as a PDF attachment via email to the payee
 * (landlord). Updates the invoice status to 'sent' and sets sent_date.
 *
 * Requires authenticated broker or admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { getInvoiceWithDetail } from '@/lib/queries/invoices';
import { generateInvoicePdf } from '@/lib/pdf/invoice';
import { sendEmail } from '@/lib/email/send';
import { invoiceSent } from '@/lib/email/templates';

// Service-role client so we can update without RLS restrictions
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  // ------------------------------------------------------------------
  // Auth check
  // ------------------------------------------------------------------
  let currentUser;
  try {
    currentUser = await requireBrokerOrAdminForApi();
  } catch (authError) {
    return NextResponse.json(
      { error: (authError as Error).message },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 });
  }

  // ------------------------------------------------------------------
  // Fetch invoice with full detail
  // ------------------------------------------------------------------
  const { data, error: fetchError } = await getInvoiceWithDetail(id);

  if (fetchError || !data) {
    return NextResponse.json(
      { error: fetchError || 'Invoice not found' },
      { status: 404 },
    );
  }

  // Only draft invoices can be sent
  if (data.status !== 'draft') {
    return NextResponse.json(
      { error: `Invoice is already '${data.status}'. Only draft invoices can be sent.` },
      { status: 422 },
    );
  }

  // ------------------------------------------------------------------
  // Resolve payee email from the contact
  // ------------------------------------------------------------------
  const supabase = getServiceClient();

  const { data: payeeContact, error: contactError } = await supabase
    .from('contacts')
    .select('email, first_name, last_name, company_name')
    .eq('id', data.payee_contact_id)
    .maybeSingle();

  if (contactError || !payeeContact) {
    return NextResponse.json(
      { error: 'Could not find payee contact' },
      { status: 404 },
    );
  }

  const payeeEmail = payeeContact.email;
  if (!payeeEmail) {
    return NextResponse.json(
      { error: 'Payee contact does not have an email address' },
      { status: 422 },
    );
  }

  const payeeName =
    (data.payee_name
    ?? payeeContact.company_name
    ?? [payeeContact.first_name, payeeContact.last_name].filter(Boolean).join(' '))
    || 'Landlord';

  // ------------------------------------------------------------------
  // Enrich with display fields for PDF generation
  // ------------------------------------------------------------------
  const lease = data.lease;
  const propertyAddress =
    lease?.property?.address ?? lease?.premises_address ?? '';
  const suiteNumber = lease?.unit?.suite_number
    ? `Suite ${lease.unit.suite_number}`
    : '';

  // ------------------------------------------------------------------
  // Generate PDF
  // ------------------------------------------------------------------
  let pdfBuffer: Buffer;
  try {
    const pdfBytes = await generateInvoicePdf({
      ...data,
      property_address: propertyAddress,
      suite_number: suiteNumber,
    });
    pdfBuffer = Buffer.from(pdfBytes);
  } catch (pdfError) {
    console.error(`[POST /api/invoices/${id}/send] PDF generation error:`, pdfError);
    return NextResponse.json(
      { error: 'Failed to generate invoice PDF' },
      { status: 500 },
    );
  }

  // ------------------------------------------------------------------
  // Build branded email using existing template
  // ------------------------------------------------------------------
  const commissionFormatted = data.commission_amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const { subject, html } = invoiceSent({
    landlordName: payeeName,
    invoiceNumber: data.invoice_number,
    propertyAddress,
    suiteNumber,
    commissionAmount: commissionFormatted,
    dueDate: data.due_date
      ? new Date(data.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'Due on receipt',
    invoiceId: data.id,
  });

  // ------------------------------------------------------------------
  // Send email with PDF attachment
  // ------------------------------------------------------------------
  try {
    await sendEmail({
      to: payeeEmail,
      subject,
      html,
      attachments: [
        {
          filename: `Invoice-${data.invoice_number}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
  } catch (emailError) {
    console.error(`[POST /api/invoices/${id}/send] Email send error:`, emailError);
    return NextResponse.json(
      { error: 'Failed to send invoice email' },
      { status: 500 },
    );
  }

  // ------------------------------------------------------------------
  // Update invoice status to 'sent'
  // ------------------------------------------------------------------
  const now = new Date().toISOString();

  try {
    const { data: updated, error: updateError } = await supabase
      .from('commission_invoices')
      .update({
        status: 'sent',
        sent_date: now,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updated) {
      // Email was sent but status update failed — log but still return success
      console.error(
        `[POST /api/invoices/${id}/send] Status update failed (email was sent):`,
        updateError,
      );
    }

    console.log(
      `[POST /api/invoices/${id}/send] ${data.invoice_number} sent to ${payeeEmail}` +
        ` by ${currentUser.email}`,
    );

    return NextResponse.json({
      success: true,
      invoice: updated ?? { ...data, status: 'sent', sent_date: now },
      sentTo: payeeEmail,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update invoice status';
    console.error(`[POST /api/invoices/${id}/send] Error:`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
