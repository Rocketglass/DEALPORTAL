/**
 * DELETE /api/deals/[dealType]/[id]/collaborators/[collaboratorId]
 *
 * Revoke a lawyer's access by setting revoked_at. Requires broker/admin.
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

interface RouteContext {
  params: Promise<{ dealType: string; id: string; collaboratorId: string }>;
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();
  } catch (authError) {
    return NextResponse.json(
      { error: (authError as Error).message },
      { status: 401 },
    );
  }

  const { collaboratorId } = await context.params;

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('deal_collaborators')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', collaboratorId)
    .is('revoked_at', null)
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Collaborator not found or already revoked' },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}
