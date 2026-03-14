/**
 * POST /api/properties
 *
 * Creates a new property record.
 * Requires an authenticated broker or admin.
 *
 * Body: property fields matching the PropertyInsert type (id, created_at,
 * updated_at are generated server-side and must be omitted).
 *
 * Returns: { id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Auth check — throws if not authenticated or wrong role
    const user = await requireBrokerOrAdminForApi();

    const supabase = await createClient();
    const body = await request.json();

    // Required field validation
    const requiredFields = ['name', 'address', 'city', 'state', 'zip'];
    for (const field of requiredFields) {
      const val = body[field];
      if (val === undefined || val === null || String(val).trim() === '') {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // ZIP format check
    const zip = String(body.zip).trim();
    if (!/^\d{5}(-\d{4})?$/.test(zip)) {
      return NextResponse.json(
        { error: 'Enter a valid ZIP code (e.g. 92020)' },
        { status: 400 }
      );
    }

    // State length check
    if (body.state && String(body.state).trim().length !== 2) {
      return NextResponse.json(
        { error: 'State must be a 2-character abbreviation' },
        { status: 400 }
      );
    }

    // Build the insert payload — convert empty strings to null for optional fields
    function toNullableNumber(v: unknown): number | null {
      if (v === '' || v === null || v === undefined) return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    }

    function toNullableString(v: unknown): string | null {
      if (v === '' || v === null || v === undefined) return null;
      return String(v).trim();
    }

    const insertPayload = {
      name: String(body.name).trim(),
      address: String(body.address).trim(),
      city: String(body.city).trim(),
      state: String(body.state).trim().toUpperCase(),
      zip: zip,
      county: toNullableString(body.county),
      property_type: toNullableString(body.property_type) ?? 'commercial',
      total_sf: toNullableNumber(body.total_sf),
      land_area_sf: toNullableNumber(body.land_area_sf),
      year_built: toNullableNumber(body.year_built),
      zoning: toNullableString(body.zoning),
      parcel_number: toNullableString(body.parcel_number),
      parking_spaces: toNullableNumber(body.parking_spaces),
      parking_ratio: toNullableNumber(body.parking_ratio),
      power: toNullableString(body.power),
      clear_height_ft: toNullableNumber(body.clear_height_ft),
      dock_high_doors: toNullableNumber(body.dock_high_doors) ?? 0,
      grade_level_doors: toNullableNumber(body.grade_level_doors) ?? 0,
      levelers: toNullableNumber(body.levelers) ?? 0,
      crane_capacity_tons: toNullableNumber(body.crane_capacity_tons),
      description: toNullableString(body.description),
      is_active: true,
      features: [],
      photos: [],
    };

    const { data: property, error: insertError } = await supabase
      .from('properties')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error('[POST /api/properties] Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Audit log (non-fatal)
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'property_created',
      entity_type: 'property',
      entity_id: property.id,
      new_value: { name: insertPayload.name, address: insertPayload.address },
    });

    return NextResponse.json({ id: property.id }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/properties] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
