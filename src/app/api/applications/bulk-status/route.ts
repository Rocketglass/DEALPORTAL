/**
 * PATCH /api/applications/bulk-status
 *
 * Bulk update application statuses.
 * Body: { ids: string[], status: 'under_review' | 'approved' | 'rejected' }
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
];

export async function PATCH(request: NextRequest): Promise<NextResponse> {
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

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ids, status } = body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: 'ids must be a non-empty array' },
      { status: 400 },
    );
  }

  if (!status || !ALLOWED_STATUSES.includes(status as ApplicationStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  try {
    const supabase = getServiceClient();

    const { data: updatedRows, error: updateError } = await supabase
      .from('applications')
      .update({
        status: status as ApplicationStatus,
        updated_at: now,
        reviewed_at: now,
        reviewed_by: currentUser.contactId ?? currentUser.id,
      })
      .in('id', ids as string[])
      .select('id');

    const updated = updatedRows?.length ?? 0;
    const errors = (ids as string[]).length - updated;

    if (updateError) {
      console.error(
        `[PATCH /api/applications/bulk-status] Update error:`,
        updateError.message,
      );
    }

    console.log(
      `[PATCH /api/applications/bulk-status] ${updated} updated, ${errors} errors → ${status}` +
        ` by ${currentUser.email}`,
    );

    return NextResponse.json({ updated, errors });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to bulk update application statuses';
    console.error('[PATCH /api/applications/bulk-status] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
