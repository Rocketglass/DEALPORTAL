/**
 * PATCH /api/invoices/[id]
 *
 * Update editable fields on a commission invoice (currently limited to
 * commission_rate_percent and commission_amount while in 'draft' status).
 *
 * Requires authenticated broker or admin.
 *
 * Body:
 * {
 *   commission_rate_percent: number;   // e.g. 5.0 for 5%
 *   commission_amount: number;         // recalculated commission amount
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

// Service-role client so we can update without RLS restrictions
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

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

  const { commission_rate_percent, commission_amount } = body;

  // Validate required fields
  if (
    typeof commission_rate_percent !== 'number' ||
    commission_rate_percent < 0.1 ||
    commission_rate_percent > 20
  ) {
    return NextResponse.json(
      { error: 'commission_rate_percent must be a number between 0.1 and 20' },
      { status: 400 },
    );
  }

  if (typeof commission_amount !== 'number' || commission_amount < 0) {
    return NextResponse.json(
      { error: 'commission_amount must be a non-negative number' },
      { status: 400 },
    );
  }

  // ------------------------------------------------------------------
  // Persist
  // ------------------------------------------------------------------
  try {
    const supabase = getServiceClient();

    // Verify the invoice exists and is in draft status
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
        { error: 'Commission rate can only be edited on draft invoices' },
        { status: 422 },
      );
    }

    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('commission_invoices')
      .update({
        commission_rate_percent,
        commission_amount,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? 'Update returned no data');
    }

    console.log(
      `[PATCH /api/invoices/${id}] ${existing.invoice_number} commission rate → ${commission_rate_percent}%` +
        ` by ${currentUser.email}`,
    );

    return NextResponse.json({ invoice: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update invoice';
    console.error(`[PATCH /api/invoices/${id}] Error:`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
