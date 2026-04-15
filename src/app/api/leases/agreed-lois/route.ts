/**
 * GET /api/leases/agreed-lois
 *
 * Returns all LOIs with status='agreed', with their full relations
 * (property, unit, tenant, landlord, broker, sections).
 *
 * Used by the lease creation form to populate the "Create from LOI" dropdown.
 * Requires an authenticated user.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import type { LoiWithRelations } from '@/types/database';

export async function GET(): Promise<NextResponse> {
  try {
    // Only brokers/admins should access agreed LOIs for lease creation
    try {
      await requireBrokerOrAdminForApi();
    } catch (authError) {
      return NextResponse.json(
        { error: (authError as Error).message },
        { status: 401 },
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('lois')
      .select(`
        *,
        property:properties(*),
        unit:units(*),
        tenant:contacts!lois_tenant_contact_id_fkey(*),
        landlord:contacts!lois_landlord_contact_id_fkey(*),
        broker:contacts!lois_broker_contact_id_fkey(*),
        sections:loi_sections(*)
      `)
      .eq('status', 'agreed')
      .order('agreed_at', { ascending: false });

    if (error) {
      console.error('[GET /api/leases/agreed-lois] Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lois: (data as LoiWithRelations[]) ?? [] });
  } catch (error) {
    console.error('[GET /api/leases/agreed-lois] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
