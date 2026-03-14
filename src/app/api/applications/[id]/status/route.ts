/**
 * PATCH /api/applications/[id]/status
 *
 * Update the status (and optionally review_notes) of an application.
 * Accepted status values: under_review | approved | rejected | info_requested
 *
 * Also accepts:
 *   review_notes?: string   — broker notes saved alongside the status change
 *
 * Requires authenticated broker or admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import type { ApplicationStatus } from '@/types/database';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

const ALLOWED_STATUSES: ApplicationStatus[] = [
  'under_review',
  'approved',
  'rejected',
  'info_requested',
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  // Auth check
  let currentUser;
  try {
    currentUser = await requireBrokerOrAdminForApi();
  } catch (authError) {
    return NextResponse.json(
      { error: (authError as Error).message },
      { status: 401 },
    );
  }

  const { id } = await params;

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { status, review_notes } = body;

  if (!status || !ALLOWED_STATUSES.includes(status as ApplicationStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  type ApplicationUpdate = {
    status: ApplicationStatus;
    updated_at: string;
    reviewed_at: string;
    reviewed_by: string;
    review_notes?: string;
  };

  const update: ApplicationUpdate = {
    status: status as ApplicationStatus,
    updated_at: now,
    reviewed_at: now,
    reviewed_by: currentUser.id,
  };

  if (typeof review_notes === 'string') {
    update.review_notes = review_notes;
  }

  try {
    const supabase = getServiceClient();

    const { data: existing, error: findError } = await supabase
      .from('applications')
      .select('id, business_name, status')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('applications')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? 'Update returned no data');
    }

    console.log(
      `[PATCH /api/applications/${id}/status] ${existing.business_name} → ${status}` +
        ` by ${currentUser.email}`,
    );

    return NextResponse.json({ application: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update application status';
    console.error(`[PATCH /api/applications/${id}/status] Error:`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
