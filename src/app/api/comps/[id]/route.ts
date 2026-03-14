/**
 * PATCH /api/comps/[id] — Update a comparable transaction
 * DELETE /api/comps/[id] — Delete a comparable transaction
 *
 * Requires an authenticated broker or admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Missing comp id' }, { status: 400 });
    }

    const supabase = await createClient();
    const body = await request.json();

    // Strip out fields that must never be overwritten
    const { id: _id, created_at: _createdAt, ...updateFields } = body;

    const { data: comp, error: updateError } = await supabase
      .from('comparable_transactions')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error(`[PATCH /api/comps/${id}] Update error:`, updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ comp });
  } catch (error) {
    console.error('[PATCH /api/comps/[id]] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Missing comp id' }, { status: 400 });
    }

    const supabase = await createClient();

    const { error: deleteError } = await supabase
      .from('comparable_transactions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error(`[DELETE /api/comps/${id}] Delete error:`, deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/comps/[id]] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
