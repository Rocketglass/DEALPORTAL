/**
 * GET /api/lois/[id]/review-data
 *
 * Public endpoint for LOI review — allows unauthenticated landlords to
 * view LOI sections via the email review link. Also supports authenticated
 * users (broker, admin, landlord, tenant) with party verification.
 *
 * Returns:
 *   - callerRole: the authenticated user's role, or 'public' for unauthenticated
 *   - meta: property name, suite, tenant, broker, sent date, contact IDs
 *   - sections: array of { id, sectionKey, label, proposedValue, landlordResponse, agreedValue, status, updatedAt, negotiations }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthForApi } from '@/lib/security/auth-guard';
import { createClient as createServiceClient } from '@/lib/supabase/service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    // 1. Try to authenticate — allow unauthenticated access for public review
    let user: { role: string; contactId: string | null; principalId: string | null } | null = null;
    try {
      user = await requireAuthForApi();
    } catch {
      // Unauthenticated — allowed for public LOI review
    }

    const { id: loiId } = await params;
    const supabase = await createServiceClient();

    // 2. Fetch the LOI with all related data (service client bypasses RLS — auth enforced above)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: loi, error } = await supabase
      .from('lois')
      .select(`
        id,
        status,
        sent_at,
        landlord_contact_id,
        tenant_contact_id,
        broker_contact_id,
        property:properties(name, address, city, state),
        unit:units(suite_number),
        tenant:contacts!lois_tenant_contact_id_fkey(company_name, first_name, last_name),
        broker:contacts!lois_broker_contact_id_fkey(company_name, first_name, last_name),
        landlord:contacts!lois_landlord_contact_id_fkey(company_name, first_name, last_name),
        sections:loi_sections(
          id,
          section_key,
          section_label,
          proposed_value,
          landlord_response,
          agreed_value,
          display_order,
          status,
          updated_at
        )
      `)
      .eq('id', loiId)
      .single();

    if (error || !loi) {
      return NextResponse.json({ error: 'LOI not found' }, { status: 404 });
    }

    // Cast to any for field access — Supabase types don't infer partial FK join shapes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loiData = loi as any;

    // 3. Authorization: authenticated users must be a party; unauthenticated allowed for sent/in_negotiation LOIs
    let role = 'public';
    if (user) {
      role = user.role;
      const effectiveContactId = user.contactId ?? user.principalId;
      const isBrokerOrAdmin = role === 'broker' || role === 'admin';
      const isLandlord = role === 'landlord' || role === 'landlord_agent';
      const isTenant = role === 'tenant' || role === 'tenant_agent';

      if (!isBrokerOrAdmin) {
        if (isLandlord) {
          if (!effectiveContactId || effectiveContactId !== loiData.landlord_contact_id) {
            return NextResponse.json({ error: 'Forbidden: not a party to this LOI' }, { status: 403 });
          }
        } else if (isTenant) {
          if (!effectiveContactId || effectiveContactId !== loiData.tenant_contact_id) {
            return NextResponse.json({ error: 'Forbidden: not a party to this LOI' }, { status: 403 });
          }
        } else {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    } else {
      // Public access — only allow for LOIs that are open for review
      if (!['sent', 'in_negotiation'].includes(loiData.status)) {
        return NextResponse.json(
          { error: `LOI is not currently open for responses (status: ${loiData.status})` },
          { status: 400 },
        );
      }
    }

    // 4. Fetch negotiation history for all sections
    const rawSections: { id: string }[] = loiData.sections ?? [];
    const sectionIds = rawSections.map((s) => s.id);

    let negotiations: {
      id: string;
      loi_section_id: string;
      action: string;
      value: string | null;
      note: string | null;
      created_by: string;
      created_at: string;
    }[] = [];

    if (sectionIds.length > 0) {
      const { data: negs } = await supabase
        .from('loi_negotiations')
        .select('id, loi_section_id, action, value, note, created_by, created_at')
        .in('loi_section_id', sectionIds)
        .order('created_at', { ascending: true });

      negotiations = (negs as typeof negotiations) ?? [];
    }

    // 5. Shape display helpers
    const property = loiData.property as { name: string; address: string; city: string; state: string } | null;
    const unit = loiData.unit as { suite_number: string } | null;
    const tenant = loiData.tenant as { company_name: string | null; first_name: string | null; last_name: string | null } | null;
    const broker = loiData.broker as { company_name: string | null; first_name: string | null; last_name: string | null } | null;

    const tenantName =
      tenant?.company_name ??
      [tenant?.first_name, tenant?.last_name].filter(Boolean).join(' ') ??
      '';

    const brokerName =
      broker?.company_name ??
      [broker?.first_name, broker?.last_name].filter(Boolean).join(' ') ??
      '';

    const brokerCompany = broker?.company_name ?? '';

    // Build a map of negotiations per section for efficient lookup
    const negsBySection = new Map<string, typeof negotiations>();
    for (const neg of negotiations) {
      const existing = negsBySection.get(neg.loi_section_id) ?? [];
      existing.push(neg);
      negsBySection.set(neg.loi_section_id, existing);
    }

    type RawSection = {
      id: string;
      section_key: string;
      section_label: string;
      proposed_value: string;
      landlord_response: string | null;
      agreed_value: string | null;
      display_order: number;
      status: string;
      updated_at: string;
    };

    const sections = ((loiData.sections as RawSection[]) ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((s) => ({
        id: s.id,
        sectionKey: s.section_key,
        label: s.section_label,
        proposedValue: s.proposed_value,
        landlordResponse: s.landlord_response,
        agreedValue: s.agreed_value,
        status: s.status,
        updatedAt: s.updated_at,
        negotiations: (negsBySection.get(s.id) ?? []).map((n) => ({
          id: n.id,
          action: n.action,
          value: n.value,
          note: n.note,
          createdBy: n.created_by,
          createdAt: n.created_at,
        })),
      }));

    return NextResponse.json({
      callerRole: role,
      meta: {
        property: property?.name ?? '',
        suite: unit?.suite_number ?? '',
        tenant: tenantName,
        broker: brokerName,
        brokerCompany,
        sentAt: loiData.sent_at ?? null,
        landlordContactId: loiData.landlord_contact_id,
        tenantContactId: loiData.tenant_contact_id,
        brokerContactId: loiData.broker_contact_id,
      },
      sections,
    });
  } catch (error) {
    console.error('[GET /api/lois/[id]/review-data] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
