/**
 * POST /api/checklists
 *
 * Creates a new deal checklist for a lease, including all initial items.
 * Requires an authenticated broker or admin user.
 *
 * Body:
 *   leaseId   string   — required
 *   title     string   — optional (defaults to "Deal Checklist")
 *   items     array    — required, at least one item
 *     title        string  — required
 *     description  string  — optional
 *     assignedTo   ChecklistItemAssignment — required
 *     dueDate      string  — optional (ISO date)
 *     displayOrder number  — required
 *
 * Returns: { id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import type { Database, ChecklistItemAssignment } from '@/types/database';

type ChecklistInsert = Database['public']['Tables']['deal_checklists']['Insert'];
type ChecklistItemInsert = Database['public']['Tables']['deal_checklist_items']['Insert'];

interface ItemPayload {
  title: string;
  description?: string | null;
  assignedTo: ChecklistItemAssignment;
  dueDate?: string | null;
  displayOrder: number;
}

interface CreateChecklistBody {
  leaseId: string;
  title?: string;
  items: ItemPayload[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Require broker or admin role
    let user;
    try {
      user = await requireBrokerOrAdminForApi();
    } catch (authError) {
      return NextResponse.json(
        { error: (authError as Error).message },
        { status: 401 },
      );
    }

    const supabase = await createClient();
    const body: CreateChecklistBody = await request.json();

    // Validate required fields
    if (!body.leaseId) {
      return NextResponse.json(
        { error: 'Missing required field: leaseId' },
        { status: 400 },
      );
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'At least one checklist item is required' },
        { status: 400 },
      );
    }

    // Verify the lease exists
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('id')
      .eq('id', body.leaseId)
      .single();

    if (leaseError || !lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 },
      );
    }

    // Insert the checklist
    const checklistData: ChecklistInsert = {
      lease_id: body.leaseId,
      title: body.title ?? 'Deal Checklist',
      status: 'active',
      created_by: user.contactId ?? user.id,
    };

    const { data: checklist, error: checklistError } = await supabase
      .from('deal_checklists')
      .insert(checklistData)
      .select()
      .single();

    if (checklistError) {
      console.error('[POST /api/checklists] Checklist insert error:', checklistError);
      return NextResponse.json({ error: checklistError.message }, { status: 500 });
    }

    // Insert all items
    const itemRows: ChecklistItemInsert[] = body.items.map((item) => ({
      checklist_id: checklist.id,
      title: item.title,
      description: item.description ?? null,
      assigned_to: item.assignedTo,
      due_date: item.dueDate ?? null,
      display_order: item.displayOrder,
      is_completed: false,
      completed_at: null,
      completed_by: null,
      file_url: null,
      file_name: null,
      notes: null,
    }));

    const { error: itemsError } = await supabase
      .from('deal_checklist_items')
      .insert(itemRows);

    if (itemsError) {
      console.error('[POST /api/checklists] Items insert error:', itemsError);
      // Roll back the checklist so we don't have orphaned records
      await supabase.from('deal_checklists').delete().eq('id', checklist.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Audit log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'checklist_created',
      entity_type: 'deal_checklist',
      entity_id: checklist.id,
      new_value: { lease_id: body.leaseId, item_count: body.items.length },
    });

    return NextResponse.json({ id: checklist.id }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/checklists] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
