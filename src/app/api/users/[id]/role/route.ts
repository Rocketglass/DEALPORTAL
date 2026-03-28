/**
 * PATCH /api/users/[id]/role
 *
 * Update a user's role. Requires broker or admin.
 * Body: { role: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const VALID_ROLES = ['admin', 'broker', 'landlord', 'landlord_agent', 'tenant', 'tenant_agent'];

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }

  const { id } = await context.params;

  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { role } = body;
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `role must be one of: ${VALID_ROLES.join(', ')}` },
      { status: 400 },
    );
  }

  try {
    const supabase = getServiceClient();

    // Clear principal_id if changing away from an agent role
    const isAgentRole = role === 'landlord_agent' || role === 'tenant_agent';
    const update: Record<string, unknown> = {
      role,
      updated_at: new Date().toISOString(),
    };
    if (!isAgentRole) {
      update.principal_id = null;
    }

    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', id)
      .select('id, email, role')
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`[PATCH /api/users/${id}/role] Role updated to ${role}`);
    return NextResponse.json({ user: data });
  } catch (err) {
    console.error(`[PATCH /api/users/${id}/role] Error:`, err);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}
