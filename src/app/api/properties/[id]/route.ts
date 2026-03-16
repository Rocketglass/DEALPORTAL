/**
 * PATCH /api/properties/[id]
 *
 * Updates an existing property record.
 * Requires an authenticated broker or admin.
 *
 * Body: any subset of property fields. Only provided fields are overwritten.
 *
 * Returns: { property: Property }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = await requireBrokerOrAdminForApi();

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing property id' }, { status: 400 });
    }

    const supabase = await createClient();
    const body = await request.json();

    // Allowlist of fields that can be updated
    const ALLOWED_FIELDS = [
      'name', 'address', 'city', 'state', 'zip', 'property_type',
      'total_sf', 'lot_size_sf', 'year_built', 'parking_spaces',
      'zoning', 'description', 'photos', 'status',
    ] as const;

    const updateFields: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) updateFields[key] = body[key];
    }

    // Validate ZIP if provided
    if (updateFields.zip !== undefined) {
      const zip = String(updateFields.zip).trim();
      if (!/^\d{5}(-\d{4})?$/.test(zip)) {
        return NextResponse.json(
          { error: 'Enter a valid ZIP code (e.g. 92020)' },
          { status: 400 }
        );
      }
    }

    // Validate state if provided
    if (updateFields.state !== undefined && String(updateFields.state).trim().length !== 2) {
      return NextResponse.json(
        { error: 'State must be a 2-character abbreviation' },
        { status: 400 }
      );
    }

    const { data: property, error: updateError } = await supabase
      .from('properties')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error(`[PATCH /api/properties/${id}] Update error:`, updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Audit log (non-fatal)
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'property_updated',
      entity_type: 'property',
      entity_id: id,
      new_value: updateFields as Record<string, unknown>,
    });

    return NextResponse.json({ property }, { status: 200 });
  } catch (error) {
    console.error('[PATCH /api/properties/[id]] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
