/**
 * GET /api/inspections
 *
 * Broker endpoint — returns all upcoming inspection bookings across
 * all properties. Includes the linked slot and property details.
 *
 * Requires authenticated broker or admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();

    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data: bookings, error } = await supabase
      .from('inspection_bookings')
      .select(`
        id,
        contact_name,
        contact_email,
        contact_phone,
        company_name,
        message,
        status,
        created_at,
        property_id,
        slot_id,
        inspection_slots (
          id,
          start_time,
          end_time,
          property_id
        ),
        properties (
          id,
          name,
          address,
          city,
          state
        )
      `)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/inspections] Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookings: bookings ?? [] }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/inspections] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
