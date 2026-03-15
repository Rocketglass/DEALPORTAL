/**
 * POST /api/units
 *
 * Creates a new unit for a property.
 * Requires an authenticated broker or admin.
 *
 * Body: { property_id, suite_number, sf, unit_type?, monthly_rent?, rent_per_sqft? }
 *
 * Returns: { unit: Unit }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

const VALID_TYPES = ['office', 'warehouse', 'retail', 'flex', 'industrial'] as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireBrokerOrAdminForApi();
    const supabase = await createClient();
    const body = await request.json();

    const { property_id, suite_number, sf, unit_type, monthly_rent, rent_per_sqft } = body;

    if (!property_id || typeof property_id !== 'string') {
      return NextResponse.json({ error: 'property_id is required' }, { status: 400 });
    }

    if (!suite_number || typeof suite_number !== 'string' || !suite_number.trim()) {
      return NextResponse.json({ error: 'suite_number is required' }, { status: 400 });
    }

    const sfNum = Number(sf);
    if (isNaN(sfNum) || sfNum <= 0) {
      return NextResponse.json({ error: 'sf must be a positive number' }, { status: 400 });
    }

    if (unit_type && !VALID_TYPES.includes(unit_type)) {
      return NextResponse.json(
        { error: `unit_type must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    // Verify property exists
    const { data: prop, error: propError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', property_id)
      .single();

    if (propError || !prop) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const { data: unit, error: insertError } = await supabase
      .from('units')
      .insert({
        property_id,
        suite_number: suite_number.trim(),
        sf: sfNum,
        unit_type: unit_type || null,
        status: 'vacant',
        monthly_rent: monthly_rent != null ? Number(monthly_rent) : null,
        rent_per_sqft: rent_per_sqft != null ? Number(rent_per_sqft) : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[POST /api/units] Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Audit log (non-fatal)
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'unit_created',
      entity_type: 'unit',
      entity_id: unit.id,
      new_value: { property_id, suite_number, sf: sfNum } as Record<string, unknown>,
    });

    return NextResponse.json({ unit }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/units] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
