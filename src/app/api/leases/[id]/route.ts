/**
 * PATCH /api/leases/[id]
 *
 * Updates an existing lease record.
 * Requires an authenticated broker or admin.
 *
 * Body: any subset of lease fields. Only provided fields are overwritten.
 *
 * Returns: { lease: Lease }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { updateLease } from '@/lib/queries/leases';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = await requireBrokerOrAdminForApi();

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing lease id' }, { status: 400 });
    }

    const body = await request.json();

    // Strip out fields that must never be overwritten via this endpoint
    const {
      id: _id,
      created_at: _createdAt,
      updated_at: _updatedAt,
      docusign_envelope_id: _envelopeId,
      docusign_status: _docusignStatus,
      ...updateFields
    } = body;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: lease, error: updateError } = await updateLease(id, updateFields);

    if (updateError || !lease) {
      console.error(`[PATCH /api/leases/${id}] Update error:`, updateError);
      return NextResponse.json({ error: updateError || 'Failed to update lease' }, { status: 500 });
    }

    // Audit log (non-fatal) — use dynamic import to avoid issues when Supabase isn't configured
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'lease_updated',
        entity_type: 'lease',
        entity_id: id,
        new_value: updateFields as Record<string, unknown>,
      });
    } catch {
      // Audit log failure is non-fatal
    }

    return NextResponse.json({ lease }, { status: 200 });
  } catch (error) {
    console.error('[PATCH /api/leases/[id]] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
