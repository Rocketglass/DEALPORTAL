/**
 * PATCH /api/leases/[id]
 *
 * Updates an existing lease record.
 * Requires an authenticated broker or admin.
 *
 * Body: any subset of lease fields. Only provided fields are overwritten.
 *
 * Returns: { lease: Lease }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { updateLease } from '@/lib/queries/leases';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = await requireBrokerOrAdminForApi();

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing lease id' }, { status: 400 });
    }

    const body = await request.json();

    // Allowlist of fields that can be updated
    const ALLOWED_FIELDS = [
      'status', 'lessor_name', 'lessee_name', 'premises_address',
      'premises_city', 'premises_state', 'premises_sf',
      'commencement_date', 'expiration_date', 'base_rent_monthly',
      'term_months', 'term_years', 'rent_escalation_percent',
      'security_deposit', 'cam_description', 'parking_type',
      'insuring_party', 'form_type', 'notes',
      'tenant_contact_id', 'landlord_contact_id', 'broker_contact_id',
      'property_id', 'unit_id', 'loi_id',
    ] as const;

    const updateFields: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) updateFields[key] = body[key];
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: lease, error: updateError } = await updateLease(id, updateFields);

    if (updateError || !lease) {
      console.error(`[PATCH /api/leases/${id}] Update error:`, updateError);
      return NextResponse.json({ error: updateError || 'Failed to update lease' }, { status: 500 });
    }

    // Audit log (non-fatal) — use dynamic import to avoid issues when Supabase isn't configured
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'lease_updated',
        entity_type: 'lease',
        entity_id: id,
        new_value: updateFields as Record<string, unknown>,
      });
    } catch {
      // Audit log failure is non-fatal
    }

    return NextResponse.json({ lease }, { status: 200 });
  } catch (error) {
    console.error('[PATCH /api/leases/[id]] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
