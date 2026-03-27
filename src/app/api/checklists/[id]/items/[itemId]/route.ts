/**
 * PATCH  /api/checklists/[id]/items/[itemId] — Update an item (complete, add notes, upload file)
 * DELETE /api/checklists/[id]/items/[itemId] — Remove an item (broker/admin only)
 *
 * PATCH is accessible publicly (via link sent to parties) — no auth required.
 * DELETE requires broker/admin auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

// Service role client — bypasses RLS for public item updates
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

interface PatchItemBody {
  isCompleted?: boolean;
  notes?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id: checklistId, itemId } = await params;
    const supabase = getServiceClient();
    const body: PatchItemBody = await request.json();

    // Verify the item exists and belongs to this checklist
    const { data: existingItem, error: lookupError } = await supabase
      .from('deal_checklist_items')
      .select('id, checklist_id')
      .eq('id', itemId)
      .eq('checklist_id', checklistId)
      .single();

    if (lookupError || !existingItem) {
      return NextResponse.json(
        { error: 'Checklist item not found' },
        { status: 404 },
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (body.isCompleted !== undefined) {
      updates.is_completed = body.isCompleted;
      if (body.isCompleted) {
        updates.completed_at = new Date().toISOString();
        // completed_by is set to 'public' since this can be accessed without auth
        // When accessed by an authenticated user, we try to resolve their identity
        updates.completed_by = 'public';

        // Attempt to get the authenticated user if available (non-blocking)
        try {
          const authSupabase = await createAuthClient();
          const { data: { user } } = await authSupabase.auth.getUser();
          if (user) {
            const { data: dbUser } = await authSupabase
              .from('users')
              .select('id')
              .eq('auth_provider_id', user.id)
              .eq('is_active', true)
              .maybeSingle();
            if (dbUser) {
              updates.completed_by = dbUser.id;
            }
          }
        } catch {
          // No auth available — that's fine for public access
        }
      } else {
        // Un-completing an item
        updates.completed_at = null;
        updates.completed_by = null;
      }
    }

    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.fileUrl !== undefined) updates.file_url = body.fileUrl;
    if (body.fileName !== undefined) updates.file_name = body.fileName;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 },
      );
    }

    const { data: item, error: updateError } = await supabase
      .from('deal_checklist_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) {
      console.error('[PATCH /api/checklists/[id]/items/[itemId]] Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Audit log (best-effort, non-blocking)
    void supabase.from('audit_log').insert({
      user_id: updates.completed_by === 'public' ? null : (updates.completed_by as string | undefined) ?? null,
      action: 'checklist_item_updated',
      entity_type: 'deal_checklist_item',
      entity_id: itemId,
      new_value: updates,
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('[PATCH /api/checklists/[id]/items/[itemId]] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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

    const { id: checklistId, itemId } = await params;
    const supabase = await createAuthClient();

    // Verify the item exists and belongs to this checklist
    const { data: existingItem, error: lookupError } = await supabase
      .from('deal_checklist_items')
      .select('id, checklist_id, title')
      .eq('id', itemId)
      .eq('checklist_id', checklistId)
      .single();

    if (lookupError || !existingItem) {
      return NextResponse.json(
        { error: 'Checklist item not found' },
        { status: 404 },
      );
    }

    const { error: deleteError } = await supabase
      .from('deal_checklist_items')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      console.error('[DELETE /api/checklists/[id]/items/[itemId]] Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Audit log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'checklist_item_deleted',
      entity_type: 'deal_checklist_item',
      entity_id: itemId,
      old_value: { title: existingItem.title, checklist_id: checklistId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/checklists/[id]/items/[itemId]] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
