/**
 * POST /api/checklists/[id]/items — Add a new item to a checklist (broker/admin only)
 * GET  /api/checklists/[id]/items — List all items for a checklist
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import type { Database, ChecklistItemAssignment } from '@/types/database';

type ChecklistItemInsert = Database['public']['Tables']['deal_checklist_items']['Insert'];

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface AddItemBody {
  title: string;
  description?: string | null;
  assignedTo: ChecklistItemAssignment;
  dueDate?: string | null;
  displayOrder?: number;
}

export async function POST(
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

    const { id: checklistId } = await params;
    const supabase = await createClient();
    const body: AddItemBody = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 },
      );
    }
    if (!body.assignedTo) {
      return NextResponse.json(
        { error: 'Missing required field: assignedTo' },
        { status: 400 },
      );
    }

    // Verify the checklist exists
    const { data: checklist, error: checklistError } = await supabase
      .from('deal_checklists')
      .select('id')
      .eq('id', checklistId)
      .single();

    if (checklistError || !checklist) {
      return NextResponse.json(
        { error: 'Checklist not found' },
        { status: 404 },
      );
    }

    // If no displayOrder provided, put it at the end
    let displayOrder: number = body.displayOrder ?? 0;
    if (body.displayOrder === undefined) {
      const { data: lastItem } = await supabase
        .from('deal_checklist_items')
        .select('display_order')
        .eq('checklist_id', checklistId)
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      displayOrder = (lastItem?.display_order ?? 0) + 1;
    }

    const itemData: ChecklistItemInsert = {
      checklist_id: checklistId,
      title: body.title,
      description: body.description ?? null,
      assigned_to: body.assignedTo,
      due_date: body.dueDate ?? null,
      display_order: displayOrder,
      is_completed: false,
      completed_at: null,
      completed_by: null,
      file_url: null,
      file_name: null,
      notes: null,
    };

    const { data: item, error: insertError } = await supabase
      .from('deal_checklist_items')
      .insert(itemData)
      .select()
      .single();

    if (insertError) {
      console.error('[POST /api/checklists/[id]/items] Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Audit log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'checklist_item_added',
      entity_type: 'deal_checklist_item',
      entity_id: item.id,
      new_value: { checklist_id: checklistId, title: body.title },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/checklists/[id]/items] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    // Auth required to list items
    try {
      await requireBrokerOrAdminForApi();
    } catch (authError) {
      return NextResponse.json(
        { error: (authError as Error).message },
        { status: 401 },
      );
    }

    const { id: checklistId } = await params;
    const supabase = await createClient();

    // Verify the checklist exists
    const { data: checklist, error: checklistError } = await supabase
      .from('deal_checklists')
      .select('id')
      .eq('id', checklistId)
      .single();

    if (checklistError || !checklist) {
      return NextResponse.json(
        { error: 'Checklist not found' },
        { status: 404 },
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from('deal_checklist_items')
      .select('*')
      .eq('checklist_id', checklistId)
      .order('display_order', { ascending: true });

    if (itemsError) {
      console.error('[GET /api/checklists/[id]/items] Query error:', itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    return NextResponse.json({ items: items ?? [] });
  } catch (error) {
    console.error('[GET /api/checklists/[id]/items] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
