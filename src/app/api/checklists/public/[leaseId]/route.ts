/**
 * GET /api/checklists/public/[leaseId]
 *
 * Public endpoint — no auth required.
 * Returns the deal checklist and its items for a given lease.
 * Accessed via link sent to tenant/landlord parties.
 *
 * Uses the service-role client to bypass RLS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RouteParams {
  params: Promise<{ leaseId: string }>;
}

// Service role client — bypasses RLS for unauthenticated lookups
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { leaseId } = await params;

    if (!leaseId) {
      return NextResponse.json(
        { error: 'Lease ID is required' },
        { status: 400 },
      );
    }

    const supabase = getServiceClient();

    // Fetch the checklist for this lease
    const { data: checklist, error: checklistError } = await supabase
      .from('deal_checklists')
      .select('id, lease_id, title, status, created_at')
      .eq('lease_id', leaseId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (checklistError) {
      console.error('[GET /api/checklists/public/[leaseId]] Checklist query error:', checklistError);
      return NextResponse.json({ error: 'Failed to fetch checklist' }, { status: 500 });
    }

    if (!checklist) {
      return NextResponse.json(
        { checklist: null, items: [] },
      );
    }

    // Fetch all items for the checklist, ordered by display_order
    const { data: items, error: itemsError } = await supabase
      .from('deal_checklist_items')
      .select(
        'id, title, description, assigned_to, display_order, is_completed, completed_at, due_date, file_url, file_name, notes',
      )
      .eq('checklist_id', checklist.id)
      .order('display_order', { ascending: true });

    if (itemsError) {
      console.error('[GET /api/checklists/public/[leaseId]] Items query error:', itemsError);
      return NextResponse.json({ error: 'Failed to fetch checklist items' }, { status: 500 });
    }

    // Fetch minimal lease info for context (property address, parties)
    const { data: lease } = await supabase
      .from('leases')
      .select('premises_address, premises_city, premises_state, lessee_name, lessor_name')
      .eq('id', leaseId)
      .single();

    return NextResponse.json({
      checklist: {
        id: checklist.id,
        title: checklist.title,
        status: checklist.status,
        createdAt: checklist.created_at,
      },
      lease: lease
        ? {
            address: `${lease.premises_address}, ${lease.premises_city}, ${lease.premises_state}`,
            tenantName: lease.lessee_name,
            landlordName: lease.lessor_name,
          }
        : null,
      items: (items ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        assignedTo: item.assigned_to,
        displayOrder: item.display_order,
        isCompleted: item.is_completed,
        completedAt: item.completed_at,
        dueDate: item.due_date,
        fileUrl: item.file_url,
        fileName: item.file_name,
        notes: item.notes,
      })),
    });
  } catch (error) {
    console.error('[GET /api/checklists/public/[leaseId]] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
