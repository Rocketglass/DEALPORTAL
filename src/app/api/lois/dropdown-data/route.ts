/**
 * GET /api/lois/dropdown-data
 *
 * Returns the data needed to populate the LOI creation form dropdowns:
 *   - properties (with nested units)
 *   - contacts (all types: tenant, landlord, broker, prospect)
 *
 * Requires an authenticated user.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

export async function GET(): Promise<NextResponse> {
  try {
    // Only brokers/admins should access property and contact lists for LOI creation
    try {
      await requireBrokerOrAdminForApi();
    } catch (authError) {
      return NextResponse.json(
        { error: (authError as Error).message },
        { status: 401 },
      );
    }

    const supabase = await createClient();

    const [propertiesResult, contactsResult] = await Promise.all([
      supabase
        .from('properties')
        .select('*, units(*)')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('contacts')
        .select('*')
        .in('type', ['tenant', 'landlord', 'broker', 'prospect'])
        .order('company_name', { nullsFirst: false }),
    ]);

    if (propertiesResult.error) {
      console.error('[GET /api/lois/dropdown-data] Properties error:', propertiesResult.error);
      return NextResponse.json(
        { error: propertiesResult.error.message },
        { status: 500 },
      );
    }

    if (contactsResult.error) {
      console.error('[GET /api/lois/dropdown-data] Contacts error:', contactsResult.error);
      return NextResponse.json(
        { error: contactsResult.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      properties: propertiesResult.data ?? [],
      contacts: contactsResult.data ?? [],
    });
  } catch (error) {
    console.error('[GET /api/lois/dropdown-data] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
