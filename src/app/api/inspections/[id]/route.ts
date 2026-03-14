/**
 * PATCH /api/inspections/[id]
 *
 * Broker endpoint — update an inspection booking (e.g., cancel it).
 * Requires authenticated broker or admin.
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
      return NextResponse.json({ error: 'Missing booking id' }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body as { status: string };

    const validStatuses = ['confirmed', 'cancelled', 'completed', 'no_show'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Get the booking first so we know the slot_id
    const { data: existingBooking, error: fetchError } = await supabase
      .from('inspection_bookings')
      .select('id, slot_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Update the booking status
    const { data: booking, error: updateError } = await supabase
      .from('inspection_bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error(`[PATCH /api/inspections/${id}] Update error:`, updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If cancelled, re-open the slot
    if (status === 'cancelled' && existingBooking.slot_id) {
      await supabase
        .from('inspection_slots')
        .update({ is_available: true })
        .eq('id', existingBooking.slot_id);
    }

    return NextResponse.json({ booking }, { status: 200 });
  } catch (error) {
    console.error('[PATCH /api/inspections/[id]] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
