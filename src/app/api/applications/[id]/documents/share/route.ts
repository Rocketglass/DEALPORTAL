/**
 * POST /api/applications/[id]/documents/share
 *
 * Broker/admin endpoint to share or unshare application documents with landlord.
 * Controls which financial documents (tax returns, bank statements, etc.) the
 * landlord and their agent can view for this application.
 *
 * Body: { documentIds: string[], shared: boolean }
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireBrokerOrAdminForApi();
    const { id: applicationId } = await params;
    const { documentIds, shared } = await request.json();

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: 'documentIds array is required' }, { status: 400 });
    }

    if (typeof shared !== 'boolean') {
      return NextResponse.json({ error: 'shared must be a boolean' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Verify the application exists
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .single();

    if (appError || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Get the broker's contact ID for audit
    const { data: userRow } = await supabase
      .from('users')
      .select('contact_id')
      .eq('email', user.email)
      .single();

    // Update sharing status for the specified documents
    const updateData: Record<string, unknown> = {
      shared_with_landlord: shared,
    };

    if (shared) {
      updateData.shared_at = new Date().toISOString();
      updateData.shared_by = userRow?.contact_id || null;
    } else {
      updateData.shared_at = null;
      updateData.shared_by = null;
    }

    const { data: updated, error: updateError } = await supabase
      .from('application_documents')
      .update(updateData)
      .eq('application_id', applicationId)
      .in('id', documentIds)
      .select('id, shared_with_landlord');

    if (updateError) {
      console.error('[documents/share] update error:', updateError);
      return NextResponse.json({ error: 'Failed to update sharing status' }, { status: 500 });
    }

    // Audit log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: shared ? 'documents_shared_with_landlord' : 'documents_unshared_from_landlord',
      entity_type: 'application',
      entity_id: applicationId,
      new_value: { documentIds, shared },
    });

    return NextResponse.json({
      updated: updated?.length ?? 0,
      shared,
    });
  } catch (error) {
    console.error('[documents/share] unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
