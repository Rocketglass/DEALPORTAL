/**
 * GET /api/lois/[id]/review-data
 *
 * Public endpoint — no authentication required.
 * Returns the display data the landlord needs to review the LOI sections:
 *   - meta: property name, suite, tenant, broker, sent date
 *   - sections: array of { id, sectionKey, label, proposedValue }
 *
 * Only returns LOIs that are in 'sent' or 'in_negotiation' status.
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
    const { id: loiId } = await params;
    const supabase = getServiceClient();

    const { data: loi, error } = await supabase
      .from('lois')
      .select(`
        id,
        status,
        sent_at,
        property:properties(name),
        unit:units(suite_number),
        tenant:contacts!lois_tenant_contact_id_fkey(company_name, first_name, last_name),
        broker:contacts!lois_broker_contact_id_fkey(company_name, first_name, last_name),
        sections:loi_sections(
          id,
          section_key,
          section_label,
          proposed_value,
          display_order,
          status
        )
      `)
      .eq('id', loiId)
      .single();

    if (error || !loi) {
      return NextResponse.json({ error: 'LOI not found' }, { status: 404 });
    }

    if (!['sent', 'in_negotiation'].includes(loi.status)) {
      return NextResponse.json(
        { error: 'This LOI is not currently available for review.' },
        { status: 403 },
      );
    }

    // Shape display helpers
    const property = loi.property as unknown as { name: string } | null;
    const unit = loi.unit as unknown as { suite_number: string } | null;
    const tenant = loi.tenant as unknown as { company_name: string | null; first_name: string | null; last_name: string | null } | null;
    const broker = loi.broker as unknown as { company_name: string | null; first_name: string | null; last_name: string | null } | null;

    const tenantName =
      tenant?.company_name ??
      [tenant?.first_name, tenant?.last_name].filter(Boolean).join(' ') ??
      '';

    const brokerName =
      broker?.company_name ??
      [broker?.first_name, broker?.last_name].filter(Boolean).join(' ') ??
      '';

    const brokerCompany = broker?.company_name ?? '';

    type RawSection = {
      id: string;
      section_key: string;
      section_label: string;
      proposed_value: string;
      display_order: number;
      status: string;
    };

    const sections = ((loi.sections as RawSection[]) ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((s) => ({
        id: s.id,
        sectionKey: s.section_key,
        label: s.section_label,
        proposedValue: s.proposed_value,
      }));

    return NextResponse.json({
      meta: {
        property: property?.name ?? '',
        suite: unit?.suite_number ?? '',
        tenant: tenantName,
        broker: brokerName,
        brokerCompany,
        sentAt: loi.sent_at ?? null,
      },
      sections,
    });
  } catch (error) {
    console.error('[GET /api/lois/[id]/review-data] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
