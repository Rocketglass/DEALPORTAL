/**
 * GET  /api/checklists/[id]  — Get checklist with all items (broker/admin only)
 * PATCH /api/checklists/[id] — Update checklist title or status (broker/admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    let user;
    try {
      user = await requireBrokerOrAdminForApi();
    } catch (authError) {
      return NextResponse.json(
        { error: (authError as Error).message },
        { status: 401 },
      );
    }

    const { id } = await params;
    const supabase = await createClient();

    // Fetch checklist
    const { data: checklist, error: checklistError } = await supabase
      .from('deal_checklists')
      .select('*')
      .eq('id', id)
      .single();

    if (checklistError || !checklist) {
      return NextResponse.json(
        { error: 'Checklist not found' },
        { status: 404 },
      );
    }

    // Fetch items ordered by display_order
    const { data: items, error: itemsError } = await supabase
      .from('deal_checklist_items')
      .select('*')
      .eq('checklist_id', id)
      .order('display_order', { ascending: true });

    if (itemsError) {
      console.error('[GET /api/checklists/[id]] Items query error:', itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    return NextResponse.json({
      checklist: {
        ...checklist,
        items: items ?? [],
      },
    });
  } catch (error) {
    console.error('[GET /api/checklists/[id]] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface PatchChecklistBody {
  title?: string;
  status?: 'active' | 'completed' | 'archived';
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    let user;
    try {
      user = await requireBrokerOrAdminForApi();
    } catch (authError) {
      return NextResponse.json(
        { error: (authError as Error).message },
        { status: 401 },
      );
    }

    const { id } = await params;
    const supabase = await createClient();
    const body: PatchChecklistBody = await request.json();

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.status !== undefined) {
      const validStatuses = ['active', 'completed', 'archived'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 },
        );
      }
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 },
      );
    }

    const { data: checklist, error: updateError } = await supabase
      .from('deal_checklists')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[PATCH /api/checklists/[id]] Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!checklist) {
      return NextResponse.json(
        { error: 'Checklist not found' },
        { status: 404 },
      );
    }

    // Audit log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'checklist_updated',
      entity_type: 'deal_checklist',
      entity_id: id,
      new_value: updates,
    });

    return NextResponse.json({ checklist });
  } catch (error) {
    console.error('[PATCH /api/checklists/[id]] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
