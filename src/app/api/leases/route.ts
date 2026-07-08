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
    // Note: property_id and unit_id are NOT required — external-address LOIs
    // produce leases without a system property/unit reference.
    const requiredFields: string[] = [
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

    const { escalations } = body;

    // Field allowlist — only these columns may be set at creation. Spreading the
    // raw body into the insert let a caller set id, timestamps, DocuSign/signing
    // state, or negotiation_status directly (mass assignment). Everything not
    // listed here is dropped.
    const ALLOWED_LEASE_FIELDS = [
      'property_id', 'unit_id', 'tenant_contact_id', 'landlord_contact_id',
      'broker_contact_id', 'guarantor_contact_id', 'loi_id', 'form_type',
      'form_version', 'reference_date', 'lessor_name', 'lessor_entity_type',
      'lessee_name', 'lessee_entity_type', 'premises_address', 'premises_city',
      'premises_county', 'premises_state', 'premises_zip', 'premises_sf',
      'premises_description', 'parking_spaces', 'parking_type', 'term_years',
      'term_months', 'commencement_date', 'expiration_date',
      'early_possession_terms', 'base_rent_monthly', 'base_rent_payable_day',
      'base_rent_commencement', 'cam_percent', 'cam_description',
      'exec_base_rent_amount', 'exec_base_rent_period', 'exec_cam_amount',
      'exec_cam_period', 'exec_security_deposit', 'exec_other_amount',
      'exec_other_description', 'total_due_upon_execution', 'agreed_use',
      'insuring_party', 'broker_representation_type', 'lessors_broker_name',
      'lessors_broker_company', 'lessees_broker_name', 'lessees_broker_company',
      'broker_payment_terms', 'guarantor_names', 'addendum_paragraph_start',
      'addendum_paragraph_end', 'has_site_plan_premises', 'has_site_plan_project',
      'has_rules_and_regulations', 'other_attachments', 'security_deposit',
    ] as const;

    const leaseData: Record<string, unknown> = {};
    for (const field of ALLOWED_LEASE_FIELDS) {
      if (field in bodyAsRecord && bodyAsRecord[field] !== undefined) {
        leaseData[field] = bodyAsRecord[field];
      }
    }

    // status is server-controlled at creation: a new lease is only ever a draft
    // or under review. Never let the client set it to executed/sent/etc.
    leaseData.status = bodyAsRecord.status === 'review' ? 'review' : 'draft';

    // Prevent duplicate active leases for the same unit (only when unit_id is present)
    if (leaseData.unit_id) {
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

    // Update unit status to 'pending' (only for system units)
    if (leaseData.unit_id) {
      await supabase
        .from('units')
        .update({ status: 'pending' })
        .eq('id', leaseData.unit_id);
    }

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
    const message = 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
