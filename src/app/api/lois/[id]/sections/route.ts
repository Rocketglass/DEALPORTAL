/**
 * POST /api/lois/[id]/sections
 *
 * Add a section to an existing LOI. Requires broker or admin role.
 * Body: { section_key, section_label, proposed_value, display_order? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

const VALID_SECTION_KEYS = [
  'base_rent',
  'term',
  'tenant_improvements',
  'cam',
  'security_deposit',
  'agreed_use',
  'parking',
  'options',
  'escalations',
  'free_rent',
  'other',
] as const;

const SECTION_LABELS: Record<string, string> = {
  base_rent: 'Base Rent',
  term: 'Lease Term',
  tenant_improvements: 'Tenant Improvements',
  cam: 'CAM / Operating Expenses',
  security_deposit: 'Security Deposit',
  agreed_use: 'Agreed Use',
  parking: 'Parking',
  options: 'Renewal / Expansion Options',
  escalations: 'Rent Escalations',
  free_rent: 'Free Rent / Abatement',
  other: 'Other',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();
  } catch (authError) {
    return NextResponse.json(
      { error: (authError as Error).message },
      { status: 401 },
    );
  }

  const { id: loiId } = await params;

  try {
    const body = await request.json();
    const { section_key, section_label, proposed_value, display_order } = body;

    if (!section_key || !proposed_value) {
      return NextResponse.json(
        { error: 'section_key and proposed_value are required' },
        { status: 400 },
      );
    }

    if (!VALID_SECTION_KEYS.includes(section_key)) {
      return NextResponse.json(
        { error: `Invalid section_key. Must be one of: ${VALID_SECTION_KEYS.join(', ')}` },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Verify the LOI exists
    const { data: loi, error: loiError } = await supabase
      .from('lois')
      .select('id')
      .eq('id', loiId)
      .single();

    if (loiError || !loi) {
      return NextResponse.json({ error: 'LOI not found' }, { status: 404 });
    }

    // Determine display_order if not provided — place at the end
    let order = display_order;
    if (order == null) {
      const { data: existingSections } = await supabase
        .from('loi_sections')
        .select('display_order')
        .eq('loi_id', loiId)
        .order('display_order', { ascending: false })
        .limit(1);

      order = existingSections && existingSections.length > 0
        ? existingSections[0].display_order + 1
        : 0;
    }

    const label = section_label || SECTION_LABELS[section_key] || section_key;

    const { data: section, error: insertError } = await supabase
      .from('loi_sections')
      .insert({
        loi_id: loiId,
        section_key,
        section_label: label,
        proposed_value,
        display_order: order,
        status: 'proposed',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[POST /api/lois/[id]/sections] Insert error:', insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[POST /api/lois/[id]/sections] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
