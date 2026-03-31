/**
 * GET /api/comps — List comparable transactions
 * POST /api/comps — Create a comparable transaction
 *
 * Requires an authenticated broker or admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

export async function GET(): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('comparable_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('[GET /api/comps] Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comps: data });
  } catch (error) {
    console.error('[GET /api/comps] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireBrokerOrAdminForApi();
    const supabase = await createClient();
    const body = await request.json();

    // Required field validation
    const requiredFields = ['address', 'city', 'transaction_type', 'transaction_date'];
    for (const field of requiredFields) {
      const val = body[field];
      if (val === undefined || val === null || String(val).trim() === '') {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 },
        );
      }
    }

    // Validate transaction_type
    if (!['lease', 'sale'].includes(body.transaction_type)) {
      return NextResponse.json(
        { error: 'transaction_type must be "lease" or "sale"' },
        { status: 400 },
      );
    }

    function toNullableNumber(v: unknown): number | null {
      if (v === '' || v === null || v === undefined) return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    }

    function toNullableString(v: unknown): string | null {
      if (v === '' || v === null || v === undefined) return null;
      return String(v).trim();
    }

    const insertPayload = {
      property_id: toNullableString(body.property_id),
      address: String(body.address).trim(),
      city: String(body.city).trim(),
      state: toNullableString(body.state) ?? 'CA',
      property_type: toNullableString(body.property_type),
      transaction_type: body.transaction_type,
      transaction_date: body.transaction_date,
      tenant_name: toNullableString(body.tenant_name),
      sf: toNullableNumber(body.sf),
      rent_per_sqft: toNullableNumber(body.rent_per_sqft),
      monthly_rent: toNullableNumber(body.monthly_rent),
      lease_term_months: toNullableNumber(body.lease_term_months),
      sale_price: toNullableNumber(body.sale_price),
      price_per_sqft: toNullableNumber(body.price_per_sqft),
      cap_rate: toNullableNumber(body.cap_rate),
      notes: toNullableString(body.notes),
      source: toNullableString(body.source) ?? 'manual',
      created_by: user.contactId ?? null,
    };

    const { data: comp, error: insertError } = await supabase
      .from('comparable_transactions')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error('[POST /api/comps] Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ comp }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/comps] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
