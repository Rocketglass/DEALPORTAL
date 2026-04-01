/**
 * GET /api/leases/[id]/negotiate
 *
 * Authenticated endpoint — requires an active session.
 * Accessible to broker, admin, landlord, landlord_agent, tenant, tenant_agent.
 * Non-parties (landlord/tenant that don't match the lease contacts) receive 403.
 *
 * Returns the lease data all parties need to view and negotiate lease sections:
 *   - callerRole: the authenticated user's role (so the UI knows which party is viewing)
 *   - landlordContactId: lease.landlord_contact_id
 *   - tenantContactId: lease.tenant_contact_id
 *   - brokerContactId: lease.broker_contact_id
 *   - meta: property, suite, tenant, landlord, broker info
 *   - sections: array of lease sections with current status
 *   - timeline: negotiation history entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthForApi } from '@/lib/security/auth-guard';
import { createClient as createServiceClient } from '@/lib/supabase/service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    // 1. Authenticate the request — throws if no session
    let user;
    try {
      user = await requireAuthForApi();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leaseId } = await params;
    const supabase = await createServiceClient();

    // 2. Fetch lease with related data and sections (service client bypasses RLS — auth enforced above)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        base_monthly_rent,
        cam_percentage,
        security_deposit,
        parking_spaces,
        agreed_use,
        lease_term_months,
        landlord_contact_id,
        tenant_contact_id,
        broker_contact_id,
        created_at,
        property:properties(name, address, city, state),
        unit:units!leases_unit_id_fkey(suite_number),
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

    // Cast to any for field access — Supabase types don't infer partial FK join shapes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leaseData = lease as any;

    // 3. Authorization: verify the caller is a party to this lease
    const { role, contactId, principalId } = user;
    const effectiveContactId = contactId ?? principalId;

    const isBrokerOrAdmin = role === 'broker' || role === 'admin';
    const isLandlord = role === 'landlord' || role === 'landlord_agent';
    const isTenant = role === 'tenant' || role === 'tenant_agent';

    if (!isBrokerOrAdmin) {
      if (isLandlord) {
        if (!effectiveContactId || effectiveContactId !== leaseData.landlord_contact_id) {
          return NextResponse.json({ error: 'Forbidden: not a party to this lease' }, { status: 403 });
        }
      } else if (isTenant) {
        if (!effectiveContactId || effectiveContactId !== leaseData.tenant_contact_id) {
          return NextResponse.json({ error: 'Forbidden: not a party to this lease' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // 4. Shape display helpers
    const property = leaseData.property as { name: string; address: string; city: string; state: string } | null;
    const unit = leaseData.unit as { suite_number: string } | null;
    const tenant = leaseData.tenant as { company_name: string | null; first_name: string | null; last_name: string | null } | null;
    const landlord = leaseData.landlord as { company_name: string | null; first_name: string | null; last_name: string | null } | null;
    const broker = leaseData.broker as { company_name: string | null; first_name: string | null; last_name: string | null } | null;

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

    // 5. Sort sections by display_order
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

    const sections = ((leaseData.sections as RawSection[]) ?? [])
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

    // 6. Fetch negotiation timeline for all sections of this lease
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: negotiations } = await (supabase as any)
        .from('lease_negotiations')
        .select('id, lease_section_id, action, value, note, created_by, party_role, created_at')
        .in('lease_section_id', sectionIds)
        .order('created_at', { ascending: true });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      timeline = ((negotiations as any[]) ?? []).map((n: any) => ({
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
      callerRole: role,
      landlordContactId: leaseData.landlord_contact_id,
      tenantContactId: leaseData.tenant_contact_id,
      brokerContactId: leaseData.broker_contact_id,
      meta: {
        leaseId: leaseData.id,
        negotiationStatus: leaseData.negotiation_status,
        property: property?.name ?? '',
        propertyAddress: property
          ? `${property.address}, ${property.city}, ${property.state}`
          : leaseData.premises_address,
        suite: unit?.suite_number ?? '',
        premisesSf: leaseData.premises_sf,
        tenant: tenantName,
        landlord: landlordName,
        broker: brokerName,
        lessorName: leaseData.lessor_name,
        lesseeName: leaseData.lessee_name,
        commencementDate: leaseData.commencement_date,
        expirationDate: leaseData.expiration_date,
        baseMonthlyRent: leaseData.base_monthly_rent,
        camPercentage: leaseData.cam_percentage,
        securityDeposit: leaseData.security_deposit,
        parkingSpaces: leaseData.parking_spaces,
        agreedUse: leaseData.agreed_use,
        leaseTermMonths: leaseData.lease_term_months,
        createdAt: leaseData.created_at,
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
