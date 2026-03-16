/**
 * POST /api/leases
 *
 * Creates a new lease record with its rent escalation schedule.
 * Also updates the linked unit status to 'pending'.
 * Requires an authenticated user.
 *
 * Body mirrors the Lease Insert type plus an optional `escalations` array.
 * Returns: { id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import type { Database } from '@/types/database';

type LeaseInsert = Database['public']['Tables']['leases']['Insert'];
type RentEscalationInsert = Database['public']['Tables']['rent_escalations']['Insert'];

interface CreateLeaseBody extends Omit<LeaseInsert, 'id' | 'created_at' | 'updated_at'> {
  escalations?: Omit<RentEscalationInsert, 'id' | 'lease_id'>[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Require broker or admin role
    let user;
    try {
      user = await requireBrokerOrAdminForApi();
    } catch (authError) {
      return NextResponse.json(
        { error: (authError as Error).message },
        { status: 401 },
      );
    }

    const supabase = await createClient();

    const body: CreateLeaseBody = await request.json();

    // Required field validation
    const requiredFields: string[] = [
      'property_id',
      'unit_id',
      'tenant_contact_id',
      'landlord_contact_id',
      'broker_contact_id',
      'lessor_name',
      'lessee_name',
      'premises_address',
      'premises_city',
      'premises_state',
      'premises_sf',
      'commencement_date',
      'expiration_date',
      'base_rent_monthly',
      'form_type',
      'parking_type',
      'cam_description',
      'insuring_party',
    ];

    const bodyAsRecord = body as unknown as Record<string, unknown>;
    for (const field of requiredFields) {
      const val = bodyAsRecord[field];
      if (val === undefined || val === null || val === '') {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 },
        );
      }
    }

    const { escalations, ...leaseData } = body;

    // Prevent duplicate active leases for the same unit
    const { data: existingLease } = await supabase
      .from('leases')
      .select('id, status')
      .eq('unit_id', leaseData.unit_id)
      .in('status', ['draft', 'review', 'sent_for_signature', 'partially_signed', 'executed'])
      .limit(1)
      .maybeSingle();

    if (existingLease) {
      return NextResponse.json(
        { error: `Unit already has an active lease (${existingLease.status}). Cancel or expire the existing lease first.` },
        { status: 409 },
      );
    }

    // Insert the lease row
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .insert(leaseData)
      .select()
      .single();

    if (leaseError) {
      console.error('[POST /api/leases] Lease insert error:', leaseError);
      return NextResponse.json({ error: leaseError.message }, { status: 500 });
    }

    // Insert rent escalations (if any)
    if (escalations && escalations.length > 0) {
      const escalationsWithLeaseId = escalations.map((e) => ({
        ...e,
        lease_id: lease.id,
      }));

      const { error: escalationsError } = await supabase
        .from('rent_escalations')
        .insert(escalationsWithLeaseId);

      if (escalationsError) {
        console.error('[POST /api/leases] Escalations insert error:', escalationsError);
        // Roll back the lease row
        await supabase.from('leases').delete().eq('id', lease.id);
        return NextResponse.json({ error: escalationsError.message }, { status: 500 });
      }
    }

    // Update unit status to 'pending'
    await supabase
      .from('units')
      .update({ status: 'pending' })
      .eq('id', leaseData.unit_id);

    // Audit log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'lease_created',
      entity_type: 'lease',
      entity_id: lease.id,
      new_value: {
        status: leaseData.status,
        unit_id: leaseData.unit_id,
        loi_id: leaseData.loi_id ?? null,
      },
    });

    return NextResponse.json({ id: lease.id }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/leases] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
