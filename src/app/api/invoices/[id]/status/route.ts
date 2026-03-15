/**
 * PATCH /api/invoices/[id]/status
 *
 * Update the status of a commission invoice.
 * Accepts: sent | paid | cancelled
 *
 * - 'sent'      → sets sent_date to now (or the provided date)
 * - 'paid'      → sets paid_date, paid_amount, payment_method, payment_reference
 * - 'cancelled' → marks the invoice as cancelled with no additional fields required
 *
 * Requires authenticated broker or admin.
 *
 * Body:
 * {
 *   status: 'sent' | 'paid' | 'cancelled';
 *   // for 'sent':
 *   sent_date?: string;               // ISO date string; defaults to now
 *   // for 'paid':
 *   paid_amount?: number;
 *   payment_method?: string;          // e.g. 'check', 'wire', 'ach'
 *   payment_reference?: string;       // check number, wire ref, etc.
 *   paid_date?: string;               // ISO date string; defaults to now
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import type { InvoiceStatus } from '@/types/database';
import { notifyInvoiceSent } from '@/lib/email/notifications';

// Service-role client so we can update without RLS restrictions
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

const ALLOWED_STATUSES: InvoiceStatus[] = ['sent', 'paid', 'cancelled'];

/** Valid status transitions: current → allowed next statuses */
const VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'cancelled'],
  paid: [],           // terminal state
  overdue: ['paid', 'cancelled'],
  cancelled: [],      // terminal state
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  const { id } = await params;

  // ------------------------------------------------------------------
  // Parse body
  // ------------------------------------------------------------------
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { status } = body;

  if (!status || !ALLOWED_STATUSES.includes(status as InvoiceStatus)) {
    return NextResponse.json(
      {
        error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  // ------------------------------------------------------------------
  // Build the update payload based on the target status
  // ------------------------------------------------------------------
  type InvoiceUpdate = {
    status: InvoiceStatus;
    updated_at: string;
    sent_date?: string;
    paid_date?: string;
    paid_amount?: number | null;
    payment_method?: string | null;
    payment_reference?: string | null;
  };

  const update: InvoiceUpdate = {
    status: status as InvoiceStatus,
    updated_at: now,
  };

  if (status === 'sent') {
    update.sent_date =
      typeof body.sent_date === 'string' ? body.sent_date : now;
  }

  if (status === 'paid') {
    update.paid_date =
      typeof body.paid_date === 'string' ? body.paid_date : now;
    update.paid_amount =
      typeof body.paid_amount === 'number' ? body.paid_amount : null;
    update.payment_method =
      typeof body.payment_method === 'string' ? body.payment_method : null;
    update.payment_reference =
      typeof body.payment_reference === 'string'
        ? body.payment_reference
        : null;
  }

  // ------------------------------------------------------------------
  // Persist
  // ------------------------------------------------------------------
  try {
    const supabase = getServiceClient();

    // Verify the invoice exists first
    const { data: existing, error: findError } = await supabase
      .from('commission_invoices')
      .select('id, invoice_number, status')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Validate status transition
    const allowed = VALID_TRANSITIONS[existing.status as InvoiceStatus] ?? [];
    if (!allowed.includes(status as InvoiceStatus)) {
      return NextResponse.json(
        {
          error: `Cannot transition from '${existing.status}' to '${status}'. Allowed: ${allowed.length ? allowed.join(', ') : 'none (terminal state)'}`,
        },
        { status: 422 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('commission_invoices')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? 'Update returned no data');
    }

    console.log(
      `[PATCH /api/invoices/${id}/status] ${existing.invoice_number} → ${status}` +
        ` by ${currentUser.email}`,
    );

    // When an invoice is marked as 'sent', notify the payee (landlord)
    if (status === 'sent') {
      // Fetch payee contact and lease details in parallel for the notification
      const [{ data: payeeContact }, { data: lease }] = await Promise.all([
        supabase
          .from('contacts')
          .select('email, first_name, last_name, company_name')
          .eq('id', updated.payee_contact_id)
          .maybeSingle(),
        supabase
          .from('leases')
          .select('premises_address, unit_id')
          .eq('id', updated.lease_id)
          .maybeSingle(),
      ]);

      // Fetch the unit suite number if we have the lease
      const unitResult = lease?.unit_id
        ? await supabase
            .from('units')
            .select('suite_number')
            .eq('id', lease.unit_id)
            .maybeSingle()
        : null;

      const payeeEmail = payeeContact?.email;
      if (payeeEmail) {
        const payeeName =
          (updated.payee_name
          ?? payeeContact?.company_name
          ?? [payeeContact?.first_name, payeeContact?.last_name].filter(Boolean).join(' '))
          || 'Landlord';

        void notifyInvoiceSent(
          {
            id: updated.id,
            invoiceNumber: updated.invoice_number,
            propertyAddress: lease?.premises_address ?? '',
            suiteNumber: unitResult?.data?.suite_number ?? '',
            commissionAmount: updated.commission_amount.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
            }),
            dueDate: updated.due_date ?? update.sent_date ?? new Date().toISOString(),
          },
          payeeEmail,
          payeeName,
        );
      }
    }

    return NextResponse.json({ invoice: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update invoice status';
    console.error(`[PATCH /api/invoices/${id}/status] Error:`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
