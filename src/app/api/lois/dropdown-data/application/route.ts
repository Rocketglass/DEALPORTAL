/**
 * GET /api/lois/dropdown-data/application?id=APPLICATION_ID
 *
 * Returns the application data needed to pre-fill the LOI creation form
 * when navigating from an approved application's "Draft LOI" button.
 *
 * Requires an authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Verify authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const applicationId = request.nextUrl.searchParams.get('id');
    if (!applicationId) {
      return NextResponse.json(
        { error: 'Missing application id' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('applications')
      .select('id, property_id, unit_id, contact_id, business_name, agreed_use, desired_term_months, desired_rent_budget, guarantor_name, requested_sf')
      .eq('id', applicationId)
      .single();

    if (error) {
      console.error(
        '[GET /api/lois/dropdown-data/application] Error:',
        error,
      );
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(
      '[GET /api/lois/dropdown-data/application] Unexpected error:',
      error,
    );
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
