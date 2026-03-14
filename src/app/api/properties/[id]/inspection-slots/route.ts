/**
 * POST /api/properties/[id]/inspection-slots
 *
 * Broker creates available inspection time slots for a property.
 * Accepts an array of { start_time, end_time } objects.
 *
 * GET /api/properties/[id]/inspection-slots
 *
 * Public endpoint — returns available future slots for a property.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = await requireBrokerOrAdminForApi();

    const { id: propertyId } = await context.params;
    if (!propertyId) {
      return NextResponse.json({ error: 'Missing property id' }, { status: 400 });
    }

    const body = await request.json();
    const { slots } = body as { slots: Array<{ start_time: string; end_time: string }> };

    if (!Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json(
        { error: 'slots must be a non-empty array of { start_time, end_time }' },
        { status: 400 },
      );
    }

    // Validate each slot
    for (const slot of slots) {
      if (!slot.start_time || !slot.end_time) {
        return NextResponse.json(
          { error: 'Each slot must have start_time and end_time' },
          { status: 400 },
        );
      }
      const start = new Date(slot.start_time);
      const end = new Date(slot.end_time);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format in slot' },
          { status: 400 },
        );
      }
      if (end <= start) {
        return NextResponse.json(
          { error: 'end_time must be after start_time' },
          { status: 400 },
        );
      }
    }

    const supabase = await createClient();

    // Resolve broker contact_id from user
    let brokerId = user.contactId;
    if (!brokerId) {
      // Fallback: look up broker contact
      const { data: brokerContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('type', 'broker')
        .limit(1)
        .maybeSingle();
      brokerId = brokerContact?.id ?? null;
    }

    if (!brokerId) {
      return NextResponse.json(
        { error: 'No broker contact found' },
        { status: 400 },
      );
    }

    const inserts = slots.map((slot) => ({
      property_id: propertyId,
      broker_id: brokerId!,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_available: true,
    }));

    const { data: createdSlots, error: insertError } = await supabase
      .from('inspection_slots')
      .insert(inserts)
      .select();

    if (insertError) {
      console.error('[POST /api/properties/[id]/inspection-slots] Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ slots: createdSlots }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/properties/[id]/inspection-slots] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id: propertyId } = await context.params;
    if (!propertyId) {
      return NextResponse.json({ error: 'Missing property id' }, { status: 400 });
    }

    // Use service client for public access (bypasses RLS)
    const supabase = getServiceClient();

    const now = new Date().toISOString();

    const { data: slots, error } = await supabase
      .from('inspection_slots')
      .select('id, property_id, start_time, end_time, created_at')
      .eq('property_id', propertyId)
      .eq('is_available', true)
      .gte('start_time', now)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[GET /api/properties/[id]/inspection-slots] Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ slots: slots ?? [] }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/properties/[id]/inspection-slots] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
