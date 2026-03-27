/**
 * GET /api/leases/[id]/negotiate
 *
 * Public endpoint — no authentication required.
 * Returns the lease data needed for the negotiation review page:
 *   - meta: property, suite, tenant, landlord, broker info
 *   - sections: array of lease sections with current status
 *   - timeline: negotiation history entries
 *
 * Only returns leases whose negotiation_status is 'in_negotiation' or 'agreed'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: leaseId } = await params;
    const supabase = getServiceClient();

    // Fetch lease with related data and sections
    const { data: lease, error } = await supabase
      .from('leases')
      .select(`
        id,
        status,
        negotiation_status,
        loi_id,
        premises_address,
        premises_city,
        premises_state,
        premises_sf,
        lessor_name,
        lessee_name,
        commencement_date,
        expiration_date,
        created_at,
        property:properties(name, address, city, state),
        unit:units(suite_number),
        tenant:contacts!leases_tenant_contact_id_fkey(company_name, first_name, last_name),
        landlord:contacts!leases_landlord_contact_id_fkey(company_name, first_name, last_name),
        broker:contacts!leases_broker_contact_id_fkey(company_name, first_name, last_name),
        sections:lease_sections(
          id,
          section_key,
          section_label,
          proposed_value,
          counterparty_response,
          agreed_value,
          display_order,
          status,
          updated_at
        )
      `)
      .eq('id', leaseId)
      .single();

    if (error || !lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
    }

    // Only allow access when lease is in negotiation or agreed
    const negotiationStatus = (lease as Record<string, unknown>).negotiation_status as string;
    if (!['in_negotiation', 'agreed'].includes(negotiationStatus)) {
      return NextResponse.json(
        { error: 'This lease is not currently available for negotiation review.' },
        { status: 403 },
      );
    }

    // Shape display helpers
    const property = lease.property as unknown as { name: string; address: string; city: string; state: string } | null;
    const unit = lease.unit as unknown as { suite_number: string } | null;
    const tenant = lease.tenant as unknown as { company_name: string | null; first_name: string | null; last_name: string | null } | null;
    const landlord = lease.landlord as unknown as { company_name: string | null; first_name: string | null; last_name: string | null } | null;
    const broker = lease.broker as unknown as { company_name: string | null; first_name: string | null; last_name: string | null } | null;

    const tenantName =
      tenant?.company_name ??
      [tenant?.first_name, tenant?.last_name].filter(Boolean).join(' ') ??
      '';

    const landlordName =
      landlord?.company_name ??
      [landlord?.first_name, landlord?.last_name].filter(Boolean).join(' ') ??
      '';

    const brokerName =
      broker?.company_name ??
      [broker?.first_name, broker?.last_name].filter(Boolean).join(' ') ??
      '';

    // Sort sections by display_order
    type RawSection = {
      id: string;
      section_key: string;
      section_label: string;
      proposed_value: string;
      counterparty_response: string | null;
      agreed_value: string | null;
      display_order: number;
      status: string;
      updated_at: string;
    };

    const sections = ((lease.sections as RawSection[]) ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((s) => ({
        id: s.id,
        sectionKey: s.section_key,
        label: s.section_label,
        proposedValue: s.proposed_value,
        counterpartyResponse: s.counterparty_response,
        agreedValue: s.agreed_value,
        status: s.status,
        updatedAt: s.updated_at,
      }));

    // Fetch negotiation timeline for all sections of this lease
    const sectionIds = sections.map((s) => s.id);
    let timeline: Array<{
      id: string;
      sectionId: string;
      action: string;
      value: string | null;
      note: string | null;
      createdBy: string;
      partyRole: string;
      createdAt: string;
    }> = [];

    if (sectionIds.length > 0) {
      const { data: negotiations } = await supabase
        .from('lease_negotiations')
        .select('id, lease_section_id, action, value, note, created_by, party_role, created_at')
        .in('lease_section_id', sectionIds)
        .order('created_at', { ascending: true });

      timeline = (negotiations ?? []).map((n) => ({
        id: n.id,
        sectionId: n.lease_section_id,
        action: n.action,
        value: n.value,
        note: n.note,
        createdBy: n.created_by,
        partyRole: n.party_role,
        createdAt: n.created_at,
      }));
    }

    return NextResponse.json({
      meta: {
        leaseId: lease.id,
        negotiationStatus,
        property: property?.name ?? '',
        propertyAddress: property
          ? `${property.address}, ${property.city}, ${property.state}`
          : lease.premises_address,
        suite: unit?.suite_number ?? '',
        premisesSf: lease.premises_sf,
        tenant: tenantName,
        landlord: landlordName,
        broker: brokerName,
        lessorName: lease.lessor_name,
        lesseeName: lease.lessee_name,
        commencementDate: lease.commencement_date,
        expirationDate: lease.expiration_date,
        createdAt: lease.created_at,
      },
      sections,
      timeline,
    });
  } catch (error) {
    console.error('[GET /api/leases/[id]/negotiate] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
