/**
 * POST /api/properties/[id]/book-inspection
 *
 * Public endpoint — no auth required. Tenants book an inspection slot
 * from the public property page.
 *
 * Steps:
 *  1. Validate input
 *  2. Verify the slot is still available
 *  3. Create the booking record
 *  4. Mark the slot as unavailable
 *  5. Send notification email to broker
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sanitizeEmail, sanitizeHtml } from '@/lib/security/sanitize';
import { notifyInspectionBooked } from '@/lib/email/notifications';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Service role client — bypasses RLS for unauthenticated public submissions
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id: propertyId } = await context.params;
    if (!propertyId) {
      return NextResponse.json({ error: 'Missing property id' }, { status: 400 });
    }

    const body = await request.json();
    const {
      slot_id,
      contact_name,
      contact_email,
      contact_phone,
      company_name,
      message,
    } = body;

    // ----------------------------------------------------------------
    // Input validation
    // ----------------------------------------------------------------
    if (!slot_id) {
      return NextResponse.json({ error: 'slot_id is required' }, { status: 400 });
    }

    const cleanName = sanitizeHtml(contact_name ?? '').trim();
    if (!cleanName) {
      return NextResponse.json({ error: 'contact_name is required' }, { status: 400 });
    }

    const cleanEmail = sanitizeEmail(contact_email ?? '');
    if (!cleanEmail) {
      return NextResponse.json({ error: 'A valid contact_email is required' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // ----------------------------------------------------------------
    // 1. Verify slot exists, belongs to this property, and is available
    // ----------------------------------------------------------------
    const { data: slot, error: slotError } = await supabase
      .from('inspection_slots')
      .select('id, property_id, start_time, end_time, is_available, broker_id')
      .eq('id', slot_id)
      .eq('property_id', propertyId)
      .single();

    if (slotError || !slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    if (!slot.is_available) {
      return NextResponse.json(
        { error: 'This time slot is no longer available' },
        { status: 409 },
      );
    }

    // ----------------------------------------------------------------
    // 2. Create the booking
    // ----------------------------------------------------------------
    const { data: booking, error: bookingError } = await supabase
      .from('inspection_bookings')
      .insert({
        slot_id: slot.id,
        property_id: propertyId,
        contact_name: cleanName,
        contact_email: cleanEmail,
        contact_phone: sanitizeHtml(contact_phone ?? '').trim() || null,
        company_name: sanitizeHtml(company_name ?? '').trim() || null,
        message: sanitizeHtml(message ?? '').trim() || null,
        status: 'confirmed',
      })
      .select('id')
      .single();

    if (bookingError || !booking) {
      console.error('[book-inspection POST] booking insert error:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 },
      );
    }

    // ----------------------------------------------------------------
    // 3. Mark slot as unavailable
    // ----------------------------------------------------------------
    const { error: updateError } = await supabase
      .from('inspection_slots')
      .update({ is_available: false })
      .eq('id', slot.id);

    if (updateError) {
      console.error('[book-inspection POST] slot update error:', updateError);
      // Non-fatal — booking is created, slot update can be retried
    }

    // ----------------------------------------------------------------
    // 4. Send notification email to broker
    // ----------------------------------------------------------------
    const [{ data: brokerContact }, { data: property }] = await Promise.all([
      supabase
        .from('contacts')
        .select('email, first_name, last_name, company_name')
        .eq('id', slot.broker_id)
        .maybeSingle(),
      supabase
        .from('properties')
        .select('address, city, state')
        .eq('id', propertyId)
        .maybeSingle(),
    ]);

    const brokerEmail = brokerContact?.email ?? 'broker@rocketglass.com';
    const brokerName =
      (brokerContact?.company_name
      ?? [brokerContact?.first_name, brokerContact?.last_name].filter(Boolean).join(' '))
      || 'Broker';

    const propertyAddress = property
      ? `${property.address}, ${property.city}, ${property.state}`
      : propertyId;

    const slotStart = new Date(slot.start_time);
    const slotEnd = new Date(slot.end_time);

    const slotDate = slotStart.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const slotTime = `${slotStart.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })} – ${slotEnd.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })}`;

    void notifyInspectionBooked(
      {
        contactName: cleanName,
        contactEmail: cleanEmail,
        contactPhone: sanitizeHtml(contact_phone ?? '').trim() || undefined,
        companyName: sanitizeHtml(company_name ?? '').trim() || undefined,
        message: sanitizeHtml(message ?? '').trim() || undefined,
        propertyAddress,
        propertyId,
        slotDate,
        slotTime,
      },
      brokerEmail,
      brokerName,
    );

    return NextResponse.json(
      {
        bookingId: booking.id,
        slotDate,
        slotTime,
        propertyAddress,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[book-inspection POST] unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
