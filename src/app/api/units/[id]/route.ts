/**
 * PATCH /api/units/[id]
 *
 * Updates an existing unit record (status, rent, suite number, etc.).
 * Requires an authenticated broker or admin.
 *
 * Body: any subset of unit fields. Only provided fields are overwritten.
 *
 * Returns: { unit: Unit }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES = ['vacant', 'occupied', 'pending', 'maintenance'] as const;

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = await requireBrokerOrAdminForApi();

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing unit id' }, { status: 400 });
    }

    const supabase = await createClient();
    const body = await request.json();

    // Strip immutable fields
    const {
      id: _id,
      property_id: _propertyId,
      created_at: _createdAt,
      updated_at: _updatedAt,
      current_lease_id: _leaseId,
      ...updateFields
    } = body;

    // Validate status if provided
    if (updateFields.status !== undefined) {
      if (!VALID_STATUSES.includes(updateFields.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate sf if provided
    if (updateFields.sf !== undefined) {
      const sf = Number(updateFields.sf);
      if (isNaN(sf) || sf <= 0) {
        return NextResponse.json({ error: 'SF must be a positive number' }, { status: 400 });
      }
    }

    const { data: unit, error: updateError } = await supabase
      .from('units')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error(`[PATCH /api/units/${id}] Update error:`, updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Audit log (non-fatal)
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'unit_updated',
      entity_type: 'unit',
      entity_id: id,
      new_value: updateFields as Record<string, unknown>,
    });

    return NextResponse.json({ unit }, { status: 200 });
  } catch (error) {
    console.error('[PATCH /api/units/[id]] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
