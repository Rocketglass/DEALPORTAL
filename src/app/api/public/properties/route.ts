/**
 * GET /api/public/properties
 *
 * Public endpoint — no auth required. Returns all active properties
 * for the multi-select on the general application form.
 *
 * Rocket Realty has <50 properties, so no pagination is needed.
 */

import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('properties')
      .select('id, name, address, city, state, property_type, total_sf')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('[GET /api/public/properties] query error:', error);
      return NextResponse.json({ error: 'Failed to load properties' }, { status: 500 });
    }

    return NextResponse.json({ properties: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
