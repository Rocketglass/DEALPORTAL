/**
 * POST /api/invoices
 *
 * Create a manual commission invoice not tied to a specific lease.
 * Useful for lease renewal commissions, ad-hoc billing, etc.
 *
 * Requires authenticated broker or admin.
 *
 * Body: {
 *   payee_name: string;
 *   payee_email: string;
 *   payee_address?: string;
 *   property_address: string;
 *   suite_number?: string;
 *   description: string;
 *   commission_amount: number;
 *   commission_rate_percent?: number;
 *   total_consideration?: number;
 *   lease_term_months?: number;
 *   monthly_rent?: number;
 *   due_date?: string;
 *   notes?: string;
 * }
 *
 * Returns: { invoice: CommissionInvoice }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { getNextInvoiceNumber } from '@/lib/queries/invoices';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ------------------------------------------------------------------
  // Auth check — broker or admin only
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

  // ------------------------------------------------------------------
  // Parse and validate body
  // ------------------------------------------------------------------
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    payee_name,
    payee_email,
    payee_address,
    property_address,
    suite_number,
    description,
    commission_amount,
    commission_rate_percent,
    total_consideration,
    lease_term_months,
    monthly_rent,
    due_date,
    notes,
  } = body as Record<string, unknown>;

  // Required fields
  if (!payee_name || typeof payee_name !== 'string') {
    return NextResponse.json(
      { error: 'payee_name is required and must be a string' },
      { status: 400 },
    );
  }
  if (!payee_email || typeof payee_email !== 'string') {
    return NextResponse.json(
      { error: 'payee_email is required and must be a string' },
      { status: 400 },
    );
  }
  if (!property_address || typeof property_address !== 'string') {
    return NextResponse.json(
      { error: 'property_address is required and must be a string' },
      { status: 400 },
    );
  }
  if (!description || typeof description !== 'string') {
    return NextResponse.json(
      { error: 'description is required and must be a string' },
      { status: 400 },
    );
  }
  if (typeof commission_amount !== 'number' || commission_amount <= 0) {
    return NextResponse.json(
      { error: 'commission_amount is required and must be a positive number' },
      { status: 400 },
    );
  }

  // Optional field validation
  if (
    commission_rate_percent !== undefined &&
    commission_rate_percent !== null &&
    (typeof commission_rate_percent !== 'number' || commission_rate_percent < 0 || commission_rate_percent > 100)
  ) {
    return NextResponse.json(
      { error: 'commission_rate_percent must be a number between 0 and 100' },
      { status: 400 },
    );
  }

  // ------------------------------------------------------------------
  // Get next invoice number
  // ------------------------------------------------------------------
  const { data: invoiceNumber, error: numError } = await getNextInvoiceNumber();
  if (numError || !invoiceNumber) {
    return NextResponse.json(
      { error: `Failed to generate invoice number: ${numError}` },
      { status: 500 },
    );
  }

  // ------------------------------------------------------------------
  // Upsert payee contact — find or create by email
  // ------------------------------------------------------------------
  const supabase = await createClient();

  let payeeContactId: string;
  const { data: existingContact } = await supabase
    .from('contacts')
    .select('id')
    .eq('email', (payee_email as string).toLowerCase())
    .limit(1)
    .maybeSingle();

  if (existingContact) {
    payeeContactId = existingContact.id;
  } else {
    // Split payee_name into first/last as best we can
    const nameParts = (payee_name as string).trim().split(/\s+/);
    const firstName = nameParts[0] || null;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

    const { data: newContact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        type: 'landlord' as const,
        first_name: firstName,
        last_name: lastName,
        email: (payee_email as string).toLowerCase(),
        address: typeof payee_address === 'string' ? payee_address : null,
        company_name: null,
        dba_name: null,
        entity_type: null,
        phone: null,
        city: null,
        state: null,
        zip: null,
        industry: null,
        website: null,
        notes: null,
        tags: [],
      })
      .select('id')
      .single();

    if (contactError || !newContact) {
      return NextResponse.json(
        { error: `Failed to create payee contact: ${contactError?.message}` },
        { status: 500 },
      );
    }
    payeeContactId = newContact.id;
  }

  // ------------------------------------------------------------------
  // Resolve broker contact ID from the authenticated user
  // ------------------------------------------------------------------
  const brokerContactId = currentUser.contactId;
  if (!brokerContactId) {
    return NextResponse.json(
      { error: 'Your user account does not have an associated contact record' },
      { status: 400 },
    );
  }

  // ------------------------------------------------------------------
  // Calculate due date (default 30 days from now)
  // ------------------------------------------------------------------
  let resolvedDueDate: string;
  if (typeof due_date === 'string' && due_date) {
    resolvedDueDate = due_date;
  } else {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    resolvedDueDate = d.toISOString().slice(0, 10);
  }

  // ------------------------------------------------------------------
  // Build the description with property/suite context
  // ------------------------------------------------------------------
  const fullDescription = suite_number
    ? `${description} — ${property_address}, Suite ${suite_number}`
    : `${description} — ${property_address}`;

  // ------------------------------------------------------------------
  // Insert the invoice
  // ------------------------------------------------------------------
  const { data: invoice, error: insertError } = await supabase
    .from('commission_invoices')
    .insert({
      lease_id: null,
      invoice_number: invoiceNumber,
      broker_contact_id: brokerContactId,
      payee_contact_id: payeeContactId,
      lease_term_months: typeof lease_term_months === 'number' ? lease_term_months : 0,
      monthly_rent: typeof monthly_rent === 'number' ? monthly_rent : 0,
      total_consideration: typeof total_consideration === 'number' ? total_consideration : 0,
      commission_rate_percent: typeof commission_rate_percent === 'number' ? commission_rate_percent : 0,
      commission_amount: commission_amount as number,
      payee_name: payee_name as string,
      payee_address: typeof payee_address === 'string' ? payee_address : null,
      payee_city_state_zip: null,
      payment_instructions:
        'Please make check payable to:\nRocket Glass, Inc.\n1234 Commercial Blvd, Suite 200\nSan Diego, CA 92101\n\nOr wire to:\nBank: First Republic Bank\nRouting: XXXXXXXXX\nAccount: XXXXXXXXX\nRef: ' +
        invoiceNumber,
      status: 'draft',
      sent_date: null,
      due_date: resolvedDueDate,
      paid_date: null,
      paid_amount: null,
      payment_method: null,
      payment_reference: null,
      pdf_url: null,
      notes: typeof notes === 'string' ? `${fullDescription}\n\n${notes}` : fullDescription,
    })
    .select()
    .single();

  if (insertError || !invoice) {
    console.error('[POST /api/invoices] Insert error:', insertError);
    return NextResponse.json(
      { error: `Failed to create invoice: ${insertError?.message}` },
      { status: 500 },
    );
  }

  console.log(
    `[POST /api/invoices] Manual invoice ${invoice.invoice_number} created by ${currentUser.email}`,
  );

  return NextResponse.json({ invoice }, { status: 201 });
}
