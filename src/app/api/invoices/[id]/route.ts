/**
 * PATCH /api/invoices/[id]
 *
 * Update editable fields on a commission invoice. Only invoices in 'draft'
 * status can be edited (once sent or paid, the document is locked).
 *
 * Requires authenticated broker or admin.
 *
 * Body — all fields optional, server validates and updates only what's sent:
 * {
 *   invoice_number?: string;
 *   payee_name?: string;
 *   payee_address?: string | null;
 *   payee_city_state_zip?: string | null;
 *   property_address?: string | null;
 *   suite_number?: string | null;
 *   lessee_name?: string | null;
 *   lease_term_months?: number;
 *   monthly_rent?: number;
 *   total_consideration?: number;
 *   commission_rate_percent?: number;
 *   commission_amount?: number;    // recalculated derived value
 *   commission_split_percent?: number;
 *   split_with_agent?: string | null;
 *   due_date?: string;             // ISO date
 *   notes?: string | null;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

type Updatable = Record<string, unknown>;

function trimOrNull(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // ------------------------------------------------------------------
  // Load existing invoice — confirm exists and is editable
  // ------------------------------------------------------------------
  const { data: existing, error: findError } = await supabase
    .from('commission_invoices')
    .select('id, invoice_number, status')
    .eq('id', id)
    .single();

  if (findError || !existing) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  if (existing.status !== 'draft') {
    return NextResponse.json(
      { error: 'Only draft invoices can be edited' },
      { status: 422 },
    );
  }

  // ------------------------------------------------------------------
  // Build update payload, validating each field
  // ------------------------------------------------------------------
  const update: Updatable = { updated_at: new Date().toISOString() };

  // invoice_number — uniqueness check
  if ('invoice_number' in body) {
    const num = body.invoice_number;
    if (typeof num !== 'string' || !num.trim()) {
      return NextResponse.json(
        { error: 'invoice_number must be a non-empty string' },
        { status: 400 },
      );
    }
    const trimmed = num.trim();
    if (trimmed.length > 32) {
      return NextResponse.json(
        { error: 'invoice_number must be 32 characters or fewer' },
        { status: 400 },
      );
    }
    if (trimmed !== existing.invoice_number) {
      const { data: collision } = await supabase
        .from('commission_invoices')
        .select('id')
        .eq('invoice_number', trimmed)
        .neq('id', id)
        .maybeSingle();
      if (collision) {
        return NextResponse.json(
          { error: `Invoice number "${trimmed}" already exists` },
          { status: 409 },
        );
      }
      update.invoice_number = trimmed;
    }
  }

  // Free-text fields — trim and null-out empty strings
  for (const field of [
    'payee_name',
    'payee_address',
    'payee_city_state_zip',
    'property_address',
    'suite_number',
    'lessee_name',
    'split_with_agent',
    'notes',
  ] as const) {
    if (field in body) {
      const cleaned = trimOrNull(body[field]);
      if (cleaned !== undefined) update[field] = cleaned;
    }
  }

  // Numeric fields
  const numericFields: Array<{
    key: string;
    min?: number;
    max?: number;
    integer?: boolean;
  }> = [
    { key: 'lease_term_months', min: 0, integer: true },
    { key: 'monthly_rent', min: 0 },
    { key: 'total_consideration', min: 0 },
    { key: 'commission_rate_percent', min: 0, max: 100 },
    { key: 'commission_amount', min: 0 },
    { key: 'commission_split_percent', min: 1, max: 100 },
  ];

  for (const { key, min, max, integer } of numericFields) {
    if (key in body) {
      const v = body[key];
      if (typeof v !== 'number' || Number.isNaN(v)) {
        return NextResponse.json(
          { error: `${key} must be a number` },
          { status: 400 },
        );
      }
      if (integer && !Number.isInteger(v)) {
        return NextResponse.json(
          { error: `${key} must be an integer` },
          { status: 400 },
        );
      }
      if (typeof min === 'number' && v < min) {
        return NextResponse.json(
          { error: `${key} must be ≥ ${min}` },
          { status: 400 },
        );
      }
      if (typeof max === 'number' && v > max) {
        return NextResponse.json(
          { error: `${key} must be ≤ ${max}` },
          { status: 400 },
        );
      }
      update[key] = v;
    }
  }

  // due_date — ISO date (YYYY-MM-DD)
  if ('due_date' in body) {
    const dd = body.due_date;
    if (dd === null) {
      update.due_date = null;
    } else if (typeof dd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dd)) {
      update.due_date = dd;
    } else {
      return NextResponse.json(
        { error: 'due_date must be YYYY-MM-DD' },
        { status: 400 },
      );
    }
  }

  // Reject the no-op update
  if (Object.keys(update).length === 1) {
    return NextResponse.json(
      { error: 'No editable fields provided' },
      { status: 400 },
    );
  }

  // ------------------------------------------------------------------
  // Persist
  // ------------------------------------------------------------------
  try {
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
      `[PATCH /api/invoices/${id}] ${existing.invoice_number} updated by ${currentUser.email}` +
        ` (fields: ${Object.keys(update).filter((k) => k !== 'updated_at').join(', ')})`,
    );

    return NextResponse.json({ invoice: updated });
  } catch (error) {
    console.error(`[PATCH /api/invoices/${id}] Error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
