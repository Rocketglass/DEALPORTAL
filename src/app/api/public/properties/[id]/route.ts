/**
 * GET /api/public/properties/[id]
 *
 * Public endpoint — returns basic property info (name, address) for display
 * in public-facing pages like the tenant application form.
 */

import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing property id' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('properties')
      .select('id, name, address, city, state')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
