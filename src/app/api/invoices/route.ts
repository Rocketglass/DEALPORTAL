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
import { BROKER_CONFIG } from '@/lib/config/broker';

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
    suite_sf,
    lessee_name,
    description,
    // commission_amount is no longer accepted from clients — server derives it
    // below from rate × total × split. Drop it on the floor if anyone sends it.
    commission_rate_percent,
    total_consideration,
    lease_term_months,
    monthly_rent,
    due_date,
    notes,
    commission_split_percent,
    split_with_agent,
    invoice_number: invoiceNumberOverride,
    save_as_comp,
    comp_city,
    comp_state,
    comp_zip,
    comp_transaction_date,
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
  // commission_amount is now derived server-side from total × rate × split.
  // The two inputs (commission_rate_percent and total_consideration) are
  // required; any client-supplied commission_amount is ignored.
  if (
    typeof commission_rate_percent !== 'number' ||
    commission_rate_percent <= 0 ||
    commission_rate_percent > 100
  ) {
    return NextResponse.json(
      { error: 'commission_rate_percent is required and must be between 0 and 100' },
      { status: 400 },
    );
  }
  if (typeof total_consideration !== 'number' || total_consideration <= 0) {
    return NextResponse.json(
      { error: 'total_consideration is required and must be a positive number' },
      { status: 400 },
    );
  }

  // Optional commission split validation
  if (
    commission_split_percent !== undefined &&
    commission_split_percent !== null &&
    (typeof commission_split_percent !== 'number' || commission_split_percent < 1 || commission_split_percent > 100)
  ) {
    return NextResponse.json(
      { error: 'commission_split_percent must be a number between 1 and 100' },
      { status: 400 },
    );
  }

  if (
    split_with_agent !== undefined &&
    split_with_agent !== null &&
    typeof split_with_agent !== 'string'
  ) {
    return NextResponse.json(
      { error: 'split_with_agent must be a string' },
      { status: 400 },
    );
  }

  // ------------------------------------------------------------------
  // Resolve invoice number — accept user override, otherwise auto-generate
  // ------------------------------------------------------------------
  let invoiceNumber: string;
  if (
    typeof invoiceNumberOverride === 'string' &&
    invoiceNumberOverride.trim()
  ) {
    const trimmed = invoiceNumberOverride.trim();
    if (trimmed.length > 32) {
      return NextResponse.json(
        { error: 'invoice_number must be 32 characters or fewer' },
        { status: 400 },
      );
    }
    // Reject duplicates so the unique invoice_number stays unique.
    const { data: existingByNumber } = await (await createClient())
      .from('commission_invoices')
      .select('id')
      .eq('invoice_number', trimmed)
      .maybeSingle();
    if (existingByNumber) {
      return NextResponse.json(
        { error: `Invoice number "${trimmed}" already exists` },
        { status: 409 },
      );
    }
    invoiceNumber = trimmed;
  } else {
    const { data: generated, error: numError } = await getNextInvoiceNumber();
    if (numError || !generated) {
      return NextResponse.json(
        { error: `Failed to generate invoice number: ${numError}` },
        { status: 500 },
      );
    }
    invoiceNumber = generated;
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
  // Derive commission_amount server-side: total × rate × split share.
  // Client-supplied commission_amount is ignored on purpose so the displayed
  // value matches the saved value and can never drift from the inputs.
  // ------------------------------------------------------------------
  const splitShare =
    typeof commission_split_percent === 'number' && commission_split_percent > 0 && commission_split_percent <= 100
      ? commission_split_percent / 100
      : 1;
  const derivedCommissionAmount =
    Math.round(total_consideration * (commission_rate_percent / 100) * splitShare * 100) / 100;

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
      total_consideration,
      commission_rate_percent,
      commission_amount: derivedCommissionAmount,
      payee_name: payee_name as string,
      payee_address: typeof payee_address === 'string' ? payee_address : null,
      payee_city_state_zip: null,
      property_address:
        typeof property_address === 'string' && property_address.trim()
          ? property_address.trim()
          : null,
      suite_number:
        typeof suite_number === 'string' && suite_number.trim()
          ? suite_number.trim()
          : null,
      suite_sf:
        typeof suite_sf === 'number' && Number.isInteger(suite_sf) && suite_sf > 0
          ? suite_sf
          : null,
      lessee_name:
        typeof lessee_name === 'string' && lessee_name.trim()
          ? lessee_name.trim()
          : null,
      payment_instructions: BROKER_CONFIG.paymentInstructions(invoiceNumber),
      status: 'draft',
      sent_date: null,
      due_date: resolvedDueDate,
      paid_date: null,
      paid_amount: null,
      payment_method: null,
      payment_reference: null,
      pdf_url: null,
      notes: typeof notes === 'string' ? `${fullDescription}\n\n${notes}` : fullDescription,
      commission_split_percent: typeof commission_split_percent === 'number' ? commission_split_percent : 100,
      split_with_agent: typeof split_with_agent === 'string' ? split_with_agent : null,
    })
    .select()
    .single();

  if (insertError || !invoice) {
    console.error('[POST /api/invoices] Insert error:', insertError);
    return NextResponse.json(
      { error: 'Failed to create the invoice' },
      { status: 500 },
    );
  }

  console.log(
    `[POST /api/invoices] Manual invoice ${invoice.invoice_number} created by ${currentUser.email}`,
  );

  // -----------------------------------------------------------------
  // Optionally save the underlying lease as a comp record. Best-effort —
  // never fails the invoice creation. Needs at least address + city + SF.
  // -----------------------------------------------------------------
  let compResult: { id: string } | null = null;
  if (save_as_comp === true) {
    const compAddress = typeof property_address === 'string' ? property_address.trim() : '';
    const compCity = typeof comp_city === 'string' ? comp_city.trim() : '';
    const compStateClean =
      typeof comp_state === 'string' && comp_state.trim()
        ? comp_state.trim().toUpperCase().slice(0, 2)
        : 'CA';
    const sfValue =
      typeof suite_sf === 'number' && Number.isInteger(suite_sf) && suite_sf > 0
        ? suite_sf
        : null;
    const monthly = typeof monthly_rent === 'number' && monthly_rent > 0 ? monthly_rent : null;
    const termMonths =
      typeof lease_term_months === 'number' && lease_term_months > 0 ? lease_term_months : null;
    const txDate =
      typeof comp_transaction_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(comp_transaction_date)
        ? comp_transaction_date
        : new Date().toISOString().slice(0, 10);
    const rentPerSqftAnnual =
      sfValue && monthly ? Math.round((monthly * 12 / sfValue) * 100) / 100 : null;

    if (compAddress && compCity) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: comp, error: compError } = await (supabase as any)
        .from('comparable_transactions')
        .insert({
          property_id: null,
          address: compAddress,
          city: compCity,
          state: compStateClean,
          property_type: null,
          transaction_type: 'lease',
          transaction_date: txDate,
          tenant_name: typeof lessee_name === 'string' && lessee_name.trim() ? lessee_name.trim() : null,
          sf: sfValue,
          monthly_rent: monthly,
          rent_per_sqft: rentPerSqftAnnual,
          lease_term_months: termMonths,
          sale_price: null,
          price_per_sqft: null,
          cap_rate: null,
          notes: `Auto-generated from lease upload for invoice ${invoice.invoice_number}`,
          source: 'lease-upload',
          created_by: brokerContactId,
        })
        .select('id')
        .single();

      if (compError) {
        // Don't fail the invoice — just log. The user already has their invoice.
        console.error('[POST /api/invoices] comp insert failed:', compError);
      } else {
        compResult = comp;
        console.log(
          `[POST /api/invoices] comp ${comp.id} created alongside invoice ${invoice.invoice_number}`,
        );
      }
    } else {
      console.log(
        `[POST /api/invoices] save_as_comp requested but address/city missing — skipped`,
      );
    }
  }

  if (typeof comp_zip === 'string') void comp_zip; // explicit no-op until comps gain a zip column

  return NextResponse.json({ invoice, comp: compResult }, { status: 201 });
}
