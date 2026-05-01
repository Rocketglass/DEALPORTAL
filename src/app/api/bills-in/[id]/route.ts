/**
 * Bills In — operations on a single bill.
 *
 *   PATCH  /api/bills-in/[id]   — update fields (currently only `paid`)
 *   DELETE /api/bills-in/[id]   — delete bill record AND its file
 *
 * Broker / admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  let body: { paid?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body.paid !== 'boolean') {
    return NextResponse.json({ error: 'paid (boolean) is required' }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('bills_in')
      .update({
        paid: body.paid,
        paid_at: body.paid ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, vendor_name, amount, pdf_url, paid, paid_at, created_at')
      .single();

    if (error || !data) {
      console.error(`[PATCH /api/bills-in/${id}]`, error);
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }
    return NextResponse.json({ bill: data });
  } catch (error) {
    console.error(`[PATCH /api/bills-in/${id}] unexpected:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const supabase = getServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bill } = await (supabase as any)
      .from('bills_in')
      .select('id, pdf_url')
      .eq('id', id)
      .maybeSingle();

    if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

    // Remove the storage object first; orphaned DB row is worse than orphaned blob.
    await supabase.storage.from('bills-in').remove([bill.pdf_url]).catch((err) => {
      console.error(`[DELETE /api/bills-in/${id}] storage remove error:`, err);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('bills_in').delete().eq('id', id);
    if (error) {
      console.error(`[DELETE /api/bills-in/${id}]`, error);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[DELETE /api/bills-in/${id}] unexpected:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
